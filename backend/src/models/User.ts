import mongoose, { Schema, Document } from "mongoose";
import bcrypt from "bcryptjs";

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: "user" | "admin" | "warehouse_staff" | "knitter";
  phone?: string;
  avatar?: string;
  gender?: "male" | "female" | "other" | "";
  dob?: string;
  address?: string;
  addressList?: string[];
  addresses?: mongoose.Types.ObjectId[];
  totalSpending?: number;
  status?: "active" | "locked";
  points?: number;
  membershipTier?: "Bronze" | "Silver" | "Gold" | "Diamond";
  internalNotes?: string;
  badmintonProfile?: {
    shoeSize?: string;
    stringTension?: string;
    playingStyle?: string;
    racketBrand?: string;
  };
  comparePassword(password: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["user", "admin", "warehouse_staff", "knitter"], default: "user" },
    phone: String,
    avatar: String,
    gender: { type: String, enum: ["male", "female", "other", ""] },
    dob: String,
    address: String,
    addressList: [String],
    addresses: [{ type: Schema.Types.ObjectId, ref: "Address" }],
    totalSpending: { type: Number, default: 0 },
    status: { type: String, enum: ["active", "locked"], default: "active" },
    points: { type: Number, default: 0 },
    membershipTier: { type: String, enum: ["Bronze", "Silver", "Gold", "Diamond"], default: "Bronze" },
    internalNotes: String,
    badmintonProfile: {
      shoeSize: String,
      stringTension: String,
      playingStyle: String,
      racketBrand: String,
    },
  },
  { timestamps: true }
);

// Use promise style pre-hook (Mongoose won't provide `next` for async hooks)
UserSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

UserSchema.methods.comparePassword = function (password: string) {
  return bcrypt.compare(password, this.password);
};

export const User = mongoose.model<IUser>("User", UserSchema);
