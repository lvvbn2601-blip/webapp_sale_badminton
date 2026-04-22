import { ICustomerBehavior, CustomerBehavior, BehavioralProfile } from '../models/CustomerBehavior';
import { redis } from '../config/redis';
import { createNotification } from './notificationService';
import { Coupon } from '../models/Coupon';

// ── Display mapping for behavioral profiles ──────────────────────────
export const PROFILE_DISPLAY: Record<BehavioralProfile, { label: string; labelVi: string; emoji: string; color: string }> = {
  ghost_shopper: { label: 'Ghost Shopper', labelVi: 'Người xem lướt', emoji: '👻', color: '#8b5cf6' },
  gear_geek:     { label: 'Gear Geek',     labelVi: 'Chuyên gia thiết bị', emoji: '🔬', color: '#0ea5e9' },
  brand_loyalist:{ label: 'Brand Loyalist', labelVi: 'Fan thương hiệu', emoji: '💎', color: '#f59e0b' },
  beginner:      { label: 'Beginner',       labelVi: 'Người mới', emoji: '🌱', color: '#10b981' },
  unclassified:  { label: 'New Visitor',    labelVi: 'Khách mới', emoji: '👤', color: '#94a3b8' },
};

// ── Scoring weights (tuned for badminton e-commerce context) ─────────
const WEIGHTS = {
  // Ghost Shopper signals
  ghost: {
    highViews:       25,  // >= 8 page views
    fastScroll:      25,  // scroll speed >= 1500 px/s
    lowDeepClicks:   20,  // deep clicks <= 2
    lowHoldTime:     15,  // max hold < 7.5s
    lowEngagement:   15,  // engagement < 7.5
  },
  // Gear Geek signals
  geek: {
    longHold:        30,  // max hold duration >= 15s on spec areas
    highEngagement:  25,  // engagement score >= 15
    deepClicks:      20,  // deep clicks >= 3
    totalDwell:      15,  // total hold across products >= 30s
    premiumBias:     10,  // prefers premium over budget
  },
  // Brand Loyalist signals
  loyalist: {
    highAffinity:    35,  // top brand >= 70% of total brand score
    moderateAffinity:20,  // top brand >= 50% of total brand score
    highBrandFilter: 20,  // heavy use of brand filters
    highBrandScore:  15,  // total brand interactions >= 20
    sufficientData:  10,  // behavior score >= 20
  },
  // Beginner signals
  beginner: {
    multiCategory:   30,  // browsed 3+ categories
    budgetFocus:     25,  // 50%+ views on budget products
    lowActivity:     20,  // behavior score < 30 (still exploring)
    someViews:       15,  // at least 5 page views
    noPremium:       10,  // low premium affinity
  },
} as const;

const MIN_CONFIDENCE = 25; // Minimum score to classify (out of 100)

class SegmentationService {
  /**
   * Recalculate the behavioral profile for a user.
   * Uses a single-pass weighted scoring system instead of cascading if/else.
   */
  public async recalculateSegment(profile: ICustomerBehavior) {
    // ── Compute profile signals ──
    const signals = this.extractSignals(profile);

    // ── Score each profile type ──
    const scores = this.computeScores(signals);

    // ── Pick best match ──
    scores.sort((a, b) => b.score - a.score);
    profile.behavioralProfile = scores[0].score >= MIN_CONFIDENCE
      ? scores[0].profile
      : 'unclassified';

    // ── Derive legacy segment from behavioral profile (backward compat) ──
    profile.segment = this.deriveSegment(profile);
  }

  /**
   * Extract normalized signals from the raw profile data.
   * This single extraction step feeds all scoring functions,
   * so we avoid re-reading the same Maps multiple times.
   */
  private extractSignals(profile: ICustomerBehavior) {
    const totalViews = profile.totalPageViews || 0;
    const scrollSpeed = profile.scrollSpeedAvg || 0;
    const deepClicks = profile.deepClickCount || 0;
    const engagement = profile.engagementScore || 0;
    const behaviorScore = profile.behaviorScore || 0;

    // Hold duration metrics
    let maxHoldDuration = 0;
    let totalHoldDuration = 0;
    let holdProductCount = 0;
    profile.holdDurations.forEach((duration) => {
      totalHoldDuration += duration;
      holdProductCount++;
      if (duration > maxHoldDuration) maxHoldDuration = duration;
    });

    // Brand affinity metrics
    let topBrandScore = 0;
    let totalBrandScore = 0;
    let brandCount = 0;
    profile.brandAffinities.forEach((score) => {
      totalBrandScore += score;
      brandCount++;
      if (score > topBrandScore) topBrandScore = score;
    });
    const brandAffinityRatio = totalBrandScore > 0 ? topBrandScore / totalBrandScore : 0;

    // Brand filter usage metrics
    let topBrandFilterCount = 0;
    let totalFilterCount = 0;
    profile.filterBrandUsage.forEach((count) => {
      totalFilterCount += count;
      if (count > topBrandFilterCount) topBrandFilterCount = count;
    });
    const brandFilterRatio = totalFilterCount > 0 ? topBrandFilterCount / totalFilterCount : 0;

    // Price affinity metrics
    const budgetScore = profile.priceAffinities.get('budget') || 0;
    const midScore = profile.priceAffinities.get('mid') || 0;
    const premiumScore = profile.priceAffinities.get('premium') || 0;
    const totalPriceScore = budgetScore + midScore + premiumScore;
    const budgetRatio = totalPriceScore > 0 ? budgetScore / totalPriceScore : 0;
    const categoriesViewed = profile.viewedCategoryCount || 0;

    return {
      totalViews, scrollSpeed, deepClicks, engagement, behaviorScore,
      maxHoldDuration, totalHoldDuration, holdProductCount,
      topBrandScore, totalBrandScore, brandCount, brandAffinityRatio,
      topBrandFilterCount, totalFilterCount, brandFilterRatio,
      budgetScore, premiumScore, totalPriceScore, budgetRatio,
      categoriesViewed,
    };
  }

  /**
   * Compute confidence scores for each behavioral profile.
   * Each signal contributes a weighted amount (0 or full weight).
   * Partial credit is given via half-thresholds to handle users with incomplete data.
   */
  private computeScores(s: ReturnType<SegmentationService['extractSignals']>) {
    const W = WEIGHTS;

    // ── Ghost Shopper: Many views, fast scrolling, shallow engagement ──
    let ghostScore = 0;
    if (s.totalViews >= 8)           ghostScore += W.ghost.highViews;
    else if (s.totalViews >= 4)      ghostScore += W.ghost.highViews * 0.5;
    if (s.scrollSpeed >= 1500)       ghostScore += W.ghost.fastScroll;
    else if (s.scrollSpeed >= 800)   ghostScore += W.ghost.fastScroll * 0.4;
    if (s.deepClicks <= 2)           ghostScore += W.ghost.lowDeepClicks;
    if (s.maxHoldDuration < 7500)    ghostScore += W.ghost.lowHoldTime;
    if (s.engagement < 7.5)          ghostScore += W.ghost.lowEngagement;

    // ── Gear Geek: Long hold times, high engagement, spec-area clicks ──
    let geekScore = 0;
    if (s.maxHoldDuration >= 15000)       geekScore += W.geek.longHold;
    else if (s.maxHoldDuration >= 7500)   geekScore += W.geek.longHold * 0.5;
    if (s.engagement >= 15)               geekScore += W.geek.highEngagement;
    else if (s.engagement >= 7.5)         geekScore += W.geek.highEngagement * 0.5;
    if (s.deepClicks >= 3)                geekScore += W.geek.deepClicks;
    else if (s.deepClicks >= 1)           geekScore += W.geek.deepClicks * 0.5;
    if (s.totalHoldDuration >= 30000 && s.holdProductCount >= 2) geekScore += W.geek.totalDwell;
    if (s.premiumScore > s.budgetScore)   geekScore += W.geek.premiumBias;

    // ── Brand Loyalist: Concentrated brand affinity ──
    let loyalistScore = 0;
    if (s.brandAffinityRatio >= 0.7)      loyalistScore += W.loyalist.highAffinity;
    else if (s.brandAffinityRatio >= 0.5) loyalistScore += W.loyalist.moderateAffinity;
    if (s.brandFilterRatio >= 0.5 && s.totalFilterCount >= 3)
                                          loyalistScore += W.loyalist.highBrandFilter;
    if (s.totalBrandScore >= 20)          loyalistScore += W.loyalist.highBrandScore;
    else if (s.totalBrandScore >= 10)     loyalistScore += W.loyalist.highBrandScore * 0.5;
    if (s.behaviorScore >= 20)            loyalistScore += W.loyalist.sufficientData;
    else if (s.behaviorScore >= 10)       loyalistScore += W.loyalist.sufficientData * 0.5;

    // ── Beginner: Multi-category, budget-focused, still exploring ──
    let beginnerScore = 0;
    if (s.categoriesViewed >= 3)          beginnerScore += W.beginner.multiCategory;
    else if (s.categoriesViewed >= 2)     beginnerScore += W.beginner.multiCategory * 0.5;
    if (s.budgetRatio >= 0.5)             beginnerScore += W.beginner.budgetFocus;
    else if (s.budgetRatio >= 0.3)        beginnerScore += W.beginner.budgetFocus * 0.5;
    if (s.behaviorScore < 30)             beginnerScore += W.beginner.lowActivity;
    if (s.totalViews >= 5)                beginnerScore += W.beginner.someViews;
    else if (s.totalViews >= 2)           beginnerScore += W.beginner.someViews * 0.5;
    if (s.premiumScore <= s.budgetScore)  beginnerScore += W.beginner.noPremium;

    return [
      { profile: 'ghost_shopper'  as BehavioralProfile, score: ghostScore },
      { profile: 'gear_geek'     as BehavioralProfile, score: geekScore },
      { profile: 'brand_loyalist' as BehavioralProfile, score: loyalistScore },
      { profile: 'beginner'      as BehavioralProfile, score: beginnerScore },
    ];
  }

  /**
   * Derive the legacy `segment` field from the behavioral profile + context.
   * This keeps backward compatibility with the admin UI badge without
   * maintaining a separate classification engine.
   */
  private deriveSegment(profile: ICustomerBehavior): ICustomerBehavior['segment'] {
    // Time-based overrides (these are higher priority)
    if (profile.cartAbandonment.isAbandoned) {
      return 'Hesitant Customers';
    }
    if (Date.now() - profile.lastActive.getTime() > 14 * 24 * 60 * 60 * 1000) {
      return 'About to leave';
    }

    // Map behavioral profile → legacy segment
    switch (profile.behavioralProfile) {
      case 'brand_loyalist': return 'Brand Enthusiasts';
      case 'gear_geek':      return 'Professional Customers';
      case 'beginner':       return 'Potential Newcomers';
      case 'ghost_shopper':  return 'Potential Newcomers';
      default:               return 'Uncategorized';
    }
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
