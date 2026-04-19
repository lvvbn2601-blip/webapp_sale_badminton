import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ok } from "../utils/apiResponse";
import { User } from "../models/User";
import { Order } from "../models/Order";
import { Product } from "../models/Product";

export const dashboard = asyncHandler(async (_req: Request, res: Response) => {
  const [users, orders, products] = await Promise.all([
    User.countDocuments(),
    Order.countDocuments(),
    Product.countDocuments(),
  ]);
  res.json(ok({ users, orders, products }));
});

export const adminOrders = asyncHandler(async (_req: Request, res: Response) => {
  const orders = await Order.find()
    .populate({ path: "items", populate: { path: "product" } })
    .populate("user", "name email phone")
    .sort({ createdAt: -1 });

  // Attach latest payment info for each order
  const Payment = (await import("../models/Payment")).Payment;
  const orderIds = orders.map((o) => o._id);
  const payments = await Payment.find({ order: { $in: orderIds } })
    .sort({ createdAt: -1 })
    .lean();

  // Group by orderId — take the latest payment per order
  const paymentMap = new Map<string, any>();
  for (const p of payments) {
    const key = String(p.order);
    if (!paymentMap.has(key)) {
      paymentMap.set(key, {
        status: p.status,
        provider: p.provider,
        amount: p.amount,
        transactionId: p.transactionId,
        createdAt: (p as any).createdAt,
      });
    }
  }

  const result = orders.map((o) => {
    const obj = o.toJSON();
    const pm = paymentMap.get(String(o._id));
    return { ...obj, paymentInfo: pm || null };
  });

  res.json(ok(result));
});

export const adminUsers = asyncHandler(async (_req: Request, res: Response) => {
  const users = await User.find().select("-password").lean();
  
  // Attach customer behavior/segmentation data to each user
  const CustomerBehavior = (await import("../models/CustomerBehavior")).CustomerBehavior;
  const behaviors = await CustomerBehavior.find({ userId: { $in: users.map(u => u._id) } }).lean();
  
  const behaviorMap = new Map();
  for (const b of behaviors) {
    if (b.userId) behaviorMap.set(String(b.userId), b);
  }

  const result = users.map((u) => {
    return { ...u, behavior: behaviorMap.get(String(u._id)) || null };
  });

  res.json(ok(result));
});

export const adminRevenue = asyncHandler(async (_req: Request, res: Response) => {
  const orders = await Order.find({ status: { $in: ["paid", "delivered"] } });
  const revenue = orders.reduce((acc, o) => acc + o.total, 0);
  res.json(ok({ revenue }));
});

export const adminProducts = asyncHandler(async (_req: Request, res: Response) => {
  const products = await Product.find().populate("category brand");
  res.json(ok(products));
});
