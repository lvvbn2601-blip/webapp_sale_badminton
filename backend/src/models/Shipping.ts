import mongoose, { Schema, Document } from "mongoose";

export interface IShipping extends Document {
  order: mongoose.Types.ObjectId;
  status: "pending" | "in_transit" | "delivered" | "returned";
  trackingNumber?: string;
  carrier?: string;
  estimatedDelivery?: Date;
}

const ShippingSchema = new Schema<IShipping>(
  {
    order: { type: Schema.Types.ObjectId, ref: "Order", required: true },
    status: {
      type: String,
      enum: ["pending", "in_transit", "delivered", "returned"],
      default: "pending",
    },
    trackingNumber: String,
    carrier: String,
    estimatedDelivery: Date,
  },
  { timestamps: true }
);

export const Shipping = mongoose.model<IShipping>("Shipping", ShippingSchema);
