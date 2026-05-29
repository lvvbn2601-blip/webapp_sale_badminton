import mongoose, { Schema, Document } from "mongoose";

export interface IReview extends Document {
  product: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  rating: number;
  comment?: string;
  title?: string;
  tags?: string[];
  images?: string[];
  videos?: string[];
  helpfulCount: number;
  helpfulBy: mongoose.Types.ObjectId[];
  verified: boolean;
  status: "pending" | "approved" | "rejected";
  adminReply?: string;
  adminReplyAt?: Date;
  isFeatured: boolean;
}

const ReviewSchema = new Schema<IReview>(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: String,
    title: { type: String, trim: true },
    tags: { type: [String], default: [] },
    images: { type: [String], default: [] },
    videos: { type: [String], default: [] },
    helpfulCount: { type: Number, default: 0 },
    helpfulBy: [{ type: Schema.Types.ObjectId, ref: "User" }],
    verified: { type: Boolean, default: true },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "approved" },
    adminReply: { type: String, default: "" },
    adminReplyAt: { type: Date },
    isFeatured: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Review = mongoose.model<IReview>("Review", ReviewSchema);
