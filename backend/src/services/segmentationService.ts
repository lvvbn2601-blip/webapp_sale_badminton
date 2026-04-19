import { ICustomerBehavior, CustomerBehavior, BehavioralProfile } from '../models/CustomerBehavior';
import { redis } from '../config/redis';
import { createNotification } from './notificationService';
import { Coupon } from '../models/Coupon';

// ── Thresholds for behavioral profile classification ─────────────────
const GHOST_SHOPPER_MIN_VIEWS = 8;
const GHOST_SHOPPER_MIN_SCROLL_SPEED = 1500; // px/s — fast scrolling
const GHOST_SHOPPER_MAX_DEEP_CLICKS = 2;

const GEAR_GEEK_MIN_HOLD_DURATION = 15000; // 15s hold on spec areas
const GEAR_GEEK_MIN_ENGAGEMENT = 15;
const GEAR_GEEK_MIN_DEEP_CLICKS = 3;

const BRAND_LOYALIST_MIN_AFFINITY_RATIO = 0.7; // 70%+ of behavior on one brand
const BRAND_LOYALIST_MIN_SCORE = 20;

const BEGINNER_MIN_CATEGORIES = 3; // Browse 3+ categories = exploring
const BEGINNER_BUDGET_RATIO = 0.5; // 50%+ of views on budget products

class SegmentationService {
  /**
   * Recalculate both the legacy segment and the new behavioral profile.
   */
  public async recalculateSegment(profile: ICustomerBehavior) {
    // ── Legacy segment (kept for backward compat) ──
    let segment: ICustomerBehavior['segment'] = 'Uncategorized';

    // Rule 1: Hesitant Customers (Added to cart, no checkout)
    if (profile.cartAbandonment.isAbandoned) {
      segment = 'Hesitant Customers';
    } 
    // Rule 2: About to leave (Not active for 14 days)
    else if (Date.now() - profile.lastActive.getTime() > 14 * 24 * 60 * 60 * 1000) {
      segment = 'About to leave';
    }
    else {
      // Analyze behavior
      let totalViewsHolds = profile.behaviorScore; 
      
      // Check top brand affinity
      let topBrand = '';
      let topBrandScore = 0;
      profile.brandAffinities.forEach((score, brand) => {
        if (score > topBrandScore) {
          topBrandScore = score;
          topBrand = brand;
        }
      });

      // Brand Enthusiasts: High score on specific brand, e.g., > 70% of behavior score
      if (topBrandScore > 0 && topBrandScore / totalViewsHolds > 0.7 && totalViewsHolds > 20) {
        segment = 'Brand Enthusiasts';
      }
      else if (totalViewsHolds > 30) {
        // Distinguish Professional vs Potential Newcomer based on price or product type affinity
        let accessoriesScore = profile.categoryAffinities.get('Accessories') || 0;
        let gripScore = profile.categoryAffinities.get('Grip Wraps') || 0;
        let racketScore = profile.categoryAffinities.get('Rackets') || 0;

        if (accessoriesScore + gripScore > racketScore) {
          segment = 'Potential Newcomers';
        } else {
          segment = 'Professional Customers';
        }
      }
    }

    profile.segment = segment;

    // ── New Behavioral Profile Classification ──
    profile.behavioralProfile = this.classifyBehavioralProfile(profile);
  }

  /**
   * Classify user into one of 4 behavioral profiles from the strategy matrix.
   */
  private classifyBehavioralProfile(profile: ICustomerBehavior): BehavioralProfile {
    const totalViews = profile.totalPageViews || 0;
    const scrollSpeed = profile.scrollSpeedAvg || 0;
    const deepClicks = profile.deepClickCount || 0;
    const engagement = profile.engagementScore || 0;
    const behaviorScore = profile.behaviorScore || 0;

    // ── Compute aggregate hold duration across all products ──
    let maxHoldDuration = 0;
    let totalHoldDuration = 0;
    let holdProductCount = 0;
    profile.holdDurations.forEach((duration) => {
      totalHoldDuration += duration;
      holdProductCount++;
      if (duration > maxHoldDuration) maxHoldDuration = duration;
    });

    // ── Compute brand affinity metrics ──
    let topBrandScore = 0;
    let totalBrandScore = 0;
    let brandCount = 0;
    profile.brandAffinities.forEach((score) => {
      totalBrandScore += score;
      brandCount++;
      if (score > topBrandScore) topBrandScore = score;
    });
    const brandAffinityRatio = totalBrandScore > 0 ? topBrandScore / totalBrandScore : 0;

    // ── Compute brand filter metrics ──
    let topBrandFilterCount = 0;
    let totalFilterCount = 0;
    profile.filterBrandUsage.forEach((count) => {
      totalFilterCount += count;
      if (count > topBrandFilterCount) topBrandFilterCount = count;
    });
    const brandFilterRatio = totalFilterCount > 0 ? topBrandFilterCount / totalFilterCount : 0;

    // ── Compute price affinity metrics ──
    const budgetScore = profile.priceAffinities.get('budget') || 0;
    const midScore = profile.priceAffinities.get('mid') || 0;
    const premiumScore = profile.priceAffinities.get('premium') || 0;
    const totalPriceScore = budgetScore + midScore + premiumScore;
    const budgetRatio = totalPriceScore > 0 ? budgetScore / totalPriceScore : 0;
    const categoriesViewed = profile.viewedCategoryCount || 0;

    // ════════════════════════════════════════════════════════════════════
    // PHASE 1: Strict checks (original precise detection)
    // ════════════════════════════════════════════════════════════════════

    // ── 1. Gear Geek: Long hold times + high engagement + deep clicks ──
    if (
      maxHoldDuration >= GEAR_GEEK_MIN_HOLD_DURATION &&
      engagement >= GEAR_GEEK_MIN_ENGAGEMENT &&
      deepClicks >= GEAR_GEEK_MIN_DEEP_CLICKS
    ) {
      return 'gear_geek';
    }

    // ── 2. Brand Loyalist: High single-brand affinity OR heavy brand filter use ──
    if (
      (brandAffinityRatio >= BRAND_LOYALIST_MIN_AFFINITY_RATIO && behaviorScore >= BRAND_LOYALIST_MIN_SCORE) ||
      (brandFilterRatio >= BRAND_LOYALIST_MIN_AFFINITY_RATIO && totalFilterCount >= 3)
    ) {
      return 'brand_loyalist';
    }

    // ── 3. Beginner: Multi-category browsing + budget-focused ──
    if (
      categoriesViewed >= BEGINNER_MIN_CATEGORIES &&
      budgetRatio >= BEGINNER_BUDGET_RATIO &&
      totalViews >= 5
    ) {
      return 'beginner';
    }

    // ── 4. Ghost Shopper: Many views, fast scrolling, few deep clicks ──
    if (
      totalViews >= GHOST_SHOPPER_MIN_VIEWS &&
      scrollSpeed >= GHOST_SHOPPER_MIN_SCROLL_SPEED &&
      deepClicks <= GHOST_SHOPPER_MAX_DEEP_CLICKS
    ) {
      return 'ghost_shopper';
    }

    // ════════════════════════════════════════════════════════════════════
    // PHASE 2: Relaxed checks (for users with partial but sufficient data)
    // Users who have meaningful behavioral data but don't meet ALL strict
    // conditions should still be classified rather than left as 'unclassified'.
    // ════════════════════════════════════════════════════════════════════

    // ── Gear Geek (relaxed): Long hold times + high engagement ──
    // Deep clicks may not be tracked if frontend only sends hover/dwell events
    if (
      maxHoldDuration >= GEAR_GEEK_MIN_HOLD_DURATION &&
      (engagement >= GEAR_GEEK_MIN_ENGAGEMENT || behaviorScore >= 30)
    ) {
      return 'gear_geek';
    }

    // ── Gear Geek (via total dwell time): Spent significant time examining products ──
    if (
      totalHoldDuration >= GEAR_GEEK_MIN_HOLD_DURATION * 2 &&
      holdProductCount >= 2 &&
      behaviorScore >= 10
    ) {
      return 'gear_geek';
    }

    // ── Brand Loyalist (relaxed): Lower score threshold for synced profiles ──
    // The syncRealBehaviors utility inflates behaviorScore via order history,
    // so the affinity ratio remains the primary indicator.
    if (
      brandAffinityRatio >= 0.5 &&
      totalBrandScore >= 10 &&
      behaviorScore >= 10
    ) {
      return 'brand_loyalist';
    }

    // ── Beginner (relaxed): Multi-category browsing without requiring views ──
    // For sync'd users who have order history across categories but no browsing data
    if (
      categoriesViewed >= BEGINNER_MIN_CATEGORIES &&
      (budgetRatio >= 0.3 || totalPriceScore === 0) &&
      behaviorScore >= 5
    ) {
      return 'beginner';
    }

    // ── Ghost Shopper (relaxed): High views + low engagement without scroll speed ──
    // Scroll tracking may not always fire; high views + low deep clicks is enough
    if (
      totalViews >= GHOST_SHOPPER_MIN_VIEWS &&
      deepClicks <= GHOST_SHOPPER_MAX_DEEP_CLICKS &&
      engagement < GEAR_GEEK_MIN_ENGAGEMENT
    ) {
      return 'ghost_shopper';
    }

    // ════════════════════════════════════════════════════════════════════
    // PHASE 3: Best-fit scoring (last resort before 'unclassified')
    // If we have ANY meaningful behavioral data, compute a confidence
    // score for each profile and pick the best match.
    // ════════════════════════════════════════════════════════════════════

    if (behaviorScore >= 5 || totalViews >= 3 || totalBrandScore >= 5) {
      const scores: { profile: BehavioralProfile; score: number }[] = [];

      // Gear Geek scoring
      let gearGeekScore = 0;
      if (maxHoldDuration >= GEAR_GEEK_MIN_HOLD_DURATION) gearGeekScore += 40;
      else if (maxHoldDuration >= GEAR_GEEK_MIN_HOLD_DURATION / 2) gearGeekScore += 20;
      if (engagement >= GEAR_GEEK_MIN_ENGAGEMENT) gearGeekScore += 30;
      else if (engagement >= GEAR_GEEK_MIN_ENGAGEMENT / 2) gearGeekScore += 15;
      if (deepClicks >= GEAR_GEEK_MIN_DEEP_CLICKS) gearGeekScore += 30;
      else if (deepClicks >= 1) gearGeekScore += 15;
      if (premiumScore > budgetScore) gearGeekScore += 10;
      scores.push({ profile: 'gear_geek', score: gearGeekScore });

      // Brand Loyalist scoring
      let brandLoyalistScore = 0;
      if (brandAffinityRatio >= BRAND_LOYALIST_MIN_AFFINITY_RATIO) brandLoyalistScore += 40;
      else if (brandAffinityRatio >= 0.5) brandLoyalistScore += 25;
      else if (brandAffinityRatio >= 0.3 && brandCount <= 3) brandLoyalistScore += 15;
      if (behaviorScore >= BRAND_LOYALIST_MIN_SCORE) brandLoyalistScore += 30;
      else if (behaviorScore >= 10) brandLoyalistScore += 15;
      if (brandFilterRatio >= 0.5) brandLoyalistScore += 20;
      if (totalBrandScore >= 20) brandLoyalistScore += 10;
      scores.push({ profile: 'brand_loyalist', score: brandLoyalistScore });

      // Beginner scoring
      let beginnerScore = 0;
      if (categoriesViewed >= BEGINNER_MIN_CATEGORIES) beginnerScore += 35;
      else if (categoriesViewed >= 2) beginnerScore += 20;
      if (budgetRatio >= BEGINNER_BUDGET_RATIO) beginnerScore += 35;
      else if (budgetRatio >= 0.3) beginnerScore += 20;
      if (totalViews >= 5) beginnerScore += 15;
      else if (totalViews >= 2) beginnerScore += 8;
      if (behaviorScore < 30) beginnerScore += 15; // Low activity = likely beginner
      scores.push({ profile: 'beginner', score: beginnerScore });

      // Ghost Shopper scoring
      let ghostScore = 0;
      if (totalViews >= GHOST_SHOPPER_MIN_VIEWS) ghostScore += 30;
      else if (totalViews >= 4) ghostScore += 15;
      if (scrollSpeed >= GHOST_SHOPPER_MIN_SCROLL_SPEED) ghostScore += 30;
      if (deepClicks <= GHOST_SHOPPER_MAX_DEEP_CLICKS) ghostScore += 20;
      if (maxHoldDuration < GEAR_GEEK_MIN_HOLD_DURATION / 2) ghostScore += 10;
      if (engagement < GEAR_GEEK_MIN_ENGAGEMENT / 2) ghostScore += 10;
      scores.push({ profile: 'ghost_shopper', score: ghostScore });

      // Pick best-fit (minimum threshold of 30 to avoid random noise)
      scores.sort((a, b) => b.score - a.score);
      if (scores[0].score >= 30) {
        return scores[0].profile;
      }
    }

    // ── Truly insufficient data ──
    return 'unclassified';
  }

  /**
   * Called periodically via cron to handle time-based rules:
   * - Cart abandonment notifications
   * - COMEBACK voucher auto-issuance
   */
  public async runScheduledTasks() {
    const now = new Date();
    
    // ── Cart Abandonment: 30 min reminder (no discount yet) ──
    const thirtyMinsAgo = new Date(now.getTime() - 30 * 60 * 1000);
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    
    const abandon30m = await CustomerBehavior.find({
      'cartAbandonment.isAbandoned': true,
      'cartAbandonment.lastAddedAt': { $lt: thirtyMinsAgo, $gte: twoHoursAgo },
      'cartAbandonment.notified30Min': false,
      userId: { $exists: true, $ne: null },
    });

    for (const p of abandon30m) {
      if (p.userId) {
        try {
          await createNotification({
            userId: String(p.userId),
            type: 'system',
            title: '🛒 Bạn quên gì đó không?',
            message: 'Giỏ hàng của bạn vẫn đang chờ! Hoàn tất đơn hàng ngay trước khi hết hàng nhé.',
          });
        } catch (err) {
          console.error('Cart abandonment 30min notification failed:', err);
        }
      }
      p.cartAbandonment.notified30Min = true;
      await p.save();
    }

    // ── Cart Abandonment: 2 hour reminder + COMEBACK5 voucher ──
    const abandon2h = await CustomerBehavior.find({
      'cartAbandonment.isAbandoned': true,
      'cartAbandonment.lastAddedAt': { $lt: twoHoursAgo },
      'cartAbandonment.notified2Hour': false,
      userId: { $exists: true, $ne: null },
    });

    for (const p of abandon2h) {
      if (p.userId) {
        try {
          // Create/ensure COMEBACK5 voucher exists
          await this.ensureComebackVoucher();

          await createNotification({
            userId: String(p.userId),
            type: 'system',
            title: '🎁 Mã giảm 5% dành riêng cho bạn!',
            message: 'Dùng mã COMEBACK5 để được giảm 5% (tối đa 100K₫). Mã chỉ có hiệu lực trong 24 giờ tới!',
          });
        } catch (err) {
          console.error('Cart abandonment 2h voucher notification failed:', err);
        }
      }
      p.cartAbandonment.notified2Hour = true;
      p.cartAbandonment.voucherSent = true;
      await p.save();
    }

    // ── Welcome voucher for new users who added to cart ──
    const newCartUsers = await CustomerBehavior.find({
      'firstTimePurchaseTriggered': false,
      'welcomeVoucherSent': false,
      'hasCompletedCheckout': false,
      'cartAbandonment.isAbandoned': true,
      userId: { $exists: true, $ne: null },
    });

    for (const p of newCartUsers) {
      if (p.userId) {
        try {
          await this.ensureWelcomeVoucher();
          await createNotification({
            userId: String(p.userId),
            type: 'system',
            title: '🎉 Chào mừng bạn mới! Giảm 50K₫',
            message: 'Dùng mã WELCOME50K để được giảm 50K₫ cho đơn hàng từ 500K₫ + miễn phí vận chuyển!',
          });
        } catch (err) {
          console.error('Welcome voucher notification failed:', err);
        }
      }
      p.welcomeVoucherSent = true;
      p.firstTimePurchaseTriggered = true;
      await p.save();
    }
  }

  /**
   * Ensure the COMEBACK5 coupon exists in the system.
   */
  private async ensureComebackVoucher() {
    const existing = await Coupon.findOne({ code: 'COMEBACK5' });
    if (!existing) {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30); // Valid for 30 days rolling
      await Coupon.create({
        code: 'COMEBACK5',
        program: 'Cart Abandonment Recovery',
        discountType: 'percent',
        amount: 5,
        maxDiscount: 4, // ~100K VND / 25000 = $4
        minOrderValue: 0,
        startDate: new Date(),
        expiresAt,
        status: 'running',
        customerTarget: 'all',
        membershipTarget: 'all',
        usageLimit: 10000,
        limitPerCustomer: 1,
      });
    }
  }

  /**
   * Ensure the WELCOME50K coupon exists in the system.
   */
  private async ensureWelcomeVoucher() {
    const existing = await Coupon.findOne({ code: 'WELCOME50K' });
    if (!existing) {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 90);
      await Coupon.create({
        code: 'WELCOME50K',
        program: 'First-Time Purchase Activation',
        discountType: 'amount',
        amount: 2, // $2 ~ 50K VND
        minOrderValue: 20, // $20 ~ 500K VND
        startDate: new Date(),
        expiresAt,
        status: 'running',
        customerTarget: 'new',
        membershipTarget: 'all',
        usageLimit: 50000,
        limitPerCustomer: 1,
      });
    }
  }
}

export const segmentationService = new SegmentationService();
