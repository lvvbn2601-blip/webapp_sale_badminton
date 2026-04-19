import mongoose, { Schema, Document } from "mongoose";

export interface IChatbotLog extends Document {
  user?: mongoose.Types.ObjectId;
  message: string;
  response: string;
  intent?: string;
}

const ChatbotLogSchema = new Schema<IChatbotLog>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User" },
    message: { type: String, required: true },
    response: { type: String, required: true },
    intent: String,
  },
  { timestamps: true }
);

export const ChatbotLog = mongoose.model<IChatbotLog>("ChatbotLog", ChatbotLogSchema);
