import mongoose, { Schema, Document } from "mongoose";

export interface ICoupon extends Document {
  code: string;
  program: string;
  discountType: "amount" | "percent" | "shipping";
  amount: number;
  maxDiscount?: number;
  minOrderValue?: number;
  startDate: Date;
  expiresAt: Date;
  status: "running" | "waiting" | "completed" | "paused";
  
  channels?: string[];
  applyTo: "store" | "category" | "product";
  applicableCategories: mongoose.Types.ObjectId[];
  applicableProducts: mongoose.Types.ObjectId[];
  excludeFlashSale: boolean;
  excludeShuttlecocks: boolean;
  
  customerTarget: string; // e.g., "all", "new"
  membershipTarget: string; // e.g., "all", "bronze", "silver", "gold", "diamond"
  
  usageLimit?: number;
  limitPerCustomer?: number;
  usageCount: number;
}

const CouponSchema = new Schema<ICoupon>(
  {
    code: { type: String, required: true, unique: true, uppercase: true },
    program: { type: String, required: true },
    discountType: { type: String, enum: ["amount", "percent", "shipping"], required: true },
    amount: { type: Number, required: true },
    maxDiscount: { type: Number },
    minOrderValue: { type: Number, default: 0 },
    startDate: { type: Date, required: true },
    expiresAt: { type: Date, required: true },
    status: { type: String, enum: ["running", "waiting", "completed", "paused"], default: "waiting" },
    
    channels: [{ type: String }],
    applyTo: { type: String, enum: ["store", "category", "product"], default: "store" },
    applicableCategories: [{ type: Schema.Types.ObjectId, ref: "Category" }],
    applicableProducts: [{ type: Schema.Types.ObjectId, ref: "Product" }],
    excludeFlashSale: { type: Boolean, default: false },
    excludeShuttlecocks: { type: Boolean, default: false },
    
    customerTarget: { type: String, default: "all" },
    membershipTarget: { type: String, default: "all" },
    
    usageLimit: { type: Number },
    limitPerCustomer: { type: Number, default: 1 },
    usageCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const Coupon = mongoose.model<ICoupon>("Coupon", CouponSchema);
