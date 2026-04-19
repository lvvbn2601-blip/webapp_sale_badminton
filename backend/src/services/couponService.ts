import { Coupon } from "../models/Coupon";
import { Order } from "../models/Order";
import { ApiError } from "../utils/apiError";

export const createCoupon = (payload: any) => Coupon.create(payload);
export const listCoupons = () => Coupon.find().sort({ createdAt: -1 });
export const listPublicCoupons = async (userId?: string) => {
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
  const coupon = await Coupon.findById(id);
  if (!coupon) throw new ApiError(404, "Coupon not found");
  return coupon;
};

export const updateCoupon = async (id: string, payload: any) => {
  const coupon = await Coupon.findByIdAndUpdate(id, payload, { new: true, runValidators: true });
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

export const applyCoupon = async (code: string, subtotal: number) => {
  const coupon = await Coupon.findOne({ code: code.toUpperCase() });
  if (!coupon) throw new ApiError(404, "Coupon not found");
  if (coupon.expiresAt < new Date()) throw new ApiError(400, "Coupon expired");
  if (coupon.status === "paused" || coupon.status === "completed") throw new ApiError(400, "Coupon is not active");
  if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit)
    throw new ApiError(400, "Coupon usage limit reached");
  if (coupon.minOrderValue && subtotal < coupon.minOrderValue)
    throw new ApiError(400, `Minimum order value of $${coupon.minOrderValue} required`);

  let discount = 0;
  if (coupon.discountType === "percent") {
    discount = (coupon.amount / 100) * subtotal;
    if (coupon.maxDiscount && discount > coupon.maxDiscount) {
      discount = coupon.maxDiscount;
    }
  } else if (coupon.discountType === "amount" || coupon.discountType === "shipping") {
    // shipping is usually subtotal independent but bounded by maxDiscount if provided.
    discount = coupon.amount;
  }

  // NOTE: usage is typically incremented during checkout, not just application.
  // We'll leave it as is for the basic mock requirement, normally done on Order Place.

  return { discount, total: subtotal - discount };
};
