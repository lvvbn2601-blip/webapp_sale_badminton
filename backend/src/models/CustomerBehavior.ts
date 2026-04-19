import mongoose, { Document, Schema } from 'mongoose';

export type BehavioralProfile = 'ghost_shopper' | 'gear_geek' | 'brand_loyalist' | 'beginner' | 'unclassified';

export interface ICustomerBehavior extends Document {
  userId?: mongoose.Types.ObjectId;
  sessionId: string;
  rfmScore: {
    recency: number;
    frequency: number;
    monetary: number;
  };
  behaviorScore: number;
  engagementScore: number; // weighted combination of dwell time, click depth, scroll behavior
  segment: 'Potential Newcomers' | 'Brand Enthusiasts' | 'Professional Customers' | 'Hesitant Customers' | 'About to leave' | 'Uncategorized';
  behavioralProfile: BehavioralProfile;
  brandAffinities: Map<string, number>; // brandName -> score
  categoryAffinities: Map<string, number>; // categoryName -> score
  priceAffinities: Map<string, number>; // priceRange ("budget"|"mid"|"premium") -> score
  holdDurations: Map<string, number>; // productId -> avg hold time (ms) in spec areas
  viewedProductIds: string[]; // Last N product IDs viewed for recommendations
  viewedCategoryCount: number; // Counter for distinct categories browsed
  filterBrandUsage: Map<string, number>; // brandName -> filter usage count
  scrollSpeedAvg: number; // Average scroll speed (px/s) — high = window shopper
  totalPageViews: number; // Total page views for ghost shopper detection
  deepClickCount: number; // Clicks into spec areas / images / reviews
  lastActive: Date;
  cartAbandonment: {
    isAbandoned: boolean;
    lastAddedAt?: Date;
    notified30Min: boolean;
    notified2Hour: boolean;
    voucherSent: boolean; // Track if COMEBACK voucher was already sent
  };
  firstTimePurchaseTriggered: boolean;
  welcomeVoucherSent: boolean; // Track if welcome voucher was already sent
  hasCompletedCheckout: boolean; // Track if user ever completed a checkout
}

const customerBehaviorSchema = new Schema<ICustomerBehavior>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: false },
  sessionId: { type: String, required: true },
  rfmScore: {
    recency: { type: Number, default: 0 },
    frequency: { type: Number, default: 0 },
    monetary: { type: Number, default: 0 },
  },
  behaviorScore: { type: Number, default: 0 },
  engagementScore: { type: Number, default: 0 },
  segment: { 
    type: String, 
    enum: ['Potential Newcomers', 'Brand Enthusiasts', 'Professional Customers', 'Hesitant Customers', 'About to leave', 'Uncategorized'],
    default: 'Uncategorized'
  },
  behavioralProfile: {
    type: String,
    enum: ['ghost_shopper', 'gear_geek', 'brand_loyalist', 'beginner', 'unclassified'],
    default: 'unclassified'
  },
  brandAffinities: {
    type: Map,
    of: Number,
    default: {}
  },
  categoryAffinities: {
    type: Map,
    of: Number,
    default: {}
  },
  priceAffinities: {
    type: Map,
    of: Number,
    default: {}
  },
  holdDurations: {
    type: Map,
    of: Number,
    default: {}
  },
  viewedProductIds: {
    type: [String],
    default: []
  },
  viewedCategoryCount: { type: Number, default: 0 },
  filterBrandUsage: {
    type: Map,
    of: Number,
    default: {}
  },
  scrollSpeedAvg: { type: Number, default: 0 },
  totalPageViews: { type: Number, default: 0 },
  deepClickCount: { type: Number, default: 0 },
  lastActive: { type: Date, default: Date.now },
  cartAbandonment: {
    isAbandoned: { type: Boolean, default: false },
    lastAddedAt: { type: Date },
    notified30Min: { type: Boolean, default: false },
    notified2Hour: { type: Boolean, default: false },
    voucherSent: { type: Boolean, default: false },
  },
  firstTimePurchaseTriggered: { type: Boolean, default: false },
  welcomeVoucherSent: { type: Boolean, default: false },
  hasCompletedCheckout: { type: Boolean, default: false },
}, { timestamps: true });

export const CustomerBehavior = mongoose.model<ICustomerBehavior>('CustomerBehavior', customerBehaviorSchema);
