import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import * as ProductService from "../services/productService";
import { Product } from "../models/Product";
import { BehaviorLog } from "../models/BehaviorLog";
import { Order } from "../models/Order";
import { OrderItem } from "../models/OrderItem";
import { ok } from "../utils/apiResponse";
import { ApiError } from "../utils/apiError";
import { cacheGet, cacheSet } from "../utils/cache";

export const listProducts = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, category, brand, search } = req.query;
  const result = await ProductService.listProducts({
    page: Number(page) || 1,
    limit: Number(limit) || 12,
    category: category as string,
    brand: brand as string,
    search: search as string,
  });
  res.json(ok(result));
});

export const getProduct = asyncHandler(async (req: Request, res: Response) => {
  const product = await ProductService.getProduct(req.params.id);
  res.json(ok(product));
});

export const getProductBySlug = asyncHandler(async (req: Request, res: Response) => {
  const product = await Product.findOne({ slug: req.params.slug }).populate("category brand");
  if (!product) throw new ApiError(404, "Product not found");
  res.json(ok(product));
});

export const createProduct = asyncHandler(async (req: Request, res: Response) => {
  const product = await ProductService.createProduct(req.body);
  res.status(201).json(ok(product));
});

export const updateProduct = asyncHandler(async (req: Request, res: Response) => {
  const product = await ProductService.updateProduct(req.params.id, req.body);
  res.json(ok(product));
});

export const deleteProduct = asyncHandler(async (req: Request, res: Response) => {
  await ProductService.deleteProduct(req.params.id);
  res.json(ok(true, "Deleted"));
});

export const searchProducts = asyncHandler(async (req: Request, res: Response) => {
  const { q } = req.query;
  if (!q) throw new ApiError(400, "Missing query");
  const result = await ProductService.listProducts({ search: q as string });
  res.json(ok(result));
});

export const listByCategory = asyncHandler(async (req: Request, res: Response) => {
  const result = await Product.find({ category: req.params.id }).populate("category brand");
  res.json(ok(result));
});

/**
 * Trending products — ranked by real search/view/click volume from BehaviorLog.
 * Aggregates view + click actions on products, weighted:
 *   view = 1 point, click = 2 points, add_to_cart = 3 points
 * Falls back to isTrending flag if no behavioral data exists.
 */
export const trending = asyncHandler(async (_req: Request, res: Response) => {
  const CACHE_KEY = "homepage:trending";
  const cached = await cacheGet<any[]>(CACHE_KEY);
  if (cached) return res.json(ok(cached));

  // Aggregate behavior logs from the last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const pipeline = await BehaviorLog.aggregate([
    {
      $match: {
        action: { $in: ["view", "click", "add_to_cart"] },
        entityType: "product",
        entityId: { $ne: null },
        timestamp: { $gte: thirtyDaysAgo },
      },
    },
    {
      $group: {
        _id: "$entityId",
        score: {
          $sum: {
            $switch: {
              branches: [
                { case: { $eq: ["$action", "view"] }, then: 1 },
                { case: { $eq: ["$action", "click"] }, then: 2 },
                { case: { $eq: ["$action", "add_to_cart"] }, then: 3 },
              ],
              default: 1,
            },
          },
        },
        viewCount: {
          $sum: { $cond: [{ $eq: ["$action", "view"] }, 1, 0] },
        },
        clickCount: {
          $sum: { $cond: [{ $eq: ["$action", "click"] }, 1, 0] },
        },
      },
    },
    { $sort: { score: -1 } },
    { $limit: 12 },
  ]);

  let result;

  if (pipeline.length > 0) {
    // Fetch product details for the top trending product IDs
    const productIds = pipeline.map((p: any) => p._id);
    const products = await Product.find({ _id: { $in: productIds }, status: "active" })
      .populate("category brand");

    // Preserve the score-based ordering
    const productMap = new Map(products.map((p) => [p._id.toString(), p]));
    result = productIds
      .map((id: any) => productMap.get(id.toString()))
      .filter(Boolean);
  } else {
    // Fallback: use the static isTrending flag
    result = await Product.find({ isTrending: true, status: "active" })
      .populate("category brand")
      .limit(10);
  }

  await cacheSet(CACHE_KEY, result, 300); // Cache for 5 minutes
  res.json(ok(result));
});

/**
 * Best-selling products — ranked by total quantity sold across orders
 * with status "received" (successfully delivered to customer).
 * Falls back to isBestSeller flag if no order data exists.
 */
export const bestSellers = asyncHandler(async (_req: Request, res: Response) => {
  const CACHE_KEY = "homepage:best-sellers";
  const cached = await cacheGet<any[]>(CACHE_KEY);
  if (cached) return res.json(ok(cached));

  // Step 1: Find all orders with status "received"
  const receivedOrders = await Order.find({ status: "received" }).select("_id");
  const orderIds = receivedOrders.map((o) => o._id);

  let result;

  if (orderIds.length > 0) {
    // Step 2: Aggregate order items by product, sum quantities
    const pipeline = await OrderItem.aggregate([
      { $match: { order: { $in: orderIds } } },
      {
        $group: {
          _id: "$product",
          totalSold: { $sum: "$quantity" },
          orderCount: { $sum: 1 },
        },
      },
      { $sort: { totalSold: -1 } },
      { $limit: 12 },
    ]);

    if (pipeline.length > 0) {
      const productIds = pipeline.map((p: any) => p._id);
      const products = await Product.find({ _id: { $in: productIds }, status: "active" })
        .populate("category brand");

      // Preserve sales-based ordering
      const productMap = new Map(products.map((p) => [p._id.toString(), p]));
      result = productIds
        .map((id: any) => productMap.get(id.toString()))
        .filter(Boolean);
    } else {
      result = await Product.find({ isBestSeller: true, status: "active" })
        .populate("category brand")
        .limit(10);
    }
  } else {
    // Fallback: use the static isBestSeller flag
    result = await Product.find({ isBestSeller: true, status: "active" })
      .populate("category brand")
      .limit(10);
  }

  await cacheSet(CACHE_KEY, result, 300); // Cache for 5 minutes
  res.json(ok(result));
});
