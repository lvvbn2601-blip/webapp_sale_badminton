import mongoose, { Schema, Document } from "mongoose";

export interface ICartItem extends Document {
  cart: mongoose.Types.ObjectId;
  product: mongoose.Types.ObjectId;
  productVariant?: mongoose.Types.ObjectId;
  quantity: number;
  price: number;
  variantOptions?: any;
}

const CartItemSchema = new Schema<ICartItem>(
  {
    cart: { type: Schema.Types.ObjectId, ref: "Cart", required: true },
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    productVariant: { type: Schema.Types.ObjectId, ref: "ProductVariant" },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true },
    variantOptions: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

// Removed unique index to allow multiple variants of the same product
export const CartItem = mongoose.model<ICartItem>("CartItem", CartItemSchema);
