import { Cart } from "../models/Cart";
import { CartItem } from "../models/CartItem";
import { Product } from "../models/Product";
import { ApiError } from "../utils/apiError";

/* ── helpers ──────────────────────────────────────── */
const ensureCart = async (userId: string) => {
  let cart = await Cart.findOne({ user: userId });
  if (!cart) cart = await Cart.create({ user: userId, items: [], subtotal: 0 });
  return cart;
};

const recalcSubtotal = async (cartId: string) => {
  const items = await CartItem.find({ cart: cartId });
  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  await Cart.findByIdAndUpdate(cartId, { subtotal });
};

const populateCart = async (userId: string) => {
  const cart = await ensureCart(userId);
  await cart.populate({
    path: "items",
    populate: {
      path: "product",
      select: "name slug image basePrice category brand rating stock",
      populate: [
        { path: "category", select: "name slug" },
        { path: "brand", select: "name slug" },
      ],
    },
  });
  return cart;
};

/* ── public API ───────────────────────────────────── */

export const getCart = async (userId: string) => {
  return populateCart(userId);
};

export const addToCart = async (userId: string, productId: string, quantity: number) => {
  const product = await Product.findById(productId);
  if (!product) throw new ApiError(404, "Product not found");

  const cart = await ensureCart(userId);

  const existingItem = await CartItem.findOne({ cart: cart._id, product: productId });
  if (existingItem) {
    existingItem.quantity += quantity;
    await existingItem.save();
  } else {
    const item = await CartItem.create({
      cart: cart._id,
      product: productId,
      quantity,
      price: product.basePrice,
    });
    cart.items.push(item._id);
    await cart.save();
  }

  await recalcSubtotal(String(cart._id));
  return populateCart(userId);
};

export const updateCartItem = async (userId: string, productId: string, quantity: number) => {
  const cart = await ensureCart(userId);
  const item = await CartItem.findOne({ cart: cart._id, product: productId });
  if (!item) throw new ApiError(404, "Item not found in cart");

  if (quantity <= 0) {
    await CartItem.deleteOne({ _id: item._id });
    cart.items = cart.items.filter((id) => id.toString() !== item._id!.toString());
    await cart.save();
  } else {
    item.quantity = quantity;
    await item.save();
  }

  await recalcSubtotal(String(cart._id));
  return populateCart(userId);
};

export const removeCartItem = async (userId: string, productId: string) => {
  const cart = await ensureCart(userId);
  const item = await CartItem.findOne({ cart: cart._id, product: productId });
  if (!item) throw new ApiError(404, "Item not found in cart");

  await CartItem.deleteOne({ _id: item._id });
  cart.items = cart.items.filter((id) => id.toString() !== item._id!.toString());
  await cart.save();
  await recalcSubtotal(String(cart._id));
  return populateCart(userId);
};

export const clearCart = async (userId: string) => {
  const cart = await ensureCart(userId);
  await CartItem.deleteMany({ cart: cart._id });
  cart.items = [];
  cart.subtotal = 0;
  await cart.save();
  return cart;
};

/**
 * Sync a batch of items from the client (merge localStorage cart into server cart on login).
 * Each item: { productId, quantity }
 */
export const syncCart = async (userId: string, clientItems: { productId: string; quantity: number }[]) => {
  const cart = await ensureCart(userId);

  for (const ci of clientItems) {
    const product = await Product.findById(ci.productId);
    if (!product) continue; // skip invalid products

    const existingItem = await CartItem.findOne({ cart: cart._id, product: ci.productId });
    if (existingItem) {
      // Keep the higher quantity (merge strategy)
      existingItem.quantity = Math.max(existingItem.quantity, ci.quantity);
      await existingItem.save();
    } else {
      const item = await CartItem.create({
        cart: cart._id,
        product: ci.productId,
        quantity: ci.quantity,
        price: product.basePrice,
      });
      cart.items.push(item._id);
    }
  }

  await cart.save();
  await recalcSubtotal(String(cart._id));
  return populateCart(userId);
};
