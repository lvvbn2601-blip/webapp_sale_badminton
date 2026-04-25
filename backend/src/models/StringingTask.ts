import mongoose, { Schema, Document } from "mongoose";

export type TaskDifficulty = "easy" | "medium" | "hard";
export type TaskStatus = "pending" | "assigned" | "in_progress" | "completed";
export type StringPattern = "2_knots" | "4_knots" | "pro_pattern";

export interface IStringingTask extends Document {
  order?: mongoose.Types.ObjectId;
  stringer?: mongoose.Types.ObjectId;
  customerName: string;
  customerPhone?: string;
  racketModel: string;
  stringType: string;
  stringPattern: StringPattern;
  tension: number; // in lbs
  difficulty: TaskDifficulty;
  isUrgent: boolean;
  status: TaskStatus;
  fee: number;
  commission: number;
  startedAt?: Date;
  completedAt?: Date;
  assignedAt?: Date;
  customerRating?: number;
  customerNote?: string;
  assignmentScore?: number; // Score from the assignment engine
  pickupTime?: string; // "immediate" | "leave_at_shop" | custom time
  userId?: string; // Customer who booked (for self-service)
  racketSource?: string; // "new_from_cart" | "bring_to_shop"
  racketCondition?: string; // e.g. "slight crack at 2 o'clock"
  racketImage?: string; // uploaded photo URL
}

const StringingTaskSchema = new Schema<IStringingTask>(
  {
    order: { type: Schema.Types.ObjectId, ref: "Order" },
    stringer: { type: Schema.Types.ObjectId, ref: "Stringer" },
    customerName: { type: String, required: true },
    customerPhone: { type: String },
    racketModel: { type: String, required: true },
    stringType: { type: String, required: true },
    stringPattern: {
      type: String,
      enum: ["2_knots", "4_knots", "pro_pattern"],
      default: "2_knots",
    },
    tension: { type: Number, required: true },
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      default: "easy",
    },
    isUrgent: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ["pending", "assigned", "in_progress", "completed"],
      default: "pending",
    },
    fee: { type: Number, default: 0 },
    commission: { type: Number, default: 0 },
    startedAt: { type: Date },
    completedAt: { type: Date },
    assignedAt: { type: Date },
    customerRating: { type: Number, min: 1, max: 5 },
    customerNote: { type: String },
    assignmentScore: { type: Number },
    pickupTime: { type: String, default: "leave_at_shop" },
    userId: { type: String },
    racketSource: { type: String, enum: ["new_from_cart", "bring_to_shop"], default: "bring_to_shop" },
    racketCondition: { type: String },
    racketImage: { type: String },
  },
  { timestamps: true }
);

export const StringingTask = mongoose.model<IStringingTask>("StringingTask", StringingTaskSchema);
