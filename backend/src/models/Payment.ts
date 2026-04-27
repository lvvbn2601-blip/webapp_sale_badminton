import mongoose, { Schema, Document } from "mongoose";

export interface IPayment extends Document {
  order: mongoose.Types.ObjectId;
  amount: number;
  status: "pending" | "success" | "failed" | "refunded";
  provider: "vnpay" | "momo" | "cod" | "bank_transfer" | "other";
  transactionId?: string;
  raw?: unknown;
  refundTransactionId?: string;
  refundedAt?: Date;
  refundAmount?: number;
}

const PaymentSchema = new Schema<IPayment>(
  {
    order: { type: Schema.Types.ObjectId, ref: "Order", required: true },
    amount: { type: Number, required: true },
    status: { type: String, enum: ["pending", "success", "failed", "refunded"], default: "pending" },
    provider: { type: String, enum: ["vnpay", "momo", "cod", "bank_transfer", "other"], default: "other" },
    transactionId: String,
    raw: Schema.Types.Mixed,
    refundTransactionId: String,
    refundedAt: Date,
    refundAmount: Number,
  },
  { timestamps: true }
);

export const Payment = mongoose.model<IPayment>("Payment", PaymentSchema);

