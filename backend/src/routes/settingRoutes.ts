import { Router } from "express";
import * as SettingController from "../controllers/settingController";
import { authenticate, authorize } from "../middlewares/auth";

const router = Router();

// Publicly readable so frontend checkout can use shipping fees
router.get("/", SettingController.getSettings);

// Only admin can update
router.put("/", authenticate, authorize(["admin"]), SettingController.updateSettings);

export default router;
