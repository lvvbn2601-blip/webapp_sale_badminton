import { Router } from "express";
import * as NotificationController from "../controllers/notificationController";
import { authenticate } from "../middlewares/auth";

const router = Router();

router.get("/", authenticate, NotificationController.getNotifications);
router.get("/unread-count", authenticate, NotificationController.getUnreadCount);
router.put("/:id/read", authenticate, NotificationController.markAsRead);
router.put("/read-all", authenticate, NotificationController.markAllAsRead);

export default router;
