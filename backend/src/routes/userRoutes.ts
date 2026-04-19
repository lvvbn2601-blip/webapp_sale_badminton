import { Router } from "express";
import * as UserController from "../controllers/userController";
import { authenticate, authorize } from "../middlewares/auth";

const router = Router();

router.get("/", authenticate, authorize(["admin"]), UserController.listUsers);
router.post("/", authenticate, authorize(["admin"]), UserController.createUser);
router.get("/profile", authenticate, UserController.getProfile);
router.put("/profile", authenticate, UserController.updateProfile);

router.get("/:id", authenticate, authorize(["admin"]), UserController.getUser);
router.put("/:id", authenticate, authorize(["admin"]), UserController.updateAdminUser);
router.post("/:id/give-voucher", authenticate, authorize(["admin"]), UserController.giveVoucher);
router.post("/:id/add-points", authenticate, authorize(["admin"]), UserController.addPoints);
router.delete("/:id", authenticate, authorize(["admin"]), UserController.deleteUser);

export default router;
