import mongoose, { Schema, Document } from "mongoose";

export interface ISetting extends Document {
  storeName: string;
  logoUrl: string;
  hotline: string;
  bankName: string;
  bankAccountName: string;
  bankAccountNumber: string;
  flatFee: number;
  freeThreshold: number;
}

const SettingSchema = new Schema<ISetting>(
  {
    storeName: { type: String, default: "Badminton Hub" },
    logoUrl: { type: String, default: "" },
    hotline: { type: String, default: "" },
    bankName: { type: String, default: "" },
    bankAccountName: { type: String, default: "" },
    bankAccountNumber: { type: String, default: "" },
    flatFee: { type: Number, default: 30000 },
    freeThreshold: { type: Number, default: 1000000 },
  },
  { timestamps: true }
);

export const Setting = mongoose.model<ISetting>("Setting", SettingSchema);
