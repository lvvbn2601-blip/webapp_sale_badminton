import mongoose, { Schema, Document } from "mongoose";

export interface IOrderItem extends Document {
  order: mongoose.Types.ObjectId;
  product: mongoose.Types.ObjectId;
  quantity: number;
  price: number;
  // Variant / customization metadata
  selectedColor?: string;
  selectedGrip?: string;
  selectedSize?: string;
  selectedBagType?: string;
  selectedMaterial?: string;
  selectedSpeed?: number;
  accessoryType?: string;
  // Stringing service details
  needsStringing?: boolean;
  stringType?: string;
  stringTension?: number;
}

const OrderItemSchema = new Schema<IOrderItem>(
  {
    order: { type: Schema.Types.ObjectId, ref: "Order", required: true },
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true },
    // Variant metadata
    selectedColor: { type: String },
    selectedGrip: { type: String },
    selectedSize: { type: String },
    selectedBagType: { type: String },
    selectedMaterial: { type: String },
    selectedSpeed: { type: Number },
    accessoryType: { type: String },
    // Stringing service
    needsStringing: { type: Boolean, default: false },
    stringType: { type: String },
    stringTension: { type: Number },
  },
  { timestamps: true }
);

export const OrderItem = mongoose.model<IOrderItem>("OrderItem", OrderItemSchema);
