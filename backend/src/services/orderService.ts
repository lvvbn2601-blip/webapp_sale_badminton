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

  // Create StringingTask(s) if order needs stringing and is confirmed
  if (status === "confirmed" && order.needsStringing) {
    const { StringingTask } = await import("../models/StringingTask");
    const { createTask } = await import("./stringerService");

    const existingTasks = await StringingTask.countDocuments({ order: order._id });
    if (existingTasks === 0) {
      const orderItems = await OrderItem.find({ order: order._id, needsStringing: true }).populate("product");

      for (const item of orderItems) {
        // Create a task for each quantity of the item
        for (let i = 0; i < item.quantity; i++) {
          const product = item.product as any;
          await createTask({
            orderId: String(order._id),
            customerName: order.recipientName || "Customer",
            customerPhone: order.recipientPhone || "",
            racketModel: product ? product.name : "Custom Racket",
            stringType: item.stringType || "Default String",
            stringPattern: "2_knots", // Default
            tension: item.stringTension || 24,
            isUrgent: false,
            fee: 50000,
            userId: String(order.user),
            racketSource: "new_from_cart",
            autoAssign: false,
          });
        }
      }
    }
  }

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

/** User requests refund for a paid order (not yet confirmed by admin) - Case 1 */
export const requestRefund = async (orderId: string, userId: string, reason: string) => {
  const order = await Order.findById(orderId);
  if (!order) throw new ApiError(404, "Order not found");
  if (String(order.user) !== userId) throw new ApiError(403, "Not your order");
  if (order.status !== "paid") {
    throw new ApiError(400, "You can only request a refund for paid orders that are not yet confirmed");
  }

  order.status = "refund_requested" as any;
  order.cancelReason = reason;
  order.cancelRequestedAt = new Date();
  order.refundStatus = "requested";
  order.refundAmount = order.total;
  order.statusHistory.push({
    status: "refund_requested",
    changedAt: new Date(),
    note: `Refund requested by customer: ${reason}`,
  });
  await order.save();

  const shortId = String(order._id).slice(-8).toUpperCase();
  await NotificationService.notifyAdmins({
    type: "return_request",
    title: "Refund Request (Paid Order)",
    message: `Customer requested a refund for paid order #${shortId}. Reason: ${reason}`,
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

/** User requests return (only allowed if status is 'delivered' or 'received') - Case 2 */
export const requestReturn = async (orderId: string, userId: string, reason: string) => {
  const order = await Order.findById(orderId);
  if (!order) throw new ApiError(404, "Order not found");
  if (String(order.user) !== userId) throw new ApiError(403, "Not your order");
  if (order.status !== "delivered" && order.status !== "received") {
    throw new ApiError(400, "You can only return orders that have been delivered or received");
  }

  order.returnReason = reason;
  order.returnRequestedAt = new Date();
  order.refundStatus = "requested";
  order.refundAmount = order.total;
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

/** Admin confirms refund — calls payment provider's refund API */
export const confirmRefund = async (orderId: string, adminId: string) => {
  const order = await Order.findById(orderId);
  if (!order) throw new ApiError(404, "Order not found");

  // Allow refund for orders that are refund_requested, or have returnReason + delivered/received status
  const isRefundRequest = order.status === "refund_requested";
  const isReturnRequest = order.returnReason && (order.status === "delivered" || order.status === "received" || order.refundStatus === "requested");

  if (!isRefundRequest && !isReturnRequest) {
    throw new ApiError(400, "This order does not have a pending refund/return request");
  }

  const { processRefund } = await import("./paymentService");
  const result = await processRefund(orderId, adminId);

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
  await NotificationService.createNotification({
    userId: String(order.user),
    type: "return_approved",
    title: "Refund Approved",
    message: `Your refund for order #${shortId} has been approved and processed. Amount: $${result.amount.toFixed(2)} via ${result.provider.toUpperCase()}.`,
    orderId: String(order._id),
  });

  return result;
};

/** Admin rejects refund request */
export const rejectRefund = async (orderId: string, adminId: string, reason?: string) => {
  const order = await Order.findById(orderId);
  if (!order) throw new ApiError(404, "Order not found");

  // Determine which previous status to restore
  let restoredStatus = "paid";
  if (order.returnReason && !order.cancelReason) {
    restoredStatus = "delivered"; // Was a return request from delivered
  }

  order.status = restoredStatus as any;
  order.refundStatus = "rejected";
  order.statusHistory.push({
    status: restoredStatus,
    changedAt: new Date(),
    changedBy: adminId as any,
    note: `Refund/return request rejected by admin.${reason ? ` Reason: ${reason}` : ""}`,
  });
  await order.save();

  const shortId = String(order._id).slice(-8).toUpperCase();
  await NotificationService.createNotification({
    userId: String(order.user),
    type: "order_status",
    title: "Refund Request Rejected",
    message: `Your refund request for order #${shortId} has been rejected.${reason ? ` Reason: ${reason}` : ""} Please contact support for more details.`,
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

/** Scans pending orders to send reminders or cancel */
export const scanPendingOrders = async () => {
  const now = new Date();
  
  // 15 minutes ago
  const reminderThreshold = new Date(now.getTime() - 15 * 60 * 1000);
  // 30 minutes ago
  const cancelThreshold = new Date(now.getTime() - 30 * 60 * 1000);

  // We target orders that are pending, and payment method is NOT 'COD' or 'cod'
  const pendingOrders = await Order.find({
    status: "pending",
    payment: { $nin: ["COD", "cod", "Cash On Delivery", "cash"] },
  });

  for (const order of pendingOrders) {
    const createdAt = order.createdAt;
    if (!createdAt) continue;

    // Condition 1: Older than 30 minutes -> Cancel
    if (createdAt <= cancelThreshold) {
      order.status = "cancelled";
      order.statusHistory.push({
        status: "cancelled",
        changedAt: now,
        note: "Automatically cancelled due to unpaid status after 30 minutes.",
      });
      await order.save();

      // Restore inventory
      const orderItems = await OrderItem.find({ order: order._id });
      await Promise.all(
        orderItems.map(async (item: any) => {
          const { Product } = await import("../models/Product");
          await Product.findByIdAndUpdate(item.product, {
            $inc: { stock: item.quantity },
          });
        })
      );

      const shortId = String(order._id).slice(-8).toUpperCase();
      
      // Notify User
      await NotificationService.createNotification({
        userId: String(order.user),
        type: "order_cancelled",
        title: "Order Automatically Cancelled",
        message: `Your order #${shortId} has been cancelled because payment was not completed within 30 minutes.`,
        orderId: String(order._id),
      });

      // Notify Admins
      await NotificationService.notifyAdmins({
        type: "order_cancelled",
        title: "Order Auto-Cancelled (Unpaid)",
        message: `Order #${shortId} was automatically cancelled due to timeout (30 mins without payment).`,
        orderId: String(order._id),
      });

    } 
    // Condition 2: Older than 15 minutes but <= 30 minutes -> Send reminder
    else if (createdAt <= reminderThreshold && !order.paymentReminderSent) {
      order.paymentReminderSent = true;
      await order.save();

      const shortId = String(order._id).slice(-8).toUpperCase();
      // Send reminder notification
      await NotificationService.createNotification({
        userId: String(order.user),
        type: "order_status",
        title: "Complete Your Payment",
        message: "The product in your cart is almost sold out, please pay now to reserve your item!",
        orderId: String(order._id),
      });
    }
  }
};
