import { Router } from "express";
import * as WishlistController from "../controllers/wishlistController";
import { authenticate } from "../middlewares/auth";

const router = Router();

router.get("/", authenticate, WishlistController.getWishlist);
router.post("/add", authenticate, WishlistController.addWishlist);
router.delete("/remove", authenticate, WishlistController.removeWishlist);

export default router;
