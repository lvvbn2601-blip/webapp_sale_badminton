import { Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { AuthRequest } from "../middlewares/auth";
import { ok } from "../utils/apiResponse";
import { ApiError } from "../utils/apiError";
import * as NotificationService from "../services/notificationService";

export const getNotifications = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new ApiError(401, "Unauthorized");
  const notifications = await NotificationService.getUserNotifications(req.user.sub);
  res.json(ok(notifications));
});

export const getUnreadCount = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new ApiError(401, "Unauthorized");
  const count = await NotificationService.getUnreadCount(req.user.sub);
  res.json(ok({ count }));
});

export const markAsRead = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new ApiError(401, "Unauthorized");
  const notification = await NotificationService.markAsRead(req.params.id as string, req.user.sub);
  res.json(ok(notification));
});

export const markAllAsRead = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new ApiError(401, "Unauthorized");
  await NotificationService.markAllAsRead(req.user.sub);
  res.json(ok({ message: "All notifications marked as read" }));
});
