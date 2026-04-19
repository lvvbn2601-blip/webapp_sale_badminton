import { Router } from "express";
import * as PaymentController from "../controllers/paymentController";
import { authenticate } from "../middlewares/auth";

const router = Router();

// ── VNPay ─────────────────────────────────────
router.post("/vnpay/create", authenticate, PaymentController.createVnPayPayment);
router.get("/vnpay-return", PaymentController.vnpayReturn);
router.get("/vnpay-ipn", PaymentController.vnpayIPN);

// ── MoMo ──────────────────────────────────────
router.post("/momo/create", authenticate, PaymentController.createMoMoPayment);
router.post("/momo-ipn", PaymentController.momoIPN);
router.get("/momo-return", PaymentController.momoReturn);

// ── Common ────────────────────────────────────
router.get("/status", PaymentController.getPaymentStatus);
router.post("/simulate", authenticate, PaymentController.simulatePayment);

// Legacy aliases (backward compatibility)
router.post("/create", authenticate, PaymentController.createVnPayPayment);
router.post("/callback", PaymentController.vnpayReturn);

export default router;
