import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import * as ChatbotService from "../services/chatbotService";
import { ok } from "../utils/apiResponse";

export const message = asyncHandler(async (req: Request, res: Response) => {
  const { message } = req.body;
  const reply = `You said: ${message}. We'll connect you with a gear expert soon.`;
  await ChatbotService.logMessage({ user: (req as any).user?.sub, message, response: reply });
  res.json(ok({ reply }));
});

export const recommendProducts = asyncHandler(async (_req: Request, res: Response) => {
  const recommendations = ChatbotService.recommendProducts();
  res.json(ok(recommendations));
});

export const productInfo = asyncHandler(async (req: Request, res: Response) => {
  const info = ChatbotService.productInfo(req.query.id as string);
  res.json(ok(info));
});
