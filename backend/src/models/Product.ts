import mongoose, { Schema, Document } from "mongoose";

export interface IProduct extends Document {
  name: string;
  slug: string;
  description: string;
  image?: string;
  images?: string[];
  category: mongoose.Types.ObjectId;
  brand: mongoose.Types.ObjectId;
  basePrice: number;
  stock: number;
  status: "active" | "inactive" | "draft";
  isTrending: boolean;
  isBestSeller: boolean;
  rating: number;
  reviewCount: number;
  badges?: string[];
  specs?: Record<string, string>;
}

const ProductSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    description: { type: String, required: true },
    image: String,
    images: [{ type: String }],
    category: { type: Schema.Types.ObjectId, ref: "Category", required: true },
    brand: { type: Schema.Types.ObjectId, ref: "Brand", required: true },
    basePrice: { type: Number, required: true },
    stock: { type: Number, default: 0 },
    status: { type: String, enum: ["active", "inactive", "draft"], default: "active" },
    isTrending: { type: Boolean, default: false },
    isBestSeller: { type: Boolean, default: false },
    rating: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 },
    badges: [{ type: String }],
    specs: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

export const Product = mongoose.model<IProduct>("Product", ProductSchema);
