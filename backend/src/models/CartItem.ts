import mongoose, { Schema, Document } from "mongoose";

export interface ICartItem extends Document {
  cart: mongoose.Types.ObjectId;
  product: mongoose.Types.ObjectId;
  productVariant?: mongoose.Types.ObjectId;
  quantity: number;
  price: number;
}

const CartItemSchema = new Schema<ICartItem>(
  {
    cart: { type: Schema.Types.ObjectId, ref: "Cart", required: true },
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    productVariant: { type: Schema.Types.ObjectId, ref: "ProductVariant" },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true },
  },
  { timestamps: true }
);

// Ensure one product per cart (no duplicates)
CartItemSchema.index({ cart: 1, product: 1 }, { unique: true });

export const CartItem = mongoose.model<ICartItem>("CartItem", CartItemSchema);
