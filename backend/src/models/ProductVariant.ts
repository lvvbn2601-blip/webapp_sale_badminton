import mongoose, { Schema, Document } from "mongoose";

export interface IProductVariant extends Document {
  product: mongoose.Types.ObjectId;
  sku: string;
  size?: string;
  color?: string;
  stock: number;
  price: number;
}

const ProductVariantSchema = new Schema<IProductVariant>(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    sku: { type: String, required: true, unique: true },
    size: String,
    color: String,
    stock: { type: Number, default: 0 },
    price: { type: Number, required: true },
  },
  { timestamps: true }
);

export const ProductVariant = mongoose.model<IProductVariant>("ProductVariant", ProductVariantSchema);
