import { Router } from "express";
import * as ReviewController from "../controllers/reviewController";
import { authenticate, authorize } from "../middlewares/auth";

const router = Router();

router.post("/", authenticate, ReviewController.createReview);
router.get("/featured", ReviewController.listFeatured);
router.get("/user/me", authenticate, ReviewController.listByUser);
router.get("/product/:id", ReviewController.listByProduct);
router.put("/:id", authenticate, ReviewController.updateReview);
router.delete("/:id", authenticate, ReviewController.deleteReview);
router.post("/:id/helpful", authenticate, ReviewController.markHelpful);

// ── Admin review routes ─────────────────────────────────────────
router.get("/admin/all", authenticate, authorize(["admin"]), ReviewController.adminListAll);
router.put("/admin/:id/status", authenticate, authorize(["admin"]), ReviewController.adminUpdateStatus);
router.put("/admin/:id/reply", authenticate, authorize(["admin"]), ReviewController.adminReply);
router.put("/admin/:id/featured", authenticate, authorize(["admin"]), ReviewController.adminToggleFeatured);
router.post("/admin/bulk", authenticate, authorize(["admin"]), ReviewController.adminBulkUpdate);
router.get("/admin/export-csv", authenticate, authorize(["admin"]), ReviewController.adminExportCsv);
router.delete("/admin/:id", authenticate, authorize(["admin"]), ReviewController.deleteReview);

export default router;

