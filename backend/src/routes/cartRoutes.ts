import { Router } from "express";
import * as CartController from "../controllers/cartController";
import { authenticate } from "../middlewares/auth";

const router = Router();

router.get("/", authenticate, CartController.getCart);
router.post("/add", authenticate, CartController.addItem);
router.put("/update", authenticate, CartController.updateItem);
router.delete("/remove", authenticate, CartController.removeItem);
router.delete("/clear", authenticate, CartController.clearCart);
router.post("/sync", authenticate, CartController.syncCart);

export default router;
