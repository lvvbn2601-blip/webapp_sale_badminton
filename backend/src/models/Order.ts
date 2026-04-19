import mongoose, { Schema, Document } from "mongoose";

export type OrderStatus = "pending" | "paid" | "confirmed" | "delivered" | "received" | "returned" | "cancelled";

export interface IOrder extends Document {
  user: mongoose.Types.ObjectId;
  items: mongoose.Types.ObjectId[];
  subtotal: number;
  shippingFee: number;
  discountCode?: string;
  discountAmount?: number;
  total: number;
  status: OrderStatus;
  shippingAddress: string;
  recipientName?: string;
  recipientPhone?: string;
  payment?: string;
  trackingNumber?: string;
  carrier?: string;
  needsStringing?: boolean;
  stringingStatus?: "pending" | "in_progress" | "completed";
  returnReason?: string;
  returnRequestedAt?: Date;
  statusHistory: Array<{
    status: string;
    changedAt: Date;
    changedBy?: mongoose.Types.ObjectId;
    note?: string;
  }>;
}

const OrderSchema = new Schema<IOrder>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    items: [{ type: Schema.Types.ObjectId, ref: "OrderItem" }],
    subtotal: { type: Number, required: true },
    shippingFee: { type: Number, default: 0 },
    discountCode: { type: String },
    discountAmount: { type: Number, default: 0 },
    total: { type: Number, required: true },
    status: {
      type: String,
      enum: ["pending", "paid", "confirmed", "delivered", "received", "returned", "cancelled"],
      default: "pending",
    },
    shippingAddress: { type: String, required: true },
    recipientName: { type: String },
    recipientPhone: { type: String },
    payment: { type: String },
    trackingNumber: { type: String },
    carrier: { type: String },
    needsStringing: { type: Boolean, default: false },
    stringingStatus: {
      type: String,
      enum: ["pending", "in_progress", "completed"],
    },
    returnReason: { type: String },
    returnRequestedAt: { type: Date },
    statusHistory: [
      {
        status: { type: String },
        changedAt: { type: Date, default: Date.now },
        changedBy: { type: Schema.Types.ObjectId, ref: "User" },
        note: { type: String },
      },
    ],
  },
  { timestamps: true }
);

export const Order = mongoose.model<IOrder>("Order", OrderSchema);
