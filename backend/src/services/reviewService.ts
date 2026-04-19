import { Review } from "../models/Review";
import { Product } from "../models/Product";
import { ApiError } from "../utils/apiError";
import mongoose from "mongoose";

const syncProductRating = async (productId: string | mongoose.Types.ObjectId) => {
  const stats = await Review.aggregate([
    { $match: { product: new mongoose.Types.ObjectId(productId.toString()), status: "approved" } },
    { $group: { _id: null, avgRating: { $avg: "$rating" }, reviewCount: { $sum: 1 } } }
  ]);

  const rating = stats.length > 0 ? Math.round(stats[0].avgRating * 10) / 10 : 0;
  const reviewCount = stats.length > 0 ? stats[0].reviewCount : 0;

  await Product.findByIdAndUpdate(productId, { rating, reviewCount });
};

export const createReview = async (payload: any) => {
  const review = await Review.create(payload);
  await syncProductRating(review.product);
  return review;
};

// Public: only show approved reviews
export const listReviewsByProduct = (productId: string) => 
  Review.find({ product: productId, status: "approved" }).sort({ isFeatured: -1, createdAt: -1 }).populate("user", "name avatar");

export const listFeaturedReviews = () =>
  Review.find({ isFeatured: true, status: "approved" })
    .sort({ createdAt: -1 })
    .populate("user", "name avatar")
    .populate("product", "name slug");

export const listReviewsByUser = (userId: string) => 
  Review.find({ user: userId }).sort({ createdAt: -1 });

export const updateReview = async (id: string, payload: any) => {
  const review = await Review.findByIdAndUpdate(id, payload, { new: true });
  if (!review) throw new ApiError(404, "Review not found");
  await syncProductRating(review.product);
  return review;
};

export const deleteReview = async (id: string) => {
  const review = await Review.findByIdAndDelete(id);
  if (review) {
    await syncProductRating(review.product);
  }
  return review;
};

export const markHelpful = async (reviewId: string, userId: string) => {
  const review = await Review.findById(reviewId);
  if (!review) throw new ApiError(404, "Review not found");

  const userObjectId = new mongoose.Types.ObjectId(userId);
  const alreadyHelpful = review.helpfulBy.some(id => id.toString() === userId);

  if (alreadyHelpful) {
    review.helpfulBy = review.helpfulBy.filter(id => id.toString() !== userId);
    review.helpfulCount -= 1;
  } else {
    review.helpfulBy.push(userObjectId);
    review.helpfulCount += 1;
  }
  
  await review.save();
  return review;
};

// ── Admin functions ───────────────────────────────────────────
export const listAllReviews = () =>
  Review.find()
    .sort({ createdAt: -1 })
    .populate("user", "name email avatar")
    .populate("product", "name slug image");

export const updateReviewStatus = async (id: string, status: "approved" | "rejected") => {
  const review = await Review.findByIdAndUpdate(id, { status }, { new: true })
    .populate("user", "name email avatar")
    .populate("product", "name slug image");
  if (!review) throw new ApiError(404, "Review not found");
  await syncProductRating((review.product as any)._id || review.product);
  return review;
};

export const replyToReview = async (id: string, adminReply: string) => {
  const review = await Review.findByIdAndUpdate(
    id,
    { adminReply, adminReplyAt: new Date() },
    { new: true }
  )
    .populate("user", "name email avatar")
    .populate("product", "name slug image");
  if (!review) throw new ApiError(404, "Review not found");
  return review;
};

export const toggleFeatured = async (id: string) => {
  const review = await Review.findById(id);
  if (!review) throw new ApiError(404, "Review not found");
  review.isFeatured = !review.isFeatured;
  await review.save();
  return Review.findById(id)
    .populate("user", "name email avatar")
    .populate("product", "name slug image");
};

export const bulkUpdateStatus = async (ids: string[], status: "approved" | "rejected") => {
  const reviewsToProcess = await Review.find({ _id: { $in: ids } });
  const uniqueProductIds = [...new Set(reviewsToProcess.map(r => r.product.toString()))];

  await Review.updateMany({ _id: { $in: ids } }, { status });
  
  for (const pid of uniqueProductIds) {
    await syncProductRating(pid);
  }

  return Review.find({ _id: { $in: ids } })
    .populate("user", "name email avatar")
    .populate("product", "name slug image");
};

export const getReviewStats = async () => {
  const [total, pending, approved, rejected] = await Promise.all([
    Review.countDocuments(),
    Review.countDocuments({ status: "pending" }),
    Review.countDocuments({ status: "approved" }),
    Review.countDocuments({ status: "rejected" }),
  ]);
  const avgResult = await Review.aggregate([{ $group: { _id: null, avg: { $avg: "$rating" } } }]);
  const avgRating = avgResult[0]?.avg || 0;
  const noReply = await Review.countDocuments({ $or: [{ adminReply: "" }, { adminReply: { $exists: false } }] });
  return { total, pending, approved, rejected, avgRating: Math.round(avgRating * 10) / 10, noReply };
};

export const exportReviewsCsv = async () => {
  const reviews = await Review.find()
    .sort({ createdAt: -1 })
    .populate("user", "name email")
    .populate("product", "name");

  const header = "ID,Product,User,Email,Rating,Title,Comment,Status,Featured,Admin Reply,Created At\n";
  const rows = reviews.map((r: any) => {
    const escape = (s: string) => `"${(s || "").replace(/"/g, '""')}"`;
    return [
      r._id,
      escape(r.product?.name || ""),
      escape(r.user?.name || ""),
      escape(r.user?.email || ""),
      r.rating,
      escape(r.title || ""),
      escape(r.comment || ""),
      r.status,
      r.isFeatured ? "Yes" : "No",
      escape(r.adminReply || ""),
      r.createdAt?.toISOString() || "",
    ].join(",");
  });
  return header + rows.join("\n");
};

