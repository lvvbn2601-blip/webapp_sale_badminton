import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import * as OrderService from "../services/orderService";
import { AuthRequest } from "../middlewares/auth";
import { ok } from "../utils/apiResponse";
import { ApiError } from "../utils/apiError";

export const createOrder = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new ApiError(401, "Unauthorized");
  const { items, shippingAddress, payment, recipientName, recipientPhone, discountCode } = req.body;
  if (!items || !items.length) {
    throw new ApiError(400, "Order must contain items");
  }
  const order = await OrderService.createOrder(
    req.user.sub, items, shippingAddress, payment, recipientName, recipientPhone, discountCode
  );
  res.status(201).json(ok(order));
});

export const listOrders = asyncHandler(async (req: AuthRequest, res: Response) => {
  const orders = await OrderService.listOrders(req.user?.role === "admin" ? undefined : req.user?.sub);
  
  // Attach latest payment info for each order
  const Payment = (await import("../models/Payment")).Payment;
  const orderIds = orders.map((o) => o._id);
  const payments = await Payment.find({ order: { $in: orderIds } })
    .sort({ createdAt: -1 })
    .lean();

  const paymentMap = new Map<string, any>();
  for (const p of payments) {
    const key = String(p.order);
    if (!paymentMap.has(key)) {
      paymentMap.set(key, {
        status: p.status,
        provider: p.provider,
        amount: p.amount,
        transactionId: p.transactionId,
        createdAt: (p as any).createdAt,
      });
    }
  }

  const result = orders.map((o) => {
    const obj = o.toJSON();
    const pm = paymentMap.get(String(o._id));
    return { ...obj, paymentInfo: pm || null };
  });

  res.json(ok(result));
});

export const getOrder = asyncHandler(async (req: AuthRequest, res: Response) => {
  const order = await OrderService.getOrder(req.params.id as string);
  if (!order) throw new ApiError(404, "Order not found");
  // Only allow owner or admin
  if (req.user?.role !== "admin" && String(order.user) !== req.user?.sub) {
    throw new ApiError(403, "Not authorized");
  }
  res.json(ok(order));
});

export const updateStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
  const order = await OrderService.updateStatus(req.params.id as string, req.body.status, req.user?.sub, req.body.reason);
  res.json(ok(order));
});

export const cancelOrder = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new ApiError(401, "Unauthorized");
  const orderId = String(req.body.orderId || req.params.id);
  const order = await OrderService.cancelOrder(orderId, req.user.sub);
  res.json(ok(order));
});

export const confirmReceipt = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new ApiError(401, "Unauthorized");
  const order = await OrderService.confirmReceipt(String(req.params.id), req.user.sub);
  res.json(ok(order));
});

export const requestReturn = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new ApiError(401, "Unauthorized");
  const { reason } = req.body;
  if (!reason) throw new ApiError(400, "Return reason is required");
  const order = await OrderService.requestReturn(String(req.params.id), req.user.sub, reason);
  res.json(ok(order));
});

export const requestRefund = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new ApiError(401, "Unauthorized");
  const { reason } = req.body;
  if (!reason) throw new ApiError(400, "Refund reason is required");
  const order = await OrderService.requestRefund(String(req.params.id), req.user.sub, reason);
  res.json(ok(order));
});

export const confirmRefund = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new ApiError(401, "Unauthorized");
  const result = await OrderService.confirmRefund(String(req.params.id), req.user.sub);
  res.json(ok(result));
});

export const rejectRefund = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new ApiError(401, "Unauthorized");
  const { reason } = req.body;
  const order = await OrderService.rejectRefund(String(req.params.id), req.user.sub, reason);
  res.json(ok(order));
});

export const updateTracking = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { trackingNumber, carrier } = req.body;
  if (!trackingNumber) throw new ApiError(400, "Tracking number is required");
  const order = await OrderService.updateTracking(String(req.params.id), trackingNumber, carrier);
  res.json(ok(order));
});

export const updateStringingStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { stringingStatus } = req.body;
  const order = await OrderService.updateStringingStatus(req.params.id as string, stringingStatus);
  res.json(ok(order));
});

