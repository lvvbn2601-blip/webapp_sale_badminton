import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import * as CouponService from "../services/couponService";
import { ok } from "../utils/apiResponse";

export const createCoupon = asyncHandler(async (req: Request, res: Response) => {
  const coupon = await CouponService.createCoupon(req.body);
  res.status(201).json(ok(coupon));
});

export const listCoupons = asyncHandler(async (_req: Request, res: Response) => {
  const coupons = await CouponService.listCoupons();
  res.json(ok(coupons));
});

export const listPublicCoupons = asyncHandler(async (req: any, res: Response) => {
  const coupons = await CouponService.listPublicCoupons(req.user?.sub);
  res.json(ok(coupons));
});

export const getCoupon = asyncHandler(async (req: Request, res: Response) => {
  const coupon = await CouponService.getCoupon(req.params.id as string);
  res.json(ok(coupon));
});

export const updateCoupon = asyncHandler(async (req: Request, res: Response) => {
  const coupon = await CouponService.updateCoupon(req.params.id as string, req.body);
  res.json(ok(coupon));
});

export const updateCouponStatus = asyncHandler(async (req: Request, res: Response) => {
  const coupon = await CouponService.updateCouponStatus(req.params.id as string, req.body.status);
  res.json(ok(coupon));
});

export const deleteCoupon = asyncHandler(async (req: Request, res: Response) => {
  await CouponService.deleteCoupon(req.params.id as string);
  res.status(204).send();
});

export const applyCoupon = asyncHandler(async (req: Request, res: Response) => {
  const { code, subtotal, items } = req.body;
  const result = await CouponService.applyCoupon(code, subtotal, items, (req as any).user?.sub);
  res.json(ok(result));
});
