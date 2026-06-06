import mongoose, { Schema, Document } from "mongoose";

export interface IStringSpool extends Document {
  name: string;
  brand: string;
  color: string;
  currentMeters: number;
  totalMeters: number;
  alertThreshold: number;
  price: number;
  power: number;
  sound: number;
  control: number;
  desc: string;
  addedBy?: mongoose.Types.ObjectId; // User who added it
}

const StringSpoolSchema = new Schema<IStringSpool>(
  {
    name: { type: String, required: true, unique: true },
    brand: { type: String, required: true },
    color: { type: String, required: true },
    currentMeters: { type: Number, required: true, default: 0 },
    totalMeters: { type: Number, required: true },
    alertThreshold: { type: Number, default: 50 },
    price: { type: Number, required: true },
    power: { type: Number, default: 50 },
    sound: { type: Number, default: 50 },
    control: { type: Number, default: 50 },
    desc: { type: String, default: "" },
    addedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export const StringSpool = mongoose.model<IStringSpool>("StringSpool", StringSpoolSchema);
