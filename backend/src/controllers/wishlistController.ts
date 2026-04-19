import { Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import * as WishlistService from "../services/wishlistService";
import { AuthRequest } from "../middlewares/auth";
import { ApiError } from "../utils/apiError";
import { ok } from "../utils/apiResponse";

export const getWishlist = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new ApiError(401, "Unauthorized");
  const wishlist = await WishlistService.getWishlist(req.user.sub);
  res.json(ok(wishlist));
});

export const addWishlist = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new ApiError(401, "Unauthorized");
  const wishlist = await WishlistService.addToWishlist(req.user.sub, req.body.productId);
  res.json(ok(wishlist));
});

export const removeWishlist = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new ApiError(401, "Unauthorized");
  const wishlist = await WishlistService.removeFromWishlist(req.user.sub, req.body.productId);
  res.json(ok(wishlist));
});
