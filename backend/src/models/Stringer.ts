import mongoose, { Schema, Document } from "mongoose";

export type StringerSkill = "2_knots" | "4_knots" | "pro_pattern";

export interface IStringer extends Document {
  user?: mongoose.Types.ObjectId;
  name: string;
  phone?: string;
  level: number; // 1-5 (1=Beginner, 5=Master)
  skills: StringerSkill[];
  currentLoad: number;
  maxLoad: number;
  rating: number;
  totalRatings: number;
  totalTasksCompleted: number;
  totalDifficultTasks: number;
  consecutiveDifficultWithoutComplaint: number;
  avgCompletionTime: number; // in minutes
  commissionRate: number; // percentage
  isActive: boolean;
  levelUpSuggested: boolean;
}

const StringerSchema = new Schema<IStringer>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User" },
    name: { type: String, required: true },
    phone: { type: String },
    level: { type: Number, min: 1, max: 5, default: 1 },
    skills: [
      {
        type: String,
        enum: ["2_knots", "4_knots", "pro_pattern"],
      },
    ],
    currentLoad: { type: Number, default: 0 },
    maxLoad: { type: Number, default: 3 },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    totalRatings: { type: Number, default: 0 },
    totalTasksCompleted: { type: Number, default: 0 },
    totalDifficultTasks: { type: Number, default: 0 },
    consecutiveDifficultWithoutComplaint: { type: Number, default: 0 },
    avgCompletionTime: { type: Number, default: 0 },
    commissionRate: { type: Number, default: 10 }, // 10% base
    isActive: { type: Boolean, default: true },
    levelUpSuggested: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Stringer = mongoose.model<IStringer>("Stringer", StringerSchema);
