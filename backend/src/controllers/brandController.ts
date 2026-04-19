import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { Brand } from "../models/Brand";
import { ok } from "../utils/apiResponse";

export const listBrands = asyncHandler(async (_req: Request, res: Response) => {
  const brands = await Brand.find();
  res.json(ok(brands));
});

export const createBrand = asyncHandler(async (req: Request, res: Response) => {
  const brand = await Brand.create(req.body);
  res.status(201).json(ok(brand));
});

export const updateBrand = asyncHandler(async (req: Request, res: Response) => {
  const brand = await Brand.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(ok(brand));
});

export const deleteBrand = asyncHandler(async (req: Request, res: Response) => {
  await Brand.findByIdAndDelete(req.params.id);
  res.json(ok(true, "Deleted"));
});
