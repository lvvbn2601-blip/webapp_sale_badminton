import { ICustomerBehavior, CustomerBehavior } from '../models/CustomerBehavior';
import { Coupon } from '../models/Coupon';
import { Order } from '../models/Order';
import { redis } from '../config/redis';

export interface SmartVoucher {
  code: string;
  type: 'DISCOUNT_PERCENT' | 'DISCOUNT_AMOUNT' | 'CROSS_SELL' | 'BUNDLE_DEAL' | 'PAYMENT_SPECIFIC' | 'WELCOME' | 'FREE_SHIPPING';
  value?: number;
  maxDiscount?: number;
  message: string;
  description?: string;
  expiresIn?: number; // hours
  gateways?: string[]; // For payment-specific vouchers
  urgency?: 'low' | 'medium' | 'high'; // For FOMO UI treatment
  icon?: string; // emoji for display
}

interface CartItem {
  productId: string;
  name?: string;
  category?: string;
  brand?: string;
  price?: number;
  quantity?: number;
}

/**
 * Voucher Rule Engine — evaluates user behavior profile & cart state
 * to issue the right voucher at the right time.
 */
class VoucherRuleEngine {

  /**
   * Main entrypoint: evaluate all rules and return applicable vouchers.
   */
  async evaluateVoucherEligibility(
    userId: string | undefined,
    sessionId: string,
    cartItems: CartItem[] = []
  ): Promise<SmartVoucher[]> {
    const appliedVouchers: SmartVoucher[] = [];

    // Load user profile (by userId first, then sessionId fallback)
    let profile: ICustomerBehavior | null = null;
    if (userId) {
      profile = await CustomerBehavior.findOne({ userId });
    }
    if (!profile) {
      profile = await CustomerBehavior.findOne({ sessionId });
    }

    // Check if user has ever completed a checkout
    let hasEverOrdered = false;
    if (userId) {
      const orderCount = await Order.countDocuments({ user: userId, status: { $ne: 'cancelled' } });
      hasEverOrdered = orderCount > 0;
    }

    // ── Rule A: First-Time Purchase Activation (Welcome Voucher) ──
    if (!hasEverOrdered && userId) {
      // Check if WELCOME50K coupon exists and hasn't been used by this user
      const welcomeCoupon = await Coupon.findOne({ code: 'WELCOME50K', status: 'running' });
      if (welcomeCoupon) {
        const alreadyUsed = await Order.findOne({
          user: userId,
          discountCode: /^WELCOME50K$/i,
          status: { $ne: 'cancelled' },
        });
        if (!alreadyUsed) {
          appliedVouchers.push({
            code: 'WELCOME50K',
            type: 'WELCOME',
            value: 2, // $2 ~ 50K VND
            message: 'Chào mừng bạn mới! Giảm 50K₫ + miễn phí vận chuyển',
            description: 'Áp dụng cho đơn hàng từ 500K₫. Chỉ 1 lần/khách hàng.',
            urgency: 'medium',
            icon: '🎉',
          });
        }
      }
    }

    // ── Rule B: Cart Abandonment Recovery (COMEBACK5) ──
    if (profile?.cartAbandonment.isAbandoned && profile.cartAbandonment.lastAddedAt) {
      const hoursSinceAbandoned = (Date.now() - new Date(profile.cartAbandonment.lastAddedAt).getTime()) / (1000 * 60 * 60);
      
      if (hoursSinceAbandoned >= 2) {
        const comebackCoupon = await Coupon.findOne({ code: 'COMEBACK5', status: 'running' });
        if (comebackCoupon) {
          let alreadyUsed = false;
          if (userId) {
            const used = await Order.findOne({
              user: userId,
              discountCode: /^COMEBACK5$/i,
              status: { $ne: 'cancelled' },
            });
            alreadyUsed = !!used;
          }
          if (!alreadyUsed) {
            appliedVouchers.push({
              code: 'COMEBACK5',
              type: 'DISCOUNT_PERCENT',
              value: 5,
              maxDiscount: 4, // ~100K VND
              message: 'Giảm 5% để hoàn tất giỏ hàng!',
              description: 'Mã giảm giá đặc biệt cho bạn. Tối đa 100K₫.',
              expiresIn: 24,
              urgency: 'high',
              icon: '⏰',
            });
          }
        }
      }
    }

    // ── Rule C: Upsell String when buying a racket (Cross-sell) ──
    const hasRacket = cartItems.some(item =>
      item.category?.toLowerCase().includes('racket') ||
      item.name?.toLowerCase().includes('racket') ||
      item.name?.toLowerCase().includes('vợt')
    );
    const hasString = cartItems.some(item =>
      item.category?.toLowerCase().includes('string') ||
      item.name?.toLowerCase().includes('string') ||
      item.name?.toLowerCase().includes('dây cước')
    );

    if (hasRacket && !hasString) {
      appliedVouchers.push({
        code: 'COMBO_STRING',
        type: 'CROSS_SELL',
        message: 'Mua thêm dây cước để được miễn phí dịch vụ căng vợt!',
        description: 'Combo Vợt + Dây = Miễn phí căng dây tại shop.',
        urgency: 'medium',
        icon: '🏸',
      });
    }

    // ── Rule D: Bundle Deal for high engagement + low-value focus ──
    if (profile && profile.engagementScore >= 15) {
      const budgetScore = profile.priceAffinities.get('budget') || 0;
      const totalPriceScore = (profile.priceAffinities.get('budget') || 0) +
                              (profile.priceAffinities.get('mid') || 0) +
                              (profile.priceAffinities.get('premium') || 0);
      const budgetRatio = totalPriceScore > 0 ? budgetScore / totalPriceScore : 0;

      // High engagement but focused on low-value items — nudge them to bundle
      if (budgetRatio > 0.4) {
        appliedVouchers.push({
          code: 'BUNDLE10',
          type: 'BUNDLE_DEAL',
          value: 10,
          message: 'Mua 2 Grip Tape - Giảm ngay 10% tổng đơn!',
          description: 'Áp dụng khi mua 2 sản phẩm grip tape trở lên.',
          urgency: 'low',
          icon: '🎯',
        });
      }
    }

    // ── Rule E: Payment Gateway Promotion (always visible) ──
    appliedVouchers.push({
      code: 'EWALLET_PROMO',
      type: 'PAYMENT_SPECIFIC',
      value: 0.8, // ~20K VND
      gateways: ['MoMo', 'VNPay'],
      message: 'Giảm ngay 20K₫ khi thanh toán qua MoMo hoặc VNPay',
      description: 'Khuyến mãi thanh toán điện tử. Không cần nhập mã.',
      urgency: 'low',
      icon: '💳',
    });

    return appliedVouchers;
  }
}

export const voucherRuleEngine = new VoucherRuleEngine();
