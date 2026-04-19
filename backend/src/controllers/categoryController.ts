import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { Category } from "../models/Category";
import { ok } from "../utils/apiResponse";

export const listCategories = asyncHandler(async (_req: Request, res: Response) => {
  const categories = await Category.find();
  res.json(ok(categories));
});

export const createCategory = asyncHandler(async (req: Request, res: Response) => {
  const category = await Category.create(req.body);
  res.status(201).json(ok(category));
});

export const updateCategory = asyncHandler(async (req: Request, res: Response) => {
  const category = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(ok(category));
});

export const deleteCategory = asyncHandler(async (req: Request, res: Response) => {
  await Category.findByIdAndDelete(req.params.id);
  res.json(ok(true, "Deleted"));
});
