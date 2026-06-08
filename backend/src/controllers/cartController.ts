import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import * as CartService from "../services/cartService";
import { AuthRequest } from "../middlewares/auth";
import { ok } from "../utils/apiResponse";
import { ApiError } from "../utils/apiError";

export const getCart = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new ApiError(401, "Unauthorized");
  const cart = await CartService.getCart(req.user.sub);
  res.json(ok(cart));
});

export const addItem = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new ApiError(401, "Unauthorized");
  const { productId, quantity, variantOptions } = req.body;
  if (!productId) throw new ApiError(400, "productId is required");
  const cart = await CartService.addToCart(req.user.sub, productId, quantity || 1, variantOptions);
  res.json(ok(cart));
});

export const updateItem = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new ApiError(401, "Unauthorized");
  const { productId, quantity, variantOptions } = req.body;
  if (!productId) throw new ApiError(400, "productId is required");
  const cart = await CartService.updateCartItem(req.user.sub, productId, quantity, variantOptions);
  res.json(ok(cart));
});

export const removeItem = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new ApiError(401, "Unauthorized");
  const { productId, variantOptions } = req.body;
  if (!productId) throw new ApiError(400, "productId is required");
  const cart = await CartService.removeCartItem(req.user.sub, productId, variantOptions);
  res.json(ok(cart));
});

export const clearCart = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new ApiError(401, "Unauthorized");
  const cart = await CartService.clearCart(req.user.sub);
  res.json(ok(cart));
});

export const syncCart = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new ApiError(401, "Unauthorized");
  const { items } = req.body;
  if (!Array.isArray(items)) throw new ApiError(400, "items must be an array");
  const cart = await CartService.syncCart(req.user.sub, items);
  res.json(ok(cart));
});
