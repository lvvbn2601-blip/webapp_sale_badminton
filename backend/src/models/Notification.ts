import mongoose, { Schema, Document } from "mongoose";

export interface INotification extends Document {
  user: mongoose.Types.ObjectId;
  type: "new_order" | "order_confirmed" | "order_delivered" | "order_received" | "order_returned" | "return_request" | "return_approved" | "order_cancelled" | "order_status" | "system";
  title: string;
  message: string;
  orderId?: mongoose.Types.ObjectId;
  isRead: boolean;
}

const NotificationSchema = new Schema<INotification>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: {
      type: String,
      enum: ["new_order", "order_confirmed", "order_delivered", "order_received", "order_returned", "return_request", "return_approved", "order_cancelled", "order_status", "system"],
      required: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    orderId: { type: Schema.Types.ObjectId, ref: "Order" },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Notification = mongoose.model<INotification>("Notification", NotificationSchema);
