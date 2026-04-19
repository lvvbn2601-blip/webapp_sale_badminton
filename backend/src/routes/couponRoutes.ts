import { Router } from "express";
import * as CouponController from "../controllers/couponController";
import { authenticate, authorize, optionalAuthenticate } from "../middlewares/auth";

const router = Router();

router.post("/", authenticate, authorize(["admin"]), CouponController.createCoupon);
router.get("/", authenticate, authorize(["admin"]), CouponController.listCoupons);
router.get("/public", optionalAuthenticate, CouponController.listPublicCoupons);
router.get("/:id", authenticate, authorize(["admin"]), CouponController.getCoupon);
router.put("/:id", authenticate, authorize(["admin"]), CouponController.updateCoupon);
router.patch("/:id/status", authenticate, authorize(["admin"]), CouponController.updateCouponStatus);
router.delete("/:id", authenticate, authorize(["admin"]), CouponController.deleteCoupon);
router.post("/apply", authenticate, CouponController.applyCoupon);

export default router;
