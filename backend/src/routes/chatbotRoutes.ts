import { Router } from "express";
import * as ChatbotController from "../controllers/chatbotController";

const router = Router();

router.post("/message", ChatbotController.message);
router.get("/recommend-products", ChatbotController.recommendProducts);
router.get("/product-info", ChatbotController.productInfo);

export default router;
