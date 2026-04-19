import { Router } from "express";
import * as OrderController from "../controllers/orderController";
import { authenticate, authorize } from "../middlewares/auth";

const router = Router();

router.post("/", authenticate, OrderController.createOrder);
router.get("/", authenticate, OrderController.listOrders);
router.get("/:id", authenticate, OrderController.getOrder);

// User actions
router.post("/:id/cancel", authenticate, OrderController.cancelOrder);
router.post("/:id/confirm-receipt", authenticate, OrderController.confirmReceipt);
router.post("/:id/request-return", authenticate, OrderController.requestReturn);

// Admin actions
router.put("/:id/status", authenticate, authorize(["admin", "warehouse_staff"]), OrderController.updateStatus);
router.put("/:id/tracking", authenticate, authorize(["admin", "warehouse_staff"]), OrderController.updateTracking);
router.put("/:id/stringing", authenticate, authorize(["admin", "warehouse_staff", "knitter"]), OrderController.updateStringingStatus);

// Legacy cancel route
router.post("/cancel", authenticate, OrderController.cancelOrder);

export default router;
