import { Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { AuthRequest } from "../middlewares/auth";
import { ok } from "../utils/apiResponse";
import { ApiError } from "../utils/apiError";
import * as StringerService from "../services/stringerService";

// ═══════════════════════════════════════════════════════════
// ── Stringer CRUD
// ═══════════════════════════════════════════════════════════

export const createStringer = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { name, phone, level, skills, maxLoad, commissionRate } = req.body;
  if (!name) throw new ApiError(400, "Stringer name is required");

  const stringer = await StringerService.createStringer({
    name,
    phone,
    level: level || 1,
    skills: skills || ["2_knots"],
    maxLoad: maxLoad || 3,
    commissionRate: commissionRate || 10,
  });
  res.status(201).json(ok(stringer));
});

export const listStringers = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const stringers = await StringerService.listStringers();
  res.json(ok(stringers));
});

export const getStringer = asyncHandler(async (req: AuthRequest, res: Response) => {
  const stringer = await StringerService.getStringer(req.params.id as string);
  res.json(ok(stringer));
});

export const updateStringer = asyncHandler(async (req: AuthRequest, res: Response) => {
  const stringer = await StringerService.updateStringer(req.params.id as string, req.body);
  res.json(ok(stringer));
});

export const deleteStringer = asyncHandler(async (req: AuthRequest, res: Response) => {
  await StringerService.deleteStringer(req.params.id as string);
  res.json(ok({ message: "Stringer deleted" }));
});

export const getStringerStats = asyncHandler(async (req: AuthRequest, res: Response) => {
  const stats = await StringerService.getStringerStats(req.params.id as string);
  res.json(ok(stats));
});

// ═══════════════════════════════════════════════════════════
// ── Stringing Tasks
// ═══════════════════════════════════════════════════════════

export const createTask = asyncHandler(async (req: AuthRequest, res: Response) => {
  const {
    orderId,
    customerName,
    customerPhone,
    racketModel,
    stringType,
    stringPattern,
    tension,
    isUrgent,
    fee,
    pickupTime,
  } = req.body;

  if (!customerName || !racketModel || !stringType || !tension) {
    throw new ApiError(400, "Missing required fields: customerName, racketModel, stringType, tension");
  }

  const task = await StringerService.createTask({
    orderId,
    customerName,
    customerPhone,
    racketModel,
    stringType,
    stringPattern: stringPattern || "2_knots",
    tension: Number(tension),
    isUrgent: isUrgent || false,
    fee: Number(fee) || 0,
    pickupTime,
    autoAssign: true,
  });

  res.status(201).json(ok(task));
});

export const listTasks = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { status, stringer } = req.query;
  const tasks = await StringerService.listTasks({
    status: status as string | undefined,
    stringer: stringer as string | undefined,
  });
  res.json(ok(tasks));
});

export const startTask = asyncHandler(async (req: AuthRequest, res: Response) => {
  const task = await StringerService.startTask(req.params.id as string);
  res.json(ok(task));
});

export const assignTask = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { stringerId } = req.body;
  if (!stringerId) throw new ApiError(400, "stringerId is required");
  const task = await StringerService.assignTask(req.params.id as string, stringerId);
  res.json(ok(task));
});

export const completeTask = asyncHandler(async (req: AuthRequest, res: Response) => {
  const task = await StringerService.completeTask(req.params.id as string);
  res.json(ok(task));
});

export const rateTask = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { rating, note } = req.body;
  if (!rating || rating < 1 || rating > 5) {
    throw new ApiError(400, "Rating must be between 1 and 5");
  }
  const task = await StringerService.rateTask(req.params.id as string, Number(rating), note);
  res.json(ok(task));
});

export const autoAssignPending = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const results = await StringerService.autoAssignPendingTasks();
  res.json(ok(results));
});

// ═══════════════════════════════════════════════════════════
// ── Performance & Level Up
// ═══════════════════════════════════════════════════════════

export const getPerformanceOverview = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const overview = await StringerService.getPerformanceOverview();
  res.json(ok(overview));
});

export const approveLevelUp = asyncHandler(async (req: AuthRequest, res: Response) => {
  const stringer = await StringerService.approveLevelUp(req.params.id as string);
  res.json(ok(stringer));
});

// ═══════════════════════════════════════════════════════════
// ── Customer-facing
// ═══════════════════════════════════════════════════════════

export const bookStringingService = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user?.sub;
  const {
    racketSource, racketModel, racketCondition, racketImage,
    stringType, stringPattern, tension,
    serviceType, isUrgent, fee, customerName, customerPhone,
  } = req.body;

  if (!racketModel || !stringType || !tension) {
    throw new ApiError(400, "Missing required fields: racketModel, stringType, tension");
  }

  const task = await StringerService.createTask({
    orderId: undefined,
    customerName: customerName || "Customer",
    customerPhone: customerPhone || "",
    racketModel,
    stringType,
    stringPattern: stringPattern || "2_knots",
    tension: Number(tension),
    isUrgent: isUrgent || serviceType === "express",
    fee: Number(fee) || 0,
    pickupTime: serviceType === "express" ? "immediate" : "leave_at_shop",
    userId: userId,
    racketSource,
    racketCondition,
    racketImage,
  });

  res.status(201).json(ok(task));
});

export const getMyTasks = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user?.sub;
  if (!userId) throw new ApiError(401, "Not authenticated");

  const { StringingTask } = await import("../models/StringingTask");
  const tasks = await StringingTask.find({ userId })
    .populate("stringer", "name level rating")
    .sort({ createdAt: -1 })
    .lean();

  res.json(ok(tasks));
});
