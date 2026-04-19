import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import * as PaymentService from "../services/paymentService";
import { ok } from "../utils/apiResponse";
import { ApiError } from "../utils/apiError";
import { Payment } from "../models/Payment";
import { AuthRequest } from "../middlewares/auth";
import { env } from "../config/env";

// ── VNPay ───────────────────────────────────────────────

/** Create VNPay payment URL for an order */
export const createVnPayPayment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { orderId, amount } = req.body;
  if (!orderId || !amount) throw new ApiError(400, "orderId and amount are required");
  const url = await PaymentService.createVnPayUrl(orderId, amount, req.ip || "127.0.0.1");
  res.json(ok({ paymentUrl: url }));
});

/** VNPay return callback (redirect from VNPay) */
export const vnpayReturn = asyncHandler(async (req: Request, res: Response) => {
  const result = await PaymentService.verifyVnPayReturn(req.query as Record<string, any>);
  // Redirect to frontend with status
  const redirectUrl = `${env.clientUrl}/checkout?payment_status=vnpay&result=${result.status}&orderId=${result.orderId}`;
  res.redirect(redirectUrl);
});

/** VNPay IPN (server-to-server notification) */
export const vnpayIPN = asyncHandler(async (req: Request, res: Response) => {
  const result = await PaymentService.verifyVnPayReturn(req.query as Record<string, any>);
  res.json({ RspCode: result.isValid && result.status === "success" ? "00" : "97", Message: result.status });
});

// ── MoMo ────────────────────────────────────────────────

/** Create MoMo payment for an order */
export const createMoMoPayment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { orderId, amount } = req.body;
  if (!orderId || !amount) throw new ApiError(400, "orderId and amount are required");
  const result = await PaymentService.createMoMoPayment(orderId, amount);
  res.json(ok(result));
});

/** MoMo IPN (server-to-server notification) */
export const momoIPN = asyncHandler(async (req: Request, res: Response) => {
  const result = await PaymentService.verifyMoMoIPN(req.body);
  res.json({ resultCode: result.isValid && result.status === "success" ? 0 : 1 });
});

/** MoMo return callback (redirect from MoMo) */
export const momoReturn = asyncHandler(async (req: Request, res: Response) => {
  const { orderId, resultCode } = req.query;
  const status = resultCode === "0" ? "success" : "failed";
  const redirectUrl = `${env.clientUrl}/checkout?payment_status=momo&result=${status}&orderId=${orderId}`;
  res.redirect(redirectUrl);
});

// ── Common ──────────────────────────────────────────────

/** Check payment status by orderId */
export const getPaymentStatus = asyncHandler(async (req: Request, res: Response) => {
  const payment = await PaymentService.getPaymentStatus(req.query.orderId as string);
  res.json(ok(payment));
});

/** Simulate payment success (for sandbox/demo mode) */
export const simulatePayment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { orderId, provider } = req.body;
  if (!orderId || !provider) throw new ApiError(400, "orderId and provider are required");
  const result = await PaymentService.simulatePaymentSuccess(orderId, provider);
  res.json(ok(result));
});
