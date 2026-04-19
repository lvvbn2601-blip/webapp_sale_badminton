import mongoose, { Schema, Document } from "mongoose";

export interface IPayment extends Document {
  order: mongoose.Types.ObjectId;
  amount: number;
  status: "pending" | "success" | "failed";
  provider: "vnpay" | "momo" | "cod" | "bank_transfer" | "other";
  transactionId?: string;
  raw?: unknown;
}

const PaymentSchema = new Schema<IPayment>(
  {
    order: { type: Schema.Types.ObjectId, ref: "Order", required: true },
    amount: { type: Number, required: true },
    status: { type: String, enum: ["pending", "success", "failed"], default: "pending" },
    provider: { type: String, enum: ["vnpay", "momo", "cod", "bank_transfer", "other"], default: "other" },
    transactionId: String,
    raw: Schema.Types.Mixed,
  },
  { timestamps: true }
);

export const Payment = mongoose.model<IPayment>("Payment", PaymentSchema);
