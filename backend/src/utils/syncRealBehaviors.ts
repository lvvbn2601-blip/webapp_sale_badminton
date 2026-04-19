import mongoose from 'mongoose';
import { env } from '../config/env';
import { User } from '../models/User';
import { Order } from '../models/Order';
import '../models/OrderItem';
import '../models/Product';
import { Brand } from '../models/Brand';
import { Category } from '../models/Category';
import { CustomerBehavior } from '../models/CustomerBehavior';
import { segmentationService } from '../services/segmentationService';

const BUDGET_PRICE_THRESHOLD = 40; // USD
const PREMIUM_PRICE_THRESHOLD = 120; // USD

const classifyPriceRange = (price: number): string => {
  if (price < BUDGET_PRICE_THRESHOLD) return 'budget';
  if (price > PREMIUM_PRICE_THRESHOLD) return 'premium';
  return 'mid';
};

async function syncRealBehaviors() {
  await mongoose.connect(env.mongoUri);
  console.log('Connected to DB');

  // Pre-load brand and category name maps for fast lookups
  const brands = await Brand.find({}).lean();
  const brandNameMap = new Map<string, string>();
  for (const b of brands) {
    brandNameMap.set(String(b._id), b.name);
  }

  const categories = await Category.find({}).lean();
  const categoryNameMap = new Map<string, string>();
  for (const c of categories) {
    categoryNameMap.set(String(c._id), c.name);
  }

  const users = await User.find({});
  console.log(`Analyzing ${users.length} users with REAL data...`);

  for (const user of users) {
    // 1. Fetch real orders for the user
    const orders = await Order.find({ user: user._id, status: { $in: ['paid', 'confirmed', 'delivered', 'received'] } })
      .populate({ path: 'items', populate: { path: 'product' } });

    // Calculate RFM basics
    const frequency = orders.length;
    let monetary = 0;
    let recency = 0; // Timestamp of last order

    const brandAffinityMap = new Map<string, number>();
    const categoryAffinityMap = new Map<string, number>();
    const priceAffinityMap = new Map<string, number>();

    // Analyze Order history for affinities and monetary
    for (const order of orders) {
      monetary += order.total;
      const orderDate = new Date((order as any).createdAt).getTime();
      if (orderDate > recency) {
        recency = orderDate;
      }

      // Analyze items for brand, category, and price affinities
      for (const itemObj of order.items) {
        const item = itemObj as any;
        const product = item.product;
        if (product) {
          // Boost behavior score and affinities based on real purchases (Heavy weighting)
          const weight = 10 * item.quantity;
          
          // Resolve brand name (use brandNameMap to convert ObjectId → name)
          if (product.brand) {
            const brandId = String(product.brand?._id || product.brand);
            const brandName = brandNameMap.get(brandId) || (product.brand?.name) || brandId;
            const currentBrand = brandAffinityMap.get(brandName) || 0;
            brandAffinityMap.set(brandName, currentBrand + weight);
          }

          // Resolve category name
          if (product.category) {
            const categoryId = String(product.category?._id || product.category);
            const categoryName = categoryNameMap.get(categoryId) || (product.category?.name) || categoryId;
            const currentCat = categoryAffinityMap.get(categoryName) || 0;
            categoryAffinityMap.set(categoryName, currentCat + weight);
          }

          // Track price range affinity
          const price = product.basePrice || product.price || 0;
          if (price > 0) {
            const priceRange = classifyPriceRange(price);
            const currentPrice = priceAffinityMap.get(priceRange) || 0;
            priceAffinityMap.set(priceRange, currentPrice + weight);
          }
        }
      }
    }

    // Try to find if user already has a CustomerBehavior or create one
    let behavior = await CustomerBehavior.findOne({ userId: user._id });
    if (!behavior) {
      behavior = new CustomerBehavior({
        userId: user._id,
        sessionId: `real_data_sync_${user._id}`, // Dummy session ID for sync
      });
    }

    // Apply real values
    behavior.rfmScore = {
      recency: recency === 0 ? Date.now() : recency,
      frequency,
      monetary,
    };
    
    // We add a massive baseline behavior score based on how many orders they made
    behavior.behaviorScore = (behavior.behaviorScore || 0) + (frequency * 50);

    // Estimate page views from order history (at least 2 views per order item typically)
    if (behavior.totalPageViews === 0 && frequency > 0) {
      let totalItems = 0;
      for (const order of orders) {
        totalItems += (order.items as any[]).length;
      }
      behavior.totalPageViews = Math.max(totalItems * 2, frequency * 3);
    }

    // Clear and re-merge brand affinities (use resolved names, not ObjectIds)
    // First remove any ObjectId-style keys from existing affinities
    const existingBrandAffinities = new Map<string, number>();
    behavior.brandAffinities.forEach((score, key) => {
      // Keep only human-readable brand names (not ObjectId-like strings)
      if (!/^[0-9a-fA-F]{24}$/.test(key)) {
        existingBrandAffinities.set(key, score);
      }
    });
    behavior.brandAffinities = existingBrandAffinities as any;

    // Merge in new brand affinities from orders
    for (const [brand, score] of Array.from(brandAffinityMap.entries())) {
      const current = behavior.brandAffinities.get(brand) || 0;
      behavior.brandAffinities.set(brand, current + score);
    }

    // Clear and re-merge category affinities (use resolved names)
    const existingCategoryAffinities = new Map<string, number>();
    behavior.categoryAffinities.forEach((score, key) => {
      if (!/^[0-9a-fA-F]{24}$/.test(key)) {
        existingCategoryAffinities.set(key, score);
      }
    });
    behavior.categoryAffinities = existingCategoryAffinities as any;

    for (const [cat, score] of Array.from(categoryAffinityMap.entries())) {
      const current = behavior.categoryAffinities.get(cat) || 0;
      behavior.categoryAffinities.set(cat, current + score);
    }

    // Track distinct categories viewed
    const distinctCategories = new Set<string>();
    behavior.categoryAffinities.forEach((_, cat) => distinctCategories.add(cat));
    behavior.viewedCategoryCount = Math.max(behavior.viewedCategoryCount || 0, distinctCategories.size);

    // Merge in price affinities
    for (const [range, score] of Array.from(priceAffinityMap.entries())) {
      const current = behavior.priceAffinities.get(range) || 0;
      behavior.priceAffinities.set(range, current + score);
    }

    if (frequency > 0) {
      behavior.lastActive = new Date(recency);
    }

    // Pass to segmentation logic engine to decide their actual segment based on real data
    await segmentationService.recalculateSegment(behavior);

    await behavior.save();
    console.log(`Mapped User: ${user.email} -> Segment: ${behavior.segment} | Profile: ${behavior.behavioralProfile} | LTV: $${monetary.toLocaleString()} | Orders: ${frequency}`);
  }

  console.log('Real behavioral data sync completed!');
  process.exit(0);
}

syncRealBehaviors().catch(err => {
  console.error(err);
  process.exit(1);
});

