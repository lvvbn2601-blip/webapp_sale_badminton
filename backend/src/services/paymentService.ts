import { createHmac } from "crypto";
import { env } from "../config/env";
import qs from "qs";
import { Payment } from "../models/Payment";
import { ApiError } from "../utils/apiError";
import { Order } from "../models/Order";

const vnpDate = () => {
  const d = new Date();
  const pad = (n: number) => n.toString().padStart(2, "0");
  return (
    d.getFullYear().toString() +
    pad(d.getMonth() + 1) +
    pad(d.getDate()) +
    pad(d.getHours()) +
    pad(d.getMinutes()) +
    pad(d.getSeconds())
  );
};

// ── VNPay ─────────────────────────────────────────────────

export const createVnPayUrl = async (orderId: string, amount: number, ipAddr: string) => {
  const order = await Order.findById(orderId);
  if (!order) throw new ApiError(404, "Order not found");

  const vnpParams: Record<string, string> = {
    vnp_Version: "2.1.0",
    vnp_Command: "pay",
    vnp_TmnCode: env.vnpay.tmnCode,
    vnp_Amount: String(amount * 100),
    vnp_CreateDate: vnpDate(),
    vnp_CurrCode: "VND",
    vnp_IpAddr: ipAddr,
    vnp_Locale: "vn",
    vnp_OrderInfo: `Payment for order ${orderId}`,
    vnp_OrderType: "other",
    vnp_ReturnUrl: env.vnpay.returnUrl,
    vnp_TxnRef: orderId,
  };

  // Sort params alphabetically before signing
  const sortedParams = Object.keys(vnpParams)
    .sort()
    .reduce((obj: Record<string, string>, key) => {
      obj[key] = vnpParams[key];
      return obj;
    }, {});

  const signData = qs.stringify(sortedParams, { encode: false });
  const hmac = createHmac("sha512", env.vnpay.hashSecret);
  const secureHash = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");
  sortedParams["vnp_SecureHash"] = secureHash;

  // Create a pending payment record
  await Payment.create({
    order: orderId,
    amount,
    status: "pending",
    provider: "vnpay",
  });

  return `${env.vnpay.paymentUrl}?${qs.stringify(sortedParams, { encode: false })}`;
};

export const verifyVnPayReturn = async (queryParams: Record<string, any>) => {
  const { vnp_TxnRef, vnp_ResponseCode, vnp_Amount, vnp_TransactionNo, vnp_SecureHash } = queryParams;
  if (!vnp_TxnRef) throw new ApiError(400, "Missing order reference");

  // Verify signature
  const params = { ...queryParams };
  delete params["vnp_SecureHash"];
  delete params["vnp_SecureHashType"];

  const sortedParams = Object.keys(params)
    .sort()
    .reduce((obj: Record<string, string>, key) => {
      obj[key] = params[key];
      return obj;
    }, {});

  const signData = qs.stringify(sortedParams, { encode: false });
  const hmac = createHmac("sha512", env.vnpay.hashSecret);
  const expectedHash = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");

  const isValid = expectedHash === vnp_SecureHash;
  const status = vnp_ResponseCode === "00" && isValid ? "success" : "failed";

  // Update payment record
  await Payment.findOneAndUpdate(
    { order: vnp_TxnRef as string, provider: "vnpay" },
    {
      status,
      amount: Number(vnp_Amount) / 100,
      transactionId: vnp_TransactionNo as string,
      raw: queryParams,
    },
    { sort: { createdAt: -1 } }
  );

  // Update order status based on payment result
  if (status === "success") {
    await Order.findByIdAndUpdate(vnp_TxnRef, {
      status: "paid",
      $push: {
        statusHistory: {
          status: "paid",
          changedAt: new Date(),
          note: `VNPay payment confirmed. Transaction: ${vnp_TransactionNo}`,
        },
      },
    });
  } else {
    await Order.findByIdAndUpdate(vnp_TxnRef, {
      status: "cancelled",
      $push: {
        statusHistory: {
          status: "cancelled",
          changedAt: new Date(),
          note: `VNPay payment failed (code: ${vnp_ResponseCode}).`,
        },
      },
    });
  }

  return { status, orderId: vnp_TxnRef, isValid };
};

// ── MoMo ──────────────────────────────────────────────────

export const createMoMoPayment = async (orderId: string, amount: number) => {
  const order = await Order.findById(orderId);
  if (!order) throw new ApiError(404, "Order not found");

  const { partnerCode, accessKey, secretKey, paymentUrl, returnUrl, ipnUrl } = env.momo;
  const requestId = `${partnerCode}-${Date.now()}`;
  const orderInfo = `Payment for order ${orderId}`;
  const requestType = "captureWallet";
  const extraData = "";

  // Create signature
  const rawSignature = [
    `accessKey=${accessKey}`,
    `amount=${amount}`,
    `extraData=${extraData}`,
    `ipnUrl=${ipnUrl}`,
    `orderId=${orderId}`,
    `orderInfo=${orderInfo}`,
    `partnerCode=${partnerCode}`,
    `redirectUrl=${returnUrl}`,
    `requestId=${requestId}`,
    `requestType=${requestType}`,
  ].join("&");

  const signature = createHmac("sha256", secretKey)
    .update(rawSignature)
    .digest("hex");

  const requestBody = {
    partnerCode,
    accessKey,
    requestId,
    amount,
    orderId,
    orderInfo,
    redirectUrl: returnUrl,
    ipnUrl,
    extraData,
    requestType,
    signature,
    lang: "vi",
  };

  // Create a pending payment record
  await Payment.create({
    order: orderId,
    amount,
    status: "pending",
    provider: "momo",
  });

  try {
    const response = await fetch(paymentUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });
    const data = await response.json();

    if (data.resultCode === 0) {
      return {
        payUrl: data.payUrl,
        qrCodeUrl: data.qrCodeUrl,
        deeplink: data.deeplink,
        deeplinkMiniApp: data.deeplinkMiniApp,
      };
    }

    // If MoMo API returns error, return a simulated URL for demo (sandbox may be unavailable)
    console.warn("MoMo API returned non-zero result:", data.resultCode, data.message);
    return {
      payUrl: null,
      qrCodeUrl: null,
      deeplink: null,
      deeplinkMiniApp: null,
      demoMode: true,
    };
  } catch (error) {
    console.error("MoMo API call failed:", error);
    // Return demo mode response so the UI can still show the flow
    return {
      payUrl: null,
      qrCodeUrl: null,
      deeplink: null,
      deeplinkMiniApp: null,
      demoMode: true,
    };
  }
};

export const verifyMoMoIPN = async (body: Record<string, any>) => {
  const {
    partnerCode,
    orderId,
    requestId,
    amount,
    orderInfo,
    orderType,
    transId,
    resultCode,
    message,
    payType,
    responseTime,
    extraData,
    signature: receivedSignature,
  } = body;

  const { accessKey, secretKey } = env.momo;

  // Verify signature
  const rawSignature = [
    `accessKey=${accessKey}`,
    `amount=${amount}`,
    `extraData=${extraData}`,
    `message=${message}`,
    `orderId=${orderId}`,
    `orderInfo=${orderInfo}`,
    `orderType=${orderType}`,
    `partnerCode=${partnerCode}`,
    `payType=${payType}`,
    `requestId=${requestId}`,
    `responseTime=${responseTime}`,
    `resultCode=${resultCode}`,
    `transId=${transId}`,
  ].join("&");

  const expectedSignature = createHmac("sha256", secretKey)
    .update(rawSignature)
    .digest("hex");

  const isValid = expectedSignature === receivedSignature;
  const status = resultCode === 0 && isValid ? "success" : "failed";

  // Update payment record
  await Payment.findOneAndUpdate(
    { order: orderId, provider: "momo" },
    {
      status,
      transactionId: String(transId),
      raw: body,
    },
    { sort: { createdAt: -1 } }
  );

  // Update order status based on payment result
  if (status === "success") {
    await Order.findByIdAndUpdate(orderId, {
      status: "paid",
      $push: {
        statusHistory: {
          status: "paid",
          changedAt: new Date(),
          note: `MoMo payment confirmed. Transaction: ${transId}`,
        },
      },
    });
  } else {
    await Order.findByIdAndUpdate(orderId, {
      status: "cancelled",
      $push: {
        statusHistory: {
          status: "cancelled",
          changedAt: new Date(),
          note: `MoMo payment failed (resultCode: ${resultCode}).`,
        },
      },
    });
  }

  return { status, orderId, isValid };
};

// ── Common ────────────────────────────────────────────────

export const recordPayment = (payload: {
  order: string;
  amount: number;
  status: "pending" | "success" | "failed";
  provider?: "vnpay" | "momo" | "cod" | "bank_transfer" | "other";
  transactionId?: string;
  raw?: unknown;
}) => Payment.create({ ...payload, provider: payload.provider || "other" });

export const getPaymentStatus = async (orderId: string) => {
  return Payment.findOne({ order: orderId }).sort({ createdAt: -1 });
};

export const simulatePaymentSuccess = async (orderId: string, provider: string) => {
  const order = await Order.findById(orderId);
  if (!order) throw new ApiError(404, "Order not found");

  // Update payment record
  const payment = await Payment.findOneAndUpdate(
    { order: orderId, provider },
    {
      status: "success",
      transactionId: `SIM-${Date.now()}`,
    },
    { sort: { createdAt: -1 }, new: true }
  );

  if (!payment) {
    // Create one if not existing
    await Payment.create({
      order: orderId,
      amount: order.total,
      status: "success",
      provider: provider as any,
      transactionId: `SIM-${Date.now()}`,
    });
  }

  // Update order status to paid
  await Order.findByIdAndUpdate(orderId, {
    status: "paid",
    $push: {
      statusHistory: {
        status: "paid",
        changedAt: new Date(),
        note: `${provider.toUpperCase()} payment confirmed (simulated).`,
      },
    },
  });

  return { status: "success", orderId };
};
