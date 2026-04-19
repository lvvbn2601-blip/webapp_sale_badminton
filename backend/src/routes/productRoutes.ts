import { Router } from "express";
import * as ProductController from "../controllers/productController";
import * as VariantController from "../controllers/productVariantController";
import { authenticate, authorize } from "../middlewares/auth";

const router = Router();

router.get("/", ProductController.listProducts);
router.get("/search", ProductController.searchProducts);
router.get("/trending", ProductController.trending);
router.get("/best-sellers", ProductController.bestSellers);
router.get("/category/:id", ProductController.listByCategory);
router.get("/slug/:slug", ProductController.getProductBySlug);
router.get("/:id", ProductController.getProduct);

router.post("/", authenticate, authorize(["admin", "warehouse_staff"]), ProductController.createProduct);
router.put("/:id", authenticate, authorize(["admin", "warehouse_staff"]), ProductController.updateProduct);
router.delete("/:id", authenticate, authorize(["admin", "warehouse_staff"]), ProductController.deleteProduct);

router.post("/variants", authenticate, authorize(["admin", "warehouse_staff"]), VariantController.createVariant);
router.put("/variants/:id", authenticate, authorize(["admin", "warehouse_staff"]), VariantController.updateVariant);
router.delete("/variants/:id", authenticate, authorize(["admin", "warehouse_staff"]), VariantController.deleteVariant);

export default router;
