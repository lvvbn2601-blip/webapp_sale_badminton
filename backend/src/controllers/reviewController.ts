import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import * as ReviewService from "../services/reviewService";
import { ok } from "../utils/apiResponse";
import { ApiError } from "../utils/apiError";
import { AuthRequest } from "../middlewares/auth";

export const createReview = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new ApiError(401, "Unauthorized");
  const review = await ReviewService.createReview({ ...req.body, user: req.user.sub });
  res.status(201).json(ok(review));
});

export const listByProduct = asyncHandler(async (req: Request, res: Response) => {
  const reviews = await ReviewService.listReviewsByProduct(req.params.id as string);
  res.json(ok(reviews));
});

export const listByUser = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new ApiError(401, "Unauthorized");
  const reviews = await ReviewService.listReviewsByUser(req.user.sub);
  res.json(ok(reviews));
});

export const listFeatured = asyncHandler(async (_req: Request, res: Response) => {
  const reviews = await ReviewService.listFeaturedReviews();
  res.json(ok(reviews));
});

export const updateReview = asyncHandler(async (req: Request, res: Response) => {
  const review = await ReviewService.updateReview(req.params.id as string, req.body);
  res.json(ok(review));
});

export const deleteReview = asyncHandler(async (req: Request, res: Response) => {
  await ReviewService.deleteReview(req.params.id as string);
  res.json(ok(true, "Deleted"));
});

export const markHelpful = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new ApiError(401, "Unauthorized");
  const review = await ReviewService.markHelpful(req.params.id as string, req.user.sub);
  res.json(ok(review));
});

// ── Admin endpoints ────────────────────────────────────────────

export const adminListAll = asyncHandler(async (_req: Request, res: Response) => {
  const [reviews, stats] = await Promise.all([
    ReviewService.listAllReviews(),
    ReviewService.getReviewStats(),
  ]);
  res.json(ok({ reviews, stats }));
});

export const adminUpdateStatus = asyncHandler(async (req: Request, res: Response) => {
  const { status } = req.body;
  if (!["approved", "rejected"].includes(status)) throw new ApiError(400, "Invalid status");
  const review = await ReviewService.updateReviewStatus(req.params.id as string, status);
  res.json(ok(review));
});

export const adminReply = asyncHandler(async (req: Request, res: Response) => {
  const { adminReply } = req.body;
  if (typeof adminReply !== "string") throw new ApiError(400, "adminReply is required");
  const review = await ReviewService.replyToReview(req.params.id as string, adminReply);
  res.json(ok(review));
});

export const adminToggleFeatured = asyncHandler(async (req: Request, res: Response) => {
  const review = await ReviewService.toggleFeatured(req.params.id as string);
  res.json(ok(review));
});

export const adminBulkUpdate = asyncHandler(async (req: Request, res: Response) => {
  const { ids, status } = req.body;
  if (!Array.isArray(ids) || !["approved", "rejected"].includes(status))
    throw new ApiError(400, "Invalid payload");
  const reviews = await ReviewService.bulkUpdateStatus(ids, status);
  res.json(ok(reviews));
});

export const adminExportCsv = asyncHandler(async (_req: Request, res: Response) => {
  const csv = await ReviewService.exportReviewsCsv();
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=reviews.csv");
  res.send(csv);
});

