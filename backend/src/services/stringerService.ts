import { Stringer, IStringer, StringerSkill } from "../models/Stringer";
import {
  StringingTask,
  IStringingTask,
  TaskDifficulty,
  StringPattern,
} from "../models/StringingTask";
import { ApiError } from "../utils/apiError";

// ═══════════════════════════════════════════════════════════
// ── Difficulty Classification Engine
// ═══════════════════════════════════════════════════════════

export function classifyDifficulty(
  pattern: StringPattern,
  tension: number,
  isUrgent: boolean
): TaskDifficulty {
  // Hard: pro_pattern, tension > 28 lbs, or urgent orders
  if (pattern === "pro_pattern" || tension > 28 || isUrgent) return "hard";
  // Medium: 4_knots or tension 25-28
  if (pattern === "4_knots" || tension >= 25) return "medium";
  // Easy: 2_knots with low tension
  return "easy";
}

// ═══════════════════════════════════════════════════════════
// ── Commission Calculator
// ═══════════════════════════════════════════════════════════

function calculateCommission(
  fee: number,
  baseRate: number,
  difficulty: TaskDifficulty,
  isUrgent: boolean
): number {
  let rate = baseRate;
  if (difficulty === "hard") rate += 20; // +20% for difficult
  if (isUrgent) rate += 30; // +30% for urgent
  return Math.round((fee * rate) / 100);
}

// ═══════════════════════════════════════════════════════════
// ── AI Assignment Scoring Engine (The Heart)
// ═══════════════════════════════════════════════════════════
// Score = (SkillMatch × 30) + (LevelFit × 25) + (LoadScore × 25) + (RatingBonus × 10) + (UrgencyBonus × 10)

interface ScoredStringer {
  stringer: IStringer;
  score: number;
  breakdown: {
    skillMatch: number;
    levelFit: number;
    loadScore: number;
    ratingBonus: number;
    urgencyBonus: number;
  };
}

function scoreStringer(
  stringer: IStringer,
  requiredSkill: StringerSkill,
  difficulty: TaskDifficulty,
  isUrgent: boolean,
  allStringers: IStringer[]
): ScoredStringer | null {
  // ── Step 1: Skill Filter (binary) ──
  if (!stringer.skills.includes(requiredSkill)) return null;

  // ── Step 2: Availability Check ──
  if (!stringer.isActive || stringer.currentLoad >= stringer.maxLoad) return null;

  // ── Step 3: Skill Match Score (30 points) ──
  // More skills = more versatile = slightly higher score
  const skillMatch = 30;

  // ── Step 4: Level Fit Score (25 points) ──
  let levelFit = 0;
  if (difficulty === "hard") {
    // Hard tasks → prefer Level 4-5
    if (stringer.level >= 4) levelFit = 25;
    else if (stringer.level === 3) levelFit = 15;
    else levelFit = 5; // Level 1-2 can still do it but low priority
  } else if (difficulty === "medium") {
    // Medium tasks → prefer Level 2-4
    if (stringer.level >= 2 && stringer.level <= 4) levelFit = 25;
    else if (stringer.level === 5) levelFit = 10; // Reserve masters for hard tasks
    else levelFit = 15;
  } else {
    // Easy tasks → prefer Level 1-2 (reserve skilled workers)
    if (stringer.level <= 2) levelFit = 25;
    else if (stringer.level === 3) levelFit = 15;
    else levelFit = 5; // Don't waste Level 4-5 on easy tasks
  }

  // ── Step 5: Load Score (25 points) ──
  // Lower load = higher score
  const maxLoadAcross = Math.max(...allStringers.map((s) => s.maxLoad), 1);
  const loadRatio = 1 - stringer.currentLoad / maxLoadAcross;
  const loadScore = Math.round(loadRatio * 25);

  // ── Step 6: Rating Bonus (10 points) ──
  const ratingBonus = stringer.rating > 0 ? Math.round((stringer.rating / 5) * 10) : 5;

  // ── Step 7: Urgency Bonus (10 points) ──
  let urgencyBonus = 5; // neutral
  if (isUrgent) {
    // When urgent, heavily favor lowest load
    urgencyBonus = stringer.currentLoad === 0 ? 10 : Math.max(0, 10 - stringer.currentLoad * 3);
  }

  const totalScore = skillMatch + levelFit + loadScore + ratingBonus + urgencyBonus;

  return {
    stringer,
    score: totalScore,
    breakdown: { skillMatch, levelFit, loadScore, ratingBonus, urgencyBonus },
  };
}

export async function findBestStringer(
  requiredSkill: StringerSkill,
  difficulty: TaskDifficulty,
  isUrgent: boolean
): Promise<ScoredStringer | null> {
  const allStringers = await Stringer.find({ isActive: true });
  if (allStringers.length === 0) return null;

  const scored = allStringers
    .map((s) => scoreStringer(s, requiredSkill, difficulty, isUrgent, allStringers))
    .filter((s): s is ScoredStringer => s !== null)
    .sort((a, b) => b.score - a.score);

  return scored[0] || null;
}

// ═══════════════════════════════════════════════════════════
// ── CRUD: Stringers
// ═══════════════════════════════════════════════════════════

export async function createStringer(data: Partial<IStringer>) {
  const stringer = await Stringer.create(data);
  return stringer;
}

export async function listStringers() {
  return Stringer.find().sort({ level: -1, rating: -1 });
}

export async function getStringer(id: string) {
  const stringer = await Stringer.findById(id);
  if (!stringer) throw new ApiError(404, "Stringer not found");
  return stringer;
}

export async function updateStringer(id: string, data: Partial<IStringer>) {
  const stringer = await Stringer.findByIdAndUpdate(id, data, { new: true });
  if (!stringer) throw new ApiError(404, "Stringer not found");
  return stringer;
}

export async function deleteStringer(id: string) {
  // Check if stringer has active tasks
  const activeTasks = await StringingTask.countDocuments({
    stringer: id,
    status: { $in: ["assigned", "in_progress"] },
  });
  if (activeTasks > 0) {
    throw new ApiError(400, "Cannot delete stringer with active tasks. Reassign or complete them first.");
  }
  const stringer = await Stringer.findByIdAndDelete(id);
  if (!stringer) throw new ApiError(404, "Stringer not found");
  return stringer;
}

export async function getStringerStats(id: string) {
  const stringer = await Stringer.findById(id);
  if (!stringer) throw new ApiError(404, "Stringer not found");

  const tasks = await StringingTask.find({ stringer: id });
  const completedTasks = tasks.filter((t) => t.status === "completed");
  const avgTime =
    completedTasks.length > 0
      ? completedTasks.reduce((sum, t) => {
          if (t.startedAt && t.completedAt) {
            return sum + (t.completedAt.getTime() - t.startedAt.getTime()) / 60000;
          }
          return sum;
        }, 0) / completedTasks.length
      : 0;

  const difficultyBreakdown = {
    easy: completedTasks.filter((t) => t.difficulty === "easy").length,
    medium: completedTasks.filter((t) => t.difficulty === "medium").length,
    hard: completedTasks.filter((t) => t.difficulty === "hard").length,
  };

  const ratingsBreakdown = [1, 2, 3, 4, 5].map((r) => ({
    stars: r,
    count: completedTasks.filter((t) => t.customerRating === r).length,
  }));

  const totalCommission = completedTasks.reduce((sum, t) => sum + (t.commission || 0), 0);

  return {
    stringer,
    totalCompleted: completedTasks.length,
    avgCompletionTime: Math.round(avgTime),
    difficultyBreakdown,
    ratingsBreakdown,
    totalCommission,
    activeTasks: tasks.filter((t) => ["assigned", "in_progress"].includes(t.status)).length,
  };
}

// ═══════════════════════════════════════════════════════════
// ── CRUD: Stringing Tasks
// ═══════════════════════════════════════════════════════════

export async function createTask(data: {
  orderId?: string;
  customerName: string;
  customerPhone?: string;
  racketModel: string;
  stringType: string;
  stringPattern: StringPattern;
  tension: number;
  isUrgent: boolean;
  fee: number;
  pickupTime?: string;
  userId?: string;
  racketSource?: string;
  racketCondition?: string;
  racketImage?: string;
  autoAssign?: boolean;
}) {
  const difficulty = classifyDifficulty(data.stringPattern, data.tension, data.isUrgent);

  // Create the task
  const task = await StringingTask.create({
    order: data.orderId || undefined,
    customerName: data.customerName,
    customerPhone: data.customerPhone,
    racketModel: data.racketModel,
    stringType: data.stringType,
    stringPattern: data.stringPattern,
    tension: data.tension,
    difficulty,
    isUrgent: data.isUrgent,
    fee: data.fee,
    pickupTime: data.pickupTime || "leave_at_shop",
    status: "pending",
    userId: data.userId,
    racketSource: data.racketSource,
    racketCondition: data.racketCondition,
    racketImage: data.racketImage,
  });

  // Auto-assign only if requested
  if (data.autoAssign) {
    const bestMatch = await findBestStringer(
      data.stringPattern as StringerSkill,
      difficulty,
      data.isUrgent
    );

    if (bestMatch) {
      const commission = calculateCommission(
        data.fee,
        bestMatch.stringer.commissionRate,
        difficulty,
        data.isUrgent
      );

      task.stringer = bestMatch.stringer._id as any;
      task.status = "assigned";
      task.assignedAt = new Date();
      task.commission = commission;
      task.assignmentScore = bestMatch.score;
      await task.save();

      // Increment stringer's currentLoad
      await Stringer.findByIdAndUpdate(bestMatch.stringer._id, {
        $inc: { currentLoad: 1 },
      });
    }
  }

  return task.populate("stringer");
}

export async function listTasks(filter?: {
  status?: string;
  stringer?: string;
}) {
  const query: any = {};
  if (filter?.status) query.status = filter.status;
  if (filter?.stringer) query.stringer = filter.stringer;

  return StringingTask.find(query)
    .populate("stringer", "name level skills rating currentLoad")
    .sort({ isUrgent: -1, createdAt: -1 });
}

export async function assignTask(taskId: string, stringerId: string) {
  const task = await StringingTask.findById(taskId);
  if (!task) throw new ApiError(404, "Task not found");
  if (task.status !== "pending") {
    throw new ApiError(400, "Task must be pending to assign");
  }

  const stringer = await Stringer.findById(stringerId);
  if (!stringer) throw new ApiError(404, "Stringer not found");

  const commission = calculateCommission(
    task.fee,
    stringer.commissionRate,
    task.difficulty,
    task.isUrgent
  );

  task.stringer = stringer._id as any;
  task.status = "assigned";
  task.assignedAt = new Date();
  task.commission = commission;
  await task.save();

  await Stringer.findByIdAndUpdate(stringer._id, {
    $inc: { currentLoad: 1 },
  });

  return task.populate("stringer");
}

export async function startTask(taskId: string) {
  const task = await StringingTask.findById(taskId);
  if (!task) throw new ApiError(404, "Task not found");
  if (task.status !== "assigned") {
    throw new ApiError(400, "Task must be in 'assigned' status to start");
  }

  task.status = "in_progress";
  task.startedAt = new Date();
  await task.save();

  // Sync to Order
  if (task.order) {
    const { Order } = await import("../models/Order");
    await Order.findByIdAndUpdate(task.order, { stringingStatus: "in_progress" });
  }

  return task.populate("stringer");
}

export async function completeTask(taskId: string) {
  const task = await StringingTask.findById(taskId);
  if (!task) throw new ApiError(404, "Task not found");
  if (task.status !== "in_progress") {
    throw new ApiError(400, "Task must be in 'in_progress' status to complete");
  }

  task.status = "completed";
  task.completedAt = new Date();
  await task.save();

  // Update stringer stats
  if (task.stringer) {
    const stringer = await Stringer.findById(task.stringer);
    if (stringer) {
      // Decrease load
      stringer.currentLoad = Math.max(0, stringer.currentLoad - 1);
      stringer.totalTasksCompleted += 1;

      // Calculate new avg completion time
      if (task.startedAt && task.completedAt) {
        const taskMinutes = (task.completedAt.getTime() - task.startedAt.getTime()) / 60000;
        const totalMinutes =
          stringer.avgCompletionTime * (stringer.totalTasksCompleted - 1) + taskMinutes;
        stringer.avgCompletionTime = Math.round(totalMinutes / stringer.totalTasksCompleted);
      }

      // Track difficult tasks
      if (task.difficulty === "hard") {
        stringer.totalDifficultTasks += 1;
        stringer.consecutiveDifficultWithoutComplaint += 1;

        // Auto level-up suggestion: 100 difficult tasks without complaint
        if (
          stringer.consecutiveDifficultWithoutComplaint >= 100 &&
          stringer.level < 5 &&
          !stringer.levelUpSuggested
        ) {
          stringer.levelUpSuggested = true;
        }
      }

      await stringer.save();
    }
  }

  // Sync to Order
  if (task.order) {
    const { Order } = await import("../models/Order");
    const allTasks = await StringingTask.find({ order: task.order });
    const allCompleted = allTasks.every(t => t.status === "completed");
    
    if (allCompleted) {
      await Order.findByIdAndUpdate(task.order, { stringingStatus: "completed" });
    }
  }

  // Auto-deduct string inventory (10 meters)
  try {
    const { StringSpool } = await import("../models/StringSpool");
    const mongoose = (await import("mongoose")).default;
    
    let query;
    if (mongoose.Types.ObjectId.isValid(task.stringType)) {
      query = { $or: [{ _id: task.stringType }, { name: task.stringType }] };
    } else {
      query = { name: task.stringType };
    }
    
    const spool = await StringSpool.findOne(query);
    if (spool) {
      spool.currentMeters = Math.max(0, spool.currentMeters - 10);
      await spool.save();
    }
  } catch (err) {
    console.error("Failed to deduct string inventory:", err);
  }

  return task.populate("stringer");
}

export async function rateTask(taskId: string, rating: number, note?: string) {
  const task = await StringingTask.findById(taskId);
  if (!task) throw new ApiError(404, "Task not found");
  if (task.status !== "completed") {
    throw new ApiError(400, "Can only rate completed tasks");
  }

  task.customerRating = rating;
  if (note) task.customerNote = note;
  await task.save();

  // Update stringer's average rating
  if (task.stringer) {
    const stringer = await Stringer.findById(task.stringer);
    if (stringer) {
      const newTotal = stringer.totalRatings + 1;
      const newAvg = (stringer.rating * stringer.totalRatings + rating) / newTotal;
      stringer.rating = Math.round(newAvg * 10) / 10; // Round to 1 decimal
      stringer.totalRatings = newTotal;

      // If rating is low (1-2), reset consecutive difficult streak
      if (rating <= 2) {
        stringer.consecutiveDifficultWithoutComplaint = 0;
      }

      await stringer.save();
    }
  }

  return task;
}

export async function autoAssignPendingTasks() {
  const pendingTasks = await StringingTask.find({ status: "pending" });
  const results: { taskId: string; assigned: boolean; stringerName?: string; score?: number }[] = [];

  for (const task of pendingTasks) {
    const bestMatch = await findBestStringer(
      task.stringPattern as StringerSkill,
      task.difficulty,
      task.isUrgent
    );

    if (bestMatch) {
      const commission = calculateCommission(
        task.fee,
        bestMatch.stringer.commissionRate,
        task.difficulty,
        task.isUrgent
      );

      task.stringer = bestMatch.stringer._id as any;
      task.status = "assigned";
      task.assignedAt = new Date();
      task.commission = commission;
      task.assignmentScore = bestMatch.score;
      await task.save();

      await Stringer.findByIdAndUpdate(bestMatch.stringer._id, {
        $inc: { currentLoad: 1 },
      });

      results.push({
        taskId: String(task._id),
        assigned: true,
        stringerName: bestMatch.stringer.name,
        score: bestMatch.score,
      });
    } else {
      results.push({ taskId: String(task._id), assigned: false });
    }
  }

  return results;
}

// ── Performance Analytics ──

export async function getPerformanceOverview() {
  const stringers = await Stringer.find().lean();
  const tasks = await StringingTask.find().lean();

  const completedTasks = tasks.filter((t) => t.status === "completed");

  // Leaderboard by rating
  const leaderboard = stringers
    .filter((s) => s.totalRatings > 0)
    .sort((a, b) => b.rating - a.rating)
    .map((s) => ({
      id: s._id,
      name: s.name,
      level: s.level,
      rating: s.rating,
      totalCompleted: s.totalTasksCompleted,
      avgTime: s.avgCompletionTime,
    }));

  // Difficulty distribution
  const difficultyDist = {
    easy: completedTasks.filter((t) => t.difficulty === "easy").length,
    medium: completedTasks.filter((t) => t.difficulty === "medium").length,
    hard: completedTasks.filter((t) => t.difficulty === "hard").length,
  };

  // Level-up candidates
  const levelUpCandidates = stringers.filter((s) => s.levelUpSuggested);

  // Status distribution
  const statusDist = {
    pending: tasks.filter((t) => t.status === "pending").length,
    assigned: tasks.filter((t) => t.status === "assigned").length,
    in_progress: tasks.filter((t) => t.status === "in_progress").length,
    completed: completedTasks.length,
  };

  return {
    totalStringers: stringers.length,
    activeStringers: stringers.filter((s) => s.isActive).length,
    totalTasks: tasks.length,
    completedTasks: completedTasks.length,
    leaderboard,
    difficultyDist,
    statusDist,
    levelUpCandidates,
  };
}

export async function approveLevelUp(stringerId: string) {
  const stringer = await Stringer.findById(stringerId);
  if (!stringer) throw new ApiError(404, "Stringer not found");
  if (stringer.level >= 5) throw new ApiError(400, "Already at maximum level");

  stringer.level += 1;
  stringer.levelUpSuggested = false;
  stringer.consecutiveDifficultWithoutComplaint = 0;
  await stringer.save();

  return stringer;
}
