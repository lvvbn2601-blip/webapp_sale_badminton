import { Router } from "express";
import * as BrandController from "../controllers/brandController";
import { authenticate, authorize } from "../middlewares/auth";

const router = Router();

router.get("/", BrandController.listBrands);
router.post("/", authenticate, authorize(["admin"]), BrandController.createBrand);
router.put("/:id", authenticate, authorize(["admin"]), BrandController.updateBrand);
router.delete("/:id", authenticate, authorize(["admin"]), BrandController.deleteBrand);

export default router;
