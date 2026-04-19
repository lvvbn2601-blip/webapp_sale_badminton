import { Router } from "express";
import * as CategoryController from "../controllers/categoryController";
import { authenticate, authorize } from "../middlewares/auth";

const router = Router();

router.get("/", CategoryController.listCategories);
router.post("/", authenticate, authorize(["admin"]), CategoryController.createCategory);
router.put("/:id", authenticate, authorize(["admin"]), CategoryController.updateCategory);
router.delete("/:id", authenticate, authorize(["admin"]), CategoryController.deleteCategory);

export default router;
