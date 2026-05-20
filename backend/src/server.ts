import app from "./app";
import { connectDB } from "./config/db";
import { env } from "./config/env";
import "./config/redis";
import "./services/trackingQueueManager";
import { segmentationService } from "./services/segmentationService";
import { scanPendingOrders } from "./services/orderService";
import { expireOverdueCoupons } from "./services/couponService";
import cron from "node-cron";

const start = async () => {
  await connectDB();

  // ── Cron: Run segmentation scheduled tasks every 5 minutes ──
  // Handles: Cart abandonment notifications, welcome voucher issuance
  cron.schedule("*/5 * * * *", async () => {
    try {
      await segmentationService.runScheduledTasks();
    } catch (err) {
      console.error("Segmentation scheduled tasks error:", err);
    }
  });

  // ── Cron: Run order scanning scheduled tasks every 1 minute ──
  // Handles: Unpaid pending order reminders and automatic cancellations
  cron.schedule("* * * * *", async () => {
    try {
      await scanPendingOrders();
    } catch (err) {
      console.error("Pending orders scanning error:", err);
    }
  });

  // ── Cron: Auto-expire overdue coupons every minute ──
  cron.schedule("* * * * *", async () => {
    try {
      await expireOverdueCoupons();
    } catch (err) {
      console.error("Coupon auto-expiry error:", err);
    }
  });

  app.listen(env.port, () => console.log(`API running on port ${env.port}`));
};

start();
