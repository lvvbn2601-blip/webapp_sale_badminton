import { Product } from "../models/Product";
import { ProductVariant } from "../models/ProductVariant";
import { cacheGet, cacheSet, cacheDel } from "../utils/cache";
import { ApiError } from "../utils/apiError";
import { Types } from "mongoose";
import { buildSearchFilter, toSearchKey } from "../utils/vietnameseSearch";

export const listProducts = async (query: {
  page?: number;
  limit?: number;
  category?: string;
  brand?: string;
  search?: string;
}) => {
  const page = query.page || 1;
  const limit = query.limit || 12;
  // Normalise search term for a stable cache key regardless of accent/spacing
  const normalisedSearch = query.search ? toSearchKey(query.search) : "";
  const cacheKey = `products:${page}:${limit}:${query.category || "all"}:${query.brand || "all"}:${normalisedSearch}`;

  const cached = await cacheGet<{ data: unknown; total: number }>(cacheKey);
  if (cached) return cached;

  const filter: Record<string, unknown> = {};
  if (query.category) filter.category = new Types.ObjectId(query.category);
  if (query.brand) filter.brand = new Types.ObjectId(query.brand);

  // Vietnamese-aware accent/space-insensitive search
  if (query.search) {
    const searchFilter = buildSearchFilter(query.search);
    Object.assign(filter, searchFilter);
  }

  const [data, total] = await Promise.all([
    Product.find(filter).populate("category brand").skip((page - 1) * limit).limit(limit),
    Product.countDocuments(filter),
  ]);

  await cacheSet(cacheKey, { data, total }, 120);
  return { data, total };
};

export const getProduct = async (id: string) => {
  const product = await Product.findById(id).populate("category brand");
  if (!product) throw new ApiError(404, "Product not found");
  return product;
};

export const createProduct = async (payload: any) => {
  const clean = pickProductPayload(payload);
  if (!clean.name || !clean.slug || !clean.description || !clean.category || !clean.brand) {
    throw new ApiError(400, "Missing required fields");
  }
  const exists = await Product.findOne({ slug: clean.slug });
  if (exists) throw new ApiError(400, "Slug already exists");
  const product = await Product.create(clean);
  await cacheDel("products:*");
  return product;
};

export const updateProduct = async (id: string, payload: any) => {
  const clean = pickProductPayload(payload, { partial: true });
  if (clean.slug) {
    const exists = await Product.findOne({ slug: clean.slug, _id: { $ne: id } });
    if (exists) throw new ApiError(400, "Slug already exists");
  }
  const product = await Product.findByIdAndUpdate(id, clean, { new: true, runValidators: true });
  if (!product) throw new ApiError(404, "Product not found");
  await cacheDel("products:*");
  return product;
};

export const deleteProduct = async (id: string) => {
  await Product.findByIdAndDelete(id);
  await cacheDel("products:*");
};

const pickProductPayload = (payload: any, opts: { partial?: boolean } = {}) => {
  const out: any = {};
  if (!payload || typeof payload !== "object") return out;

  const assignString = (key: string) => {
    if (typeof payload[key] === "string") out[key] = payload[key].trim();
  };
  const assignBool = (key: string) => {
    if (typeof payload[key] === "boolean") out[key] = payload[key];
  };
  const assignNumber = (key: string) => {
    if (typeof payload[key] === "number" && Number.isFinite(payload[key])) out[key] = payload[key];
  };

  assignString("name");
  assignString("slug");
  assignString("description");
  assignString("image");
  assignNumber("basePrice");
  assignNumber("purchasePrice");
  assignNumber("stock");
  if (typeof payload.status === "string" && ["active", "inactive", "draft"].includes(payload.status)) {
    out.status = payload.status;
  }
  assignBool("isTrending");
  assignBool("isBestSeller");

  // allow passing as string ids for refs
  if (typeof payload.category === "string") out.category = payload.category;
  if (typeof payload.brand === "string") out.brand = payload.brand;

  if (Array.isArray(payload.images)) {
    out.images = payload.images.filter((u: any) => typeof u === "string" && u.trim());
  }
  if (Array.isArray(payload.badges)) {
    out.badges = payload.badges;
  }
  if (typeof payload.specs === "object" && payload.specs !== null) {
    out.specs = payload.specs;
  }

  // Do not allow setting rating/reviewCount via admin product CRUD
  if (!opts.partial) {
    if (typeof out.basePrice !== "number") out.basePrice = 0;
  }

  return out;
};

export const createVariant = (payload: any) => ProductVariant.create(payload);
export const updateVariant = (id: string, payload: any) =>
  ProductVariant.findByIdAndUpdate(id, payload, { new: true });
export const deleteVariant = (id: string) => ProductVariant.findByIdAndDelete(id);
