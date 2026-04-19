import app from "./app";
import { connectDB } from "./config/db";
import { env } from "./config/env";
import "./config/redis";
import "./services/trackingQueueManager";
import { segmentationService } from "./services/segmentationService";

const start = async () => {
  await connectDB();

  // ── Cron: Run segmentation scheduled tasks every 5 minutes ──
  // Handles: Cart abandonment notifications, welcome voucher issuance
  setInterval(async () => {
    try {
      await segmentationService.runScheduledTasks();
    } catch (err) {
      console.error('Segmentation scheduled tasks error:', err);
    }
  }, 5 * 60 * 1000); // Every 5 minutes

  app.listen(env.port, () => console.log(`API running on port ${env.port}`));
};

start();
