import { Cart } from "../models/Cart";
import { Order } from "../models/Order";
import { Coupon } from "../models/Coupon";
import { OrderItem } from "../models/OrderItem";
import { Product } from "../models/Product";
import { ApiError } from "../utils/apiError";
import * as NotificationService from "./notificationService";

export const createOrder = async (
  userId: string,
  items: any[],
  shippingAddress: string,
  payment?: string,
  recipientName?: string,
  recipientPhone?: string,
  discountCode?: string
) => {
  if (!items || items.length === 0) throw new ApiError(400, "Order must contain items");

  const subtotal = items.reduce((acc: number, item: any) => acc + item.price * item.quantity, 0);
  const shippingFee = subtotal > 120 ? 0 : 10;

  // Check if any item is a racket with stringing
  const needsStringing = items.some((item: any) => item.needsStringing === true);

  let discountAmount = 0;
  if (discountCode) {
    const coupon = await Coupon.findOne({ code: discountCode.toUpperCase() });
    if (!coupon) throw new ApiError(400, "Invalid discount code");
    if (coupon.status !== "running") throw new ApiError(400, "Coupon is not active");
    if (new Date() > coupon.expiresAt) throw new ApiError(400, "Coupon has expired");
    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
      throw new ApiError(400, "Coupon usage limit reached");
    }
    if (coupon.minOrderValue && subtotal < coupon.minOrderValue) {
      throw new ApiError(400, `Minimum order value of $${coupon.minOrderValue} required`);
    }
    if (coupon.limitPerCustomer === 1) {
      const existing = await Order.findOne({ 
        user: userId, 
        discountCode: new RegExp(`^${coupon.code}$`, "i"), 
        status: { $ne: "cancelled" } 
      });
      if (existing) throw new ApiError(400, "You have already used this coupon");
    }

    if (coupon.discountType === "percent") {
      discountAmount = (coupon.amount / 100) * subtotal;
      if (coupon.maxDiscount && discountAmount > coupon.maxDiscount) discountAmount = coupon.maxDiscount;
    } else {
      discountAmount = coupon.amount;
    }

    // Process incrementing usage count atomically
    await Coupon.updateOne(
      { _id: coupon._id },
      { $inc: { usageCount: 1 } }
    );
  }

  const order = await Order.create({
    user: userId,
    items: [],
    subtotal,
    shippingFee,
    discountCode: discountCode ? discountCode.toUpperCase() : undefined,
    discountAmount,
    total: Math.max(0, subtotal + shippingFee - discountAmount),
    status: "pending",
    shippingAddress,
    recipientName,
    recipientPhone,
    payment,
    needsStringing,
    stringingStatus: needsStringing ? "pending" : undefined,
    statusHistory: [{ status: "pending", changedAt: new Date() }],
  });

  const orderItems = await Promise.all(
    items.map((item: any) =>
      OrderItem.create({
        order: order._id,
        product: item.productId,
        quantity: item.quantity,
        price: item.price,
        // Pass variant metadata
        selectedColor: item.selectedColor,
        selectedGrip: item.selectedGrip,
        selectedSize: item.selectedSize,
        selectedBagType: item.selectedBagType,
        selectedMaterial: item.selectedMaterial,
        selectedSpeed: item.selectedSpeed,
        accessoryType: item.accessoryType,
        // Stringing service
        needsStringing: item.needsStringing || false,
        stringType: item.stringType,
        stringTension: item.stringTension,
      })
    )
  );

  order.items = orderItems.map((i: any) => i._id);
  await order.save();

  // Update product inventory
  await Promise.all(
    items.map(async (item: any) => {
      await Product.findByIdAndUpdate(item.productId, {
        $inc: { stock: -item.quantity },
      });
    })
  );

  // Notify all admins about the new order
  const orderId = String(order._id);
  const shortId = orderId.slice(-8).toUpperCase();
  const itemCount = items.reduce((sum: number, i: any) => sum + i.quantity, 0);
  await NotificationService.notifyAdmins({
    type: "new_order",
    title: "New Order Placed",
    message: `Order #${shortId} has been placed with ${itemCount} item(s). Total: $${(subtotal + shippingFee).toFixed(2)}. Payment: ${payment || "COD"}.${needsStringing ? " ⚡ Requires stringing." : ""}`,
    orderId,
  });

  return order.populate("items");
};

export const listOrders = (userId?: string) =>
  userId
    ? Order.find({ user: userId })
        .populate({ path: "items", populate: { path: "product" } })
        .populate("user", "name email")
        .sort({ createdAt: -1 })
    : Order.find()
        .populate({ path: "items", populate: { path: "product" } })
        .populate("user", "name email")
        .sort({ createdAt: -1 });

export const getOrder = (id: string) =>
  Order.findById(id)
    .populate({ path: "items", populate: { path: "product" } })
    .populate("user", "name email");

export const updateStatus = async (id: string, status: string, adminId?: string, reason?: string) => {
  const order = await Order.findById(id);
  if (!order) throw new ApiError(404, "Order not found");

  const oldStatus = order.status;
  order.status = status as any;
  order.statusHistory.push({
    status,
    changedAt: new Date(),
    changedBy: adminId ? (adminId as any) : undefined,
    note: status === "cancelled" && reason ? `Cancelled by admin: ${reason}` : undefined,
  });
  await order.save();

  const orderId = String(order._id);
  const shortId = orderId.slice(-8).toUpperCase();

  // Notify buyer based on status change
  if (status === "confirmed" && (oldStatus === "pending" || oldStatus === "paid")) {
    await NotificationService.createNotification({
      userId: String(order.user),
      type: "order_confirmed",
      title: "Order Confirmed",
      message: `Your order #${shortId} has been confirmed and is being prepared for delivery.`,
      orderId,
    });
  } else if (status === "paid" && oldStatus === "pending") {
    await NotificationService.createNotification({
      userId: String(order.user),
      type: "order_status",
      title: "Payment Received",
      message: `Payment for your order #${shortId} has been confirmed. Waiting for admin to process your order.`,
      orderId,
    });
  } else if (status === "delivered") {
    await NotificationService.createNotification({
      userId: String(order.user),
      type: "order_delivered",
      title: "Order Delivered",
      message: `Your order #${shortId} has been delivered. Please confirm receipt or request a return within 7 days.`,
      orderId,
    });
  } else if (status === "cancelled") {
    const reasonText = reason ? ` Reason: ${reason}` : "";
    await NotificationService.createNotification({
      userId: String(order.user),
      type: "order_cancelled",
      title: "Order Cancelled",
      message: `Your order #${shortId} has been cancelled by admin.${reasonText}`,
      orderId,
    });
  } else if (status === "returned") {
    // Admin approved return
    await NotificationService.createNotification({
      userId: String(order.user),
      type: "return_approved",
      title: "Return Approved",
      message: `Your return request for order #${shortId} has been approved. We will process your refund shortly.`,
      orderId,
    });
  }

  // If order is explicitly received, update RFM behavior natively
  if (status === "received" && oldStatus !== "received") {
    const { CustomerBehavior } = await import("../models/CustomerBehavior");
    let profile = await CustomerBehavior.findOne({ userId: order.user });
    if (!profile) profile = new CustomerBehavior({ userId: order.user, sessionId: "system_generated" });
    profile.rfmScore.monetary += order.total;
    profile.rfmScore.frequency += 1;
    profile.rfmScore.recency = Date.now();
    await profile.save();
  }

  return order;
};

/** User cancels own order (only allowed if status is 'pending') */
export const cancelOrder = async (orderId: string, userId: string) => {
  const order = await Order.findById(orderId);
  if (!order) throw new ApiError(404, "Order not found");
  if (String(order.user) !== userId) throw new ApiError(403, "Not your order");
  if (order.status !== "pending") {
    throw new ApiError(400, "You can only cancel orders that are pending confirmation");
  }

  order.status = "cancelled";
  order.statusHistory.push({ status: "cancelled", changedAt: new Date(), note: "Cancelled by customer" });
  await order.save();

  // Restore inventory
  const orderItems = await OrderItem.find({ order: order._id });
  await Promise.all(
    orderItems.map(async (item: any) => {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stock: item.quantity },
      });
    })
  );

  const shortId = String(order._id).slice(-8).toUpperCase();
  await NotificationService.notifyAdmins({
    type: "order_cancelled",
    title: "Order Cancelled by Customer",
    message: `Order #${shortId} has been cancelled by the customer.`,
    orderId: String(order._id),
  });

  return order;
};

/** User confirms receipt (only allowed if status is 'delivered') */
export const confirmReceipt = async (orderId: string, userId: string) => {
  const order = await Order.findById(orderId);
  if (!order) throw new ApiError(404, "Order not found");
  if (String(order.user) !== userId) throw new ApiError(403, "Not your order");
  if (order.status !== "delivered") {
    throw new ApiError(400, "Order must be in delivered status to confirm receipt");
  }

  order.status = "received";
  order.statusHistory.push({ status: "received", changedAt: new Date(), note: "Receipt confirmed by customer" });
  await order.save();

  // Explicitly update RFM behavior natively for the finalized purchase
  const { CustomerBehavior } = await import("../models/CustomerBehavior");
  let profile = await CustomerBehavior.findOne({ userId: order.user });
  if (!profile) profile = new CustomerBehavior({ userId: order.user, sessionId: "system_generated" });
  profile.rfmScore.monetary += order.total;
  profile.rfmScore.frequency += 1;
  profile.rfmScore.recency = Date.now();
  await profile.save();

  const shortId = String(order._id).slice(-8).toUpperCase();
  await NotificationService.notifyAdmins({
    type: "order_received",
    title: "Order Received by Customer",
    message: `Customer has confirmed receipt of order #${shortId}. Order completed.`,
    orderId: String(order._id),
  });

  return order;
};

/** User requests return (only allowed if status is 'delivered') */
export const requestReturn = async (orderId: string, userId: string, reason: string) => {
  const order = await Order.findById(orderId);
  if (!order) throw new ApiError(404, "Order not found");
  if (String(order.user) !== userId) throw new ApiError(403, "Not your order");
  if (order.status !== "delivered") {
    throw new ApiError(400, "You can only return orders that have been delivered");
  }

  order.returnReason = reason;
  order.returnRequestedAt = new Date();
  order.statusHistory.push({
    status: "return_requested",
    changedAt: new Date(),
    note: `Return requested: ${reason}`,
  });
  await order.save();

  const shortId = String(order._id).slice(-8).toUpperCase();
  await NotificationService.notifyAdmins({
    type: "return_request",
    title: "Return Request",
    message: `Customer requested a return for order #${shortId}. Reason: ${reason}`,
    orderId: String(order._id),
  });

  return order;
};

/** Admin updates tracking number */
export const updateTracking = async (orderId: string, trackingNumber: string, carrier?: string) => {
  const order = await Order.findByIdAndUpdate(
    orderId,
    { trackingNumber, carrier },
    { new: true }
  );
  if (!order) throw new ApiError(404, "Order not found");

  const shortId = String(order._id).slice(-8).toUpperCase();
  await NotificationService.createNotification({
    userId: String(order.user),
    type: "order_status",
    title: "Tracking Updated",
    message: `Your order #${shortId} tracking number: ${trackingNumber}${carrier ? ` (${carrier})` : ""}`,
    orderId: String(order._id),
  });

  return order;
};

/** Admin updates stringing status */
export const updateStringingStatus = async (orderId: string, stringingStatus: string) => {
  const order = await Order.findByIdAndUpdate(
    orderId,
    { stringingStatus },
    { new: true }
  );
  if (!order) throw new ApiError(404, "Order not found");
  return order;
};
