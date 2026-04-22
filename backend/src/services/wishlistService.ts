import { Wishlist } from "../models/Wishlist";
import { ApiError } from "../utils/apiError";

const ensureWishlist = async (userId: string) => {
  let wishlist = await Wishlist.findOne({ user: userId });
  if (!wishlist) wishlist = await Wishlist.create({ user: userId, products: [] });
  return wishlist;
};

export const getWishlist = async (userId: string) => {
  const wishlist = await ensureWishlist(userId);
  return wishlist.populate("products");
};

export const addToWishlist = async (userId: string, productId: string) => {
  const wishlist = await ensureWishlist(userId);
  if (!wishlist.products.some((p) => p.toString() === productId)) {
    wishlist.products.push(productId as any);
    await wishlist.save();
  }
  return wishlist.populate("products");
};

export const removeFromWishlist = async (userId: string, productId: string) => {
  const wishlist = await ensureWishlist(userId);
  wishlist.products = wishlist.products.filter((p) => p.toString() !== productId);
  await wishlist.save();
  return wishlist.populate("products");
};
