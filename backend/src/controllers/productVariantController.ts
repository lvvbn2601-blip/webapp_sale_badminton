import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import * as ProductService from "../services/productService";
import { ok } from "../utils/apiResponse";

export const createVariant = asyncHandler(async (req: Request, res: Response) => {
  const variant = await ProductService.createVariant(req.body);
  res.status(201).json(ok(variant));
});

export const updateVariant = asyncHandler(async (req: Request, res: Response) => {
  const variant = await ProductService.updateVariant(req.params.id, req.body);
  res.json(ok(variant));
});

export const deleteVariant = asyncHandler(async (req: Request, res: Response) => {
  await ProductService.deleteVariant(req.params.id);
  res.json(ok(true, "Deleted"));
});
