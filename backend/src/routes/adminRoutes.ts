import { Router } from "express";
import * as AdminController from "../controllers/adminController";
import { authenticate, authorize } from "../middlewares/auth";

const router = Router();

router.use(authenticate);

router.get("/dashboard", authorize(["admin"]), AdminController.dashboard);
router.get("/orders", authorize(["admin", "warehouse_staff", "knitter"]), AdminController.adminOrders);
router.get("/users", authorize(["admin"]), AdminController.adminUsers);
router.get("/revenue", authorize(["admin"]), AdminController.adminRevenue);
router.get("/products", authorize(["admin", "warehouse_staff"]), AdminController.adminProducts);

export default router;
