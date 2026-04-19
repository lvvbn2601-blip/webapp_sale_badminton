import mongoose, { Schema, Document } from "mongoose";

export interface IProductImage extends Document {
  product: mongoose.Types.ObjectId;
  url: string;
  alt?: string;
}

const ProductImageSchema = new Schema<IProductImage>(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    url: { type: String, required: true },
    alt: String,
  },
  { timestamps: true }
);

export const ProductImage = mongoose.model<IProductImage>("ProductImage", ProductImageSchema);
