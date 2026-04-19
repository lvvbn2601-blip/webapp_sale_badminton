import { Queue, Worker, Job } from 'bullmq';
import { redis } from '../config/redis';
import { BehaviorLog, IBehaviorLog } from '../models/BehaviorLog';
import { CustomerBehavior } from '../models/CustomerBehavior';
import { segmentationService } from '../services/segmentationService';

export const trackingQueue = new Queue('tracking-queue', { connection: redis });

const VIEWED_PRODUCT_LIMIT = 30; // Keep last N viewed products for recommendations
const BUDGET_PRICE_THRESHOLD = 40; // USD — Products under this = "budget" tier
const PREMIUM_PRICE_THRESHOLD = 120; // USD — Products above this = "premium" tier

const classifyPriceRange = (price: number): string => {
  if (price < BUDGET_PRICE_THRESHOLD) return 'budget';
  if (price > PREMIUM_PRICE_THRESHOLD) return 'premium';
  return 'mid';
};

const processTrackingEvent = async (job: Job) => {
  const data: Partial<IBehaviorLog> = job.data;

  // 1. Log behavior to MongoDB
  await BehaviorLog.create(data);

  // 2. Fetch or create CustomerBehavior profile prioritizing userId over sessionId
  let profile;

  if (data.userId) {
    profile = await CustomerBehavior.findOne({ userId: data.userId });
  }

  if (!profile) {
    const sessionProfile = await CustomerBehavior.findOne({ sessionId: data.sessionId });
    // Only inherit an existing session profile if it doesn't already belong to an explicit user!
    if (sessionProfile && (!sessionProfile.userId || String(sessionProfile.userId) === String(data.userId))) {
      profile = sessionProfile;
    }
  }

  if (!profile) {
    profile = new CustomerBehavior({
      sessionId: data.sessionId,
      userId: data.userId,
    });
  } else {
    // If we have a userId now, but the profile doesn't, attach it
    if (data.userId && !profile.userId) {
      profile.userId = data.userId;
    }
    // Update the profile's active session ID
    if (data.sessionId && profile.sessionId !== data.sessionId) {
      profile.sessionId = data.sessionId;
    }
  }

  profile.lastActive = new Date();

  // 3. Update scores and affinities based on action
  let weight = 0;
  switch (data.action) {
    case 'view':
      weight = 1;
      profile.totalPageViews += 1;
      // Track viewed product for recommendation
      if (data.entityId) {
        const productIdStr = String(data.entityId);
        const viewed = profile.viewedProductIds || [];
        // Remove if already in list, then add to front
        const idx = viewed.indexOf(productIdStr);
        if (idx !== -1) viewed.splice(idx, 1);
        viewed.unshift(productIdStr);
        // Trim to limit
        profile.viewedProductIds = viewed.slice(0, VIEWED_PRODUCT_LIMIT);
      }
      break;

    case 'scroll':
      weight = 0.5;
      // Track scroll speed for ghost shopper detection
      if (data.metadata?.scrollSpeed) {
        const prevAvg = profile.scrollSpeedAvg || 0;
        const totalViews = profile.totalPageViews || 1;
        // Running average of scroll speed
        profile.scrollSpeedAvg = ((prevAvg * (totalViews - 1)) + data.metadata.scrollSpeed) / totalViews;
      }
      break;

    case 'hover':
      weight = 0.5;
      // Track hold duration on spec areas — key signal for "Gear Geeks"
      if (data.metadata?.duration && data.entityId && data.metadata?.pageSection) {
        const productIdStr = String(data.entityId);
        const currentDuration = profile.holdDurations.get(productIdStr) || 0;
        profile.holdDurations.set(productIdStr, currentDuration + data.metadata.duration);
      }
      break;

    case 'click':
      weight = 2;
      // Track deep clicks (spec areas, images, reviews = engagement signal)
      if (data.metadata?.pageSection && ['specs_area', 'images', 'reviews', 'description'].includes(data.metadata.pageSection)) {
        profile.deepClickCount += 1;
      }
      break;

    case 'dwell':
      // Passive dwell time tracking (time spent on a page section)
      weight = 0;
      if (data.metadata?.duration && data.entityId) {
        const productIdStr = String(data.entityId);
        const currentDuration = profile.holdDurations.get(productIdStr) || 0;
        profile.holdDurations.set(productIdStr, currentDuration + data.metadata.duration);
      }
      break;

    case 'filter_use':
      weight = 1;
      // Track brand filter usage — key signal for "Brand Loyalists"
      if (data.metadata?.filterUsed) {
        const filterParts = data.metadata.filterUsed.split(':');
        if (filterParts[0] === 'brand' && filterParts[1]) {
          const brandName = filterParts[1];
          const currentCount = profile.filterBrandUsage.get(brandName) || 0;
          profile.filterBrandUsage.set(brandName, currentCount + 1);
        }
      }
      break;

    case 'add_to_cart':
      weight = 5;
      profile.cartAbandonment.isAbandoned = true;
      profile.cartAbandonment.lastAddedAt = new Date();
      profile.cartAbandonment.notified30Min = false;
      profile.cartAbandonment.notified2Hour = false;
      profile.cartAbandonment.voucherSent = false;
      break;

    case 'checkout':
      weight = 10;
      profile.cartAbandonment.isAbandoned = false;
      profile.hasCompletedCheckout = true;
      break;
  }

  // Multiply by duration if provided (up to a cap)
  if (data.metadata?.duration) {
    const durationMultiplier = Math.min(Math.max(data.metadata.duration / 1000, 1), 60); // Max 60s
    weight += durationMultiplier * 0.1;
  }

  profile.behaviorScore += weight;

  // Update Engagement Score (weighted combination)
  const dwellWeight = data.metadata?.duration ? Math.min(data.metadata.duration / 1000, 30) * 0.3 : 0;
  const clickWeight = profile.deepClickCount * 0.5;
  const scrollPenalty = profile.scrollSpeedAvg > 2000 ? -5 : 0; // Penalize fast scrollers
  profile.engagementScore = Math.max(0, profile.behaviorScore * 0.4 + dwellWeight + clickWeight + scrollPenalty);

  // Update Brand Affinities
  if (data.metadata?.brand) {
    const currentAffinity = profile.brandAffinities.get(data.metadata.brand) || 0;
    profile.brandAffinities.set(data.metadata.brand, currentAffinity + weight);
  }

  // Update Category Affinities
  if (data.metadata?.category) {
    const currentAffinity = profile.categoryAffinities.get(data.metadata.category) || 0;
    profile.categoryAffinities.set(data.metadata.category, currentAffinity + weight);

    // Track distinct categories viewed
    const distinctCategories = new Set<string>();
    profile.categoryAffinities.forEach((_, cat) => distinctCategories.add(cat));
    profile.viewedCategoryCount = distinctCategories.size;
  }

  // Update Price Affinities
  if (data.metadata?.price) {
    const priceRange = classifyPriceRange(data.metadata.price);
    const currentPriceAff = profile.priceAffinities.get(priceRange) || 0;
    profile.priceAffinities.set(priceRange, currentPriceAff + weight);
  }

  // Recalculate RFM basic (Frequency and Recency is updated)
  profile.rfmScore.frequency += 1;
  profile.rfmScore.recency = Date.now(); // We can store timestamp here

  // 4. Update Segmentation (both legacy segment + new behavioral profile)
  await segmentationService.recalculateSegment(profile);

  await profile.save();

  // Save partial session data to Redis for real-time recommendation access
  await redis.set(`session:${profile.sessionId}:segment`, profile.segment, 'EX', 3600); // 1 hour
  await redis.set(`session:${profile.sessionId}:profile`, profile.behavioralProfile, 'EX', 3600);
  if (data.metadata?.brand) {
    await redis.set(`session:${profile.sessionId}:topBrand`, data.metadata.brand, 'EX', 3600);
  }
  // Cache engagement score for quick access
  await redis.set(`session:${profile.sessionId}:engagement`, String(profile.engagementScore), 'EX', 3600);
};

export const trackingWorker = new Worker('tracking-queue', processTrackingEvent, { connection: redis });

trackingWorker.on('completed', job => {
  // console.log(`${job.id} has completed!`);
});

trackingWorker.on('failed', (job, err) => {
  console.error(`${job?.id} has failed with ${err.message}`);
});
