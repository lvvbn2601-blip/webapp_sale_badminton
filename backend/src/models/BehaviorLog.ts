import mongoose, { Document, Schema } from 'mongoose';

export interface IBehaviorLog extends Document {
  userId?: mongoose.Types.ObjectId;
  sessionId: string;
  action: 'view' | 'click' | 'add_to_cart' | 'checkout' | 'scroll' | 'hover' | 'filter_use' | 'dwell';
  entityId?: mongoose.Types.ObjectId; // E.g., Product ID
  entityType?: 'product' | 'category' | 'brand';
  metadata: {
    duration?: number; // Time spent in ms
    scrollDepth?: number;
    scrollSpeed?: number; // pixels per second — fast = window shopper
    price?: number;
    brand?: string;
    category?: string;
    productUrl?: string;
    pageSection?: string; // e.g. "specs_area", "description", "images", "price"
    filterUsed?: string; // e.g. "brand:Yonex", "price:<1000000"
    productSpecs?: Record<string, string>; // specs of viewed product for content-based filtering
  };
  timestamp: Date;
}

const behaviorLogSchema = new Schema<IBehaviorLog>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: false },
  sessionId: { type: String, required: true },
  action: { 
    type: String, 
    enum: ['view', 'click', 'add_to_cart', 'checkout', 'scroll', 'hover', 'filter_use', 'dwell'], 
    required: true 
  },
  entityId: { type: Schema.Types.ObjectId, required: false },
  entityType: { type: String, enum: ['product', 'category', 'brand'], required: false },
  metadata: {
    duration: { type: Number },
    scrollDepth: { type: Number },
    scrollSpeed: { type: Number },
    price: { type: Number },
    brand: { type: String },
    category: { type: String },
    productUrl: { type: String },
    pageSection: { type: String },
    filterUsed: { type: String },
    productSpecs: { type: Schema.Types.Mixed },
  },
  timestamp: { type: Date, default: Date.now },
});

export const BehaviorLog = mongoose.model<IBehaviorLog>('BehaviorLog', behaviorLogSchema);
