import { Coupon } from "../models/Coupon";
import { Order } from "../models/Order";
import { Product } from "../models/Product";
import { Category } from "../models/Category";
import { User } from "../models/User";
import { ApiError } from "../utils/apiError";

export const createCoupon = (payload: any) => Coupon.create(payload);

export const listCoupons = async () => {
  // Auto-expire overdue coupons before listing
  await expireOverdueCoupons();
  return Coupon.find()
    .populate("applicableCategories", "name slug")
    .populate("applicableProducts", "name slug image basePrice")
    .sort({ createdAt: -1 });
};

export const listPublicCoupons = async (userId?: string) => {
  // Auto-expire overdue coupons before listing
  await expireOverdueCoupons();
  const coupons = await Coupon.find({ status: "running" }).sort({ createdAt: -1 }).lean();
  if (!userId) return coupons;
  
  return Promise.all(
    coupons.map(async (c: any) => {
      let usedByCurrentUser = false;
      if (c.limitPerCustomer === 1) {
        const order = await Order.findOne({ 
          user: userId, 
          discountCode: new RegExp(`^${c.code}$`, "i"), 
          status: { $ne: "cancelled" } 
        });
        if (order) usedByCurrentUser = true;
      }
      return { ...c, usedByCurrentUser };
    })
  );
};

export const getCoupon = async (id: string) => {
  const coupon = await Coupon.findById(id)
    .populate("applicableCategories", "name slug")
    .populate("applicableProducts", "name slug image basePrice");
  if (!coupon) throw new ApiError(404, "Coupon not found");
  return coupon;
};

export const updateCoupon = async (id: string, payload: any) => {
  const coupon = await Coupon.findByIdAndUpdate(id, payload, { new: true, runValidators: true })
    .populate("applicableCategories", "name slug")
    .populate("applicableProducts", "name slug image basePrice");
  if (!coupon) throw new ApiError(404, "Coupon not found");
  return coupon;
};

export const updateCouponStatus = async (id: string, status: string) => {
  const coupon = await Coupon.findByIdAndUpdate(id, { status }, { new: true });
  if (!coupon) throw new ApiError(404, "Coupon not found");
  return coupon;
};

export const deleteCoupon = async (id: string) => {
  const coupon = await Coupon.findByIdAndDelete(id);
  if (!coupon) throw new ApiError(404, "Coupon not found");
  return coupon;
};

export const calculateDiscountForItems = async (coupon: any, items: any[]) => {
  // Find products to get their categories and prices if not provided
  const productIds = items.map((i) => i.productId);
  const products = await Product.find({ _id: { $in: productIds } }).populate("category");

  let eligibleSubtotal = 0;
  
  for (const item of items) {
    const product = products.find((p) => p._id.toString() === item.productId.toString());
    if (!product) continue;
    
    let isEligible = true;

    // Check exclude shuttlecocks
    if (coupon.excludeShuttlecocks) {
      const cat = product.category as any;
      if (cat && (cat.slug.includes("shuttle") || cat.slug.includes("qua-cau"))) {
        isEligible = false;
      }
    }

    // Check applyTo
    if (isEligible) {
      if (coupon.applyTo === "category" && coupon.applicableCategories && coupon.applicableCategories.length > 0) {
        const catId = (product.category as any)._id?.toString() || product.category.toString();
        const applicableCatIds = coupon.applicableCategories.map((c: any) => c.toString());
        if (!applicableCatIds.includes(catId)) {
          isEligible = false;
        }
      } else if (coupon.applyTo === "product" && coupon.applicableProducts && coupon.applicableProducts.length > 0) {
        const applicableProdIds = coupon.applicableProducts.map((p: any) => p.toString());
        if (!applicableProdIds.includes(product._id.toString())) {
          isEligible = false;
        }
      }
    }

    if (isEligible) {
      eligibleSubtotal += (item.price || product.basePrice) * item.quantity;
    }
  }

  // Check minimum order value against eligible subtotal
  if (coupon.minOrderValue && eligibleSubtotal < coupon.minOrderValue) {
    throw new ApiError(400, `Minimum eligible order value of $${coupon.minOrderValue} required`);
  }
  
  if (eligibleSubtotal === 0) {
    throw new ApiError(400, "No eligible items in cart for this coupon");
  }

  let discount = 0;
  if (coupon.discountType === "percent") {
    discount = (coupon.amount / 100) * eligibleSubtotal;
    if (coupon.maxDiscount && discount > coupon.maxDiscount) {
      discount = coupon.maxDiscount;
    }
  } else if (coupon.discountType === "amount" || coupon.discountType === "shipping") {
    discount = coupon.amount;
  }

  return { discount, eligibleSubtotal };
};

export const applyCoupon = async (code: string, subtotal: number, items: any[] = [], userId?: string) => {
  const coupon = await Coupon.findOne({ code: code.toUpperCase() });
  if (!coupon) throw new ApiError(404, "Coupon not found");
  if (coupon.startDate > new Date()) throw new ApiError(400, "Coupon is not yet active");
  if (coupon.expiresAt < new Date()) {
    // Auto-mark as completed if expired
    if (coupon.status === "running" || coupon.status === "waiting") {
      coupon.status = "completed";
      await coupon.save();
    }
    throw new ApiError(400, "Coupon expired");
  }
  if (coupon.status === "paused" || coupon.status === "completed") throw new ApiError(400, "Coupon is not active");
  if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit)
    throw new ApiError(400, "Coupon usage limit reached");
    
  if (coupon.customerTarget !== "all" || coupon.membershipTarget !== "all") {
    if (!userId) throw new ApiError(401, "You must be logged in to use this coupon.");
    const user = await User.findById(userId);
    if (!user) throw new ApiError(404, "User not found");
    
    // Check membership target
    if (coupon.membershipTarget !== "all") {
      const tiers = ["Bronze", "Silver", "Gold", "Diamond"];
      const userTierIdx = tiers.indexOf(user.membershipTier || "Bronze");
      const requiredTierIdx = tiers.indexOf(
        coupon.membershipTarget.charAt(0).toUpperCase() + coupon.membershipTarget.slice(1)
      );
      
      if (userTierIdx < requiredTierIdx) {
        throw new ApiError(403, `This coupon requires ${coupon.membershipTarget} membership or higher.`);
      }
    }

    // Check customer target
    if (coupon.customerTarget === "new") {
      const orderCount = await Order.countDocuments({ user: userId, status: { $ne: "cancelled" } });
      if (orderCount > 0) {
        throw new ApiError(403, "This coupon is only for new customers on their first purchase.");
      }
    } else if (coupon.customerTarget === "specific") {
      if (!coupon.specificCustomers || coupon.specificCustomers.length === 0) {
        throw new ApiError(403, "This coupon is for specific customers only.");
      }
      const isMatch = coupon.specificCustomers.some(identifier => 
        identifier === user.email || identifier === user.phone
      );
      if (!isMatch) {
        throw new ApiError(403, "You are not eligible to use this coupon.");
      }
    }
  }

  // Check limit per customer
  if (coupon.limitPerCustomer && coupon.limitPerCustomer < 999 && userId) {
    const userOrdersCount = await Order.countDocuments({
      user: userId,
      discountCode: new RegExp(`^${coupon.code}$`, "i"),
      status: { $ne: "cancelled" }
    });
    if (userOrdersCount >= coupon.limitPerCustomer) {
      throw new ApiError(403, `You have reached the usage limit for this coupon (${coupon.limitPerCustomer} time(s)).`);
    }
  }
    
  let discount = 0;
  let finalSubtotal = subtotal;

  if (items && items.length > 0) {
    const res = await calculateDiscountForItems(coupon, items);
    discount = res.discount;
  } else {
    // Fallback if no items provided
    if (coupon.minOrderValue && subtotal < coupon.minOrderValue)
      throw new ApiError(400, `Minimum order value of $${coupon.minOrderValue} required`);

    if (coupon.discountType === "percent") {
      discount = (coupon.amount / 100) * subtotal;
      if (coupon.maxDiscount && discount > coupon.maxDiscount) {
        discount = coupon.maxDiscount;
      }
    } else if (coupon.discountType === "amount" || coupon.discountType === "shipping") {
      discount = coupon.amount;
    }
  }

  return { discount, total: subtotal - discount };
};

/**
 * Auto-expire overdue coupons.
 * Called by the cron job and before listing coupons.
 */
export const expireOverdueCoupons = async () => {
  const result = await Coupon.updateMany(
    { status: { $in: ["running", "waiting"] }, expiresAt: { $lt: new Date() } },
    { $set: { status: "completed" } }
  );
  if (result.modifiedCount > 0) {
    console.log(`[Cron] Auto-expired ${result.modifiedCount} coupon(s)`);
  }
  return result.modifiedCount;
};

