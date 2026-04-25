import mongoose, { Schema, Document } from "mongoose";
import { toSearchKey } from "../utils/vietnameseSearch";

export interface IProduct extends Document {
  name: string;
  slug: string;
  description: string;
  image?: string;
  images?: string[];
  category: mongoose.Types.ObjectId;
  brand: mongoose.Types.ObjectId;
  purchasePrice: number;
  basePrice: number;
  stock: number;
  status: "active" | "inactive" | "draft";
  isTrending: boolean;
  isBestSeller: boolean;
  rating: number;
  reviewCount: number;
  badges?: string[];
  specs?: Record<string, string>;
  /** Normalised name for accent/space-insensitive search */
  searchName: string;
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
    purchasePrice: { type: Number, default: 0 },
    basePrice: { type: Number, required: true },
    stock: { type: Number, default: 0 },
    status: { type: String, enum: ["active", "inactive", "draft"], default: "active" },
    isTrending: { type: Boolean, default: false },
    isBestSeller: { type: Boolean, default: false },
    rating: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 },
    badges: [{ type: String }],
    specs: { type: Schema.Types.Mixed, default: {} },
    searchName: { type: String, default: "", index: true },
  },
  { timestamps: true }
);

// Auto-generate searchName before save
ProductSchema.pre("save", function () {
  if (this.isModified("name")) {
    this.searchName = toSearchKey(this.name);
  }
});

// Also handle findOneAndUpdate — regenerate searchName when name is updated
ProductSchema.pre("findOneAndUpdate", function () {
  const update = this.getUpdate() as Record<string, any>;
  if (update?.name) {
    this.set({ searchName: toSearchKey(update.name) });
  }
});

export const Product = mongoose.model<IProduct>("Product", ProductSchema);
