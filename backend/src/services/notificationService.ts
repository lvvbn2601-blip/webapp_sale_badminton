import { Notification } from "../models/Notification";
import { User } from "../models/User";
import { ApiError } from "../utils/apiError";

/** Create a notification for a specific user */
export const createNotification = async (data: {
  userId: string;
  type: "new_order" | "order_confirmed" | "order_delivered" | "order_received" | "order_returned" | "return_request" | "return_approved" | "order_cancelled" | "order_status" | "system";
  title: string;
  message: string;
  orderId?: string;
}) => {
  return Notification.create({
    user: data.userId,
    type: data.type,
    title: data.title,
    message: data.message,
    orderId: data.orderId || undefined,
  });
};

/** Notify ALL admins (e.g. when a new order is placed) */
export const notifyAdmins = async (data: {
  type: "new_order" | "order_confirmed" | "order_delivered" | "order_received" | "order_returned" | "return_request" | "return_approved" | "order_cancelled" | "order_status" | "system";
  title: string;
  message: string;
  orderId?: string;
}) => {
  const admins = await User.find({ role: "admin" }).select("_id");
  const notifications = admins.map((admin) => ({
    user: admin._id,
    type: data.type,
    title: data.title,
    message: data.message,
    orderId: data.orderId || undefined,
    isRead: false,
  }));
  return Notification.insertMany(notifications);
};

/** Get notifications for a specific user, newest first */
export const getUserNotifications = async (userId: string) => {
  return Notification.find({ user: userId })
    .sort({ createdAt: -1 })
    .limit(50)
    .populate("orderId");
};

/** Count unread notifications for a user */
export const getUnreadCount = async (userId: string) => {
  return Notification.countDocuments({ user: userId, isRead: false });
};

/** Mark a single notification as read */
export const markAsRead = async (notificationId: string, userId: string) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: notificationId, user: userId },
    { isRead: true },
    { new: true }
  );
  if (!notification) throw new ApiError(404, "Notification not found");
  return notification;
};

/** Mark ALL notifications as read for a user */
export const markAllAsRead = async (userId: string) => {
  await Notification.updateMany({ user: userId, isRead: false }, { isRead: true });
};
