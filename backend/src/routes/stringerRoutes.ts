import { Router } from "express";
import * as StringerController from "../controllers/stringerController";
import * as StringSpoolController from "../controllers/stringSpoolController";
import { authenticate, authorize } from "../middlewares/auth";

const router = Router();

// ── String Inventory (Spools) ──
router.get("/spools", StringSpoolController.listSpools);
router.post("/spools", authenticate, authorize(["admin"]), StringSpoolController.createSpool);
router.put("/spools/:id/meters", authenticate, authorize(["admin"]), StringSpoolController.updateSpoolMeters);
router.delete("/spools/:id", authenticate, authorize(["admin"]), StringSpoolController.deleteSpool);

// ── Stringer Management (Admin only) ──
router.get("/", authenticate, authorize(["admin"]), StringerController.listStringers);
router.post("/", authenticate, authorize(["admin"]), StringerController.createStringer);
router.get("/performance", authenticate, authorize(["admin"]), StringerController.getPerformanceOverview);
router.get("/:id", authenticate, authorize(["admin"]), StringerController.getStringer);
router.put("/:id", authenticate, authorize(["admin"]), StringerController.updateStringer);
router.delete("/:id", authenticate, authorize(["admin"]), StringerController.deleteStringer);
router.get("/:id/stats", authenticate, authorize(["admin"]), StringerController.getStringerStats);
router.post("/:id/level-up", authenticate, authorize(["admin"]), StringerController.approveLevelUp);

// ── Stringing Tasks (Admin / Knitter) ──
router.get("/tasks/all", authenticate, authorize(["admin", "knitter"]), StringerController.listTasks);
router.post("/tasks", authenticate, authorize(["admin"]), StringerController.createTask);
router.put("/tasks/:id/start", authenticate, authorize(["admin", "knitter"]), StringerController.startTask);
router.put("/tasks/:id/assign", authenticate, authorize(["admin"]), StringerController.assignTask);
router.put("/tasks/:id/complete", authenticate, authorize(["admin", "knitter"]), StringerController.completeTask);
router.put("/tasks/:id/rate", authenticate, StringerController.rateTask);
router.post("/tasks/auto-assign", authenticate, authorize(["admin"]), StringerController.autoAssignPending);

// ── Customer-facing (any authenticated user) ──
router.post("/tasks/book", authenticate, StringerController.bookStringingService);
router.get("/tasks/my", authenticate, StringerController.getMyTasks);

export default router;
