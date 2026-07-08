import { createHmac } from "crypto";
import { env } from "../config/env";
import qs from "qs";
import { Payment } from "../models/Payment";
import { ApiError } from "../utils/apiError";
import { Order } from "../models/Order";

const getVnpDates = () => {
  // Use GMT+7 for VNPAY
  const date = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" }));
  const pad = (n: number) => n.toString().padStart(2, "0");
  
  const formatDate = (d: Date) => {
    return (
      d.getFullYear().toString() +
      pad(d.getMonth() + 1) +
      pad(d.getDate()) +
      pad(d.getHours()) +
      pad(d.getMinutes()) +
      pad(d.getSeconds())
    );
  };

  const createDate = formatDate(date);
  date.setMinutes(date.getMinutes() + 15);
  const expireDate = formatDate(date);

  return { createDate, expireDate };
};

// ── VNPay ─────────────────────────────────────────────────

/**
 * VNPAY sortObject: encode both keys and values with encodeURIComponent,
 * then replace %20 with +, then sort by encoded key.
 */
const sortVnpParams = (obj: Record<string, string>): Record<string, string> => {
  const sorted: Record<string, string> = {};
  const encodedKeys: string[] = [];

  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      encodedKeys.push(encodeURIComponent(key));
    }
  }
  encodedKeys.sort();

  for (const encodedKey of encodedKeys) {
    const originalKey = decodeURIComponent(encodedKey);
    sorted[encodedKey] = encodeURIComponent(obj[originalKey]).replace(/%20/g, "+");
  }
  return sorted;
};

export const createVnPayUrl = async (orderId: string, amount: number, ipAddr: string) => {
  const order = await Order.findById(orderId);
  if (!order) throw new ApiError(404, "Order not found");

  let vnpIp = ipAddr || "127.0.0.1";
  if (vnpIp === "::1" || vnpIp.includes("::ffff:")) {
    vnpIp = "127.0.0.1";
  }

  const { createDate, expireDate } = getVnpDates();

  const vnpParams: Record<string, string> = {
    vnp_Version: "2.1.0",
    vnp_Command: "pay",
    vnp_TmnCode: env.vnpay.tmnCode,
    vnp_Amount: String(Math.round(amount * 100)),
    vnp_CreateDate: createDate,
    vnp_CurrCode: "VND",
    vnp_IpAddr: vnpIp,
    vnp_Locale: "vn",
    vnp_OrderInfo: `Thanh toan don hang ${orderId}`,
    vnp_OrderType: "other",
    vnp_ReturnUrl: env.vnpay.returnUrl,
    vnp_TxnRef: orderId,
    vnp_ExpireDate: expireDate,
  };
  
  // Sort params using VNPAY's required sortObject algorithm
  // (keys & values are URI-encoded, %20 replaced with +)
  const sortedParams = sortVnpParams(vnpParams);

  // Sign the encoded query string with encode:false (already encoded above)
  const signData = qs.stringify(sortedParams, { encode: false });
  console.log("[VNPAY] signData:", signData);

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

  // Build the final URL (encode:false since values are already encoded)
  const paymentUrl = `${env.vnpay.paymentUrl}?${qs.stringify(sortedParams, { encode: false })}`;
  console.log("[VNPAY] paymentUrl:", paymentUrl);
  return paymentUrl;
};

export const verifyVnPayReturn = async (queryParams: Record<string, any>) => {
  const { vnp_TxnRef, vnp_ResponseCode, vnp_Amount, vnp_TransactionNo, vnp_SecureHash } = queryParams;
  if (!vnp_TxnRef) throw new ApiError(400, "Missing order reference");

  // Verify signature
  const params = { ...queryParams };
  delete params["vnp_SecureHash"];
  delete params["vnp_SecureHashType"];

  // Use the same sortVnpParams encoding used when creating the URL
  const sortedParams = sortVnpParams(params);

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

/**
 * MoMo AIO v2 – Create Payment
 * Docs: https://developers.momo.vn/v2/#/docs/aiov2/
 *
 * Sandbox credentials (from MoMo official docs):
 *   partnerCode: MOMO
 *   accessKey:   F8BBA842ECF85
 *   secretKey:   K951B6PE1waDMi640xX08PD3vg6EkVlz
 *   endpoint:    https://test-payment.momo.vn/v2/gateway/api/create
 *
 * Signature format (keys sorted alphabetically):
 *   accessKey=...&amount=...&extraData=...&ipnUrl=...&orderId=...
 *   &orderInfo=...&partnerCode=...&redirectUrl=...&requestId=...&requestType=...
 */
export const createMoMoPayment = async (orderId: string, amount: number) => {
  const order = await Order.findById(orderId);
  if (!order) throw new ApiError(404, "Order not found");

  const { partnerCode, accessKey, secretKey, paymentUrl, returnUrl, ipnUrl } = env.momo;

  // MoMo requires unique orderId per request; append timestamp to avoid "duplicate orderId" error (41)
  const momoOrderId = `${orderId}-${Date.now()}`;
  const requestId = `${partnerCode}-${Date.now()}`;
  const orderInfo = `Thanh toan don hang ${orderId}`;
  const requestType = "captureWallet";
  const extraData = "";

  // MoMo requires integer amount (VND, min 1000)
  const momoAmount = Math.round(amount);
  if (momoAmount < 1000) {
    throw new ApiError(400, "MoMo requires minimum payment of 1,000 VND");
  }

  // Create signature – keys MUST be in alphabetical order (a→z)
  const rawSignature = [
    `accessKey=${accessKey}`,
    `amount=${momoAmount}`,
    `extraData=${extraData}`,
    `ipnUrl=${ipnUrl}`,
    `orderId=${momoOrderId}`,
    `orderInfo=${orderInfo}`,
    `partnerCode=${partnerCode}`,
    `redirectUrl=${returnUrl}`,
    `requestId=${requestId}`,
    `requestType=${requestType}`,
  ].join("&");

  console.log("[MOMO CREATE] rawSignature:", rawSignature);

  const signature = createHmac("sha256", secretKey)
    .update(rawSignature)
    .digest("hex");

  const requestBody = {
    partnerCode,
    accessKey,
    requestId,
    amount: momoAmount,
    orderId: momoOrderId,
    orderInfo,
    redirectUrl: returnUrl,
    ipnUrl,
    extraData,
    requestType,
    signature,
    lang: "vi",
  };

  console.log("[MOMO CREATE] Endpoint:", paymentUrl);
  console.log("[MOMO CREATE] Body:", JSON.stringify(requestBody, null, 2));

  // Create a pending payment record (store both real orderId and momo orderId)
  await Payment.create({
    order: orderId,
    amount: momoAmount,
    status: "pending",
    provider: "momo",
    transactionId: momoOrderId, // store momo orderId for lookup during IPN
  });

  try {
    const response = await fetch(paymentUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });
    const data = await response.json();

    console.log("[MOMO CREATE] Response:", JSON.stringify(data, null, 2));

    if (data.resultCode === 0) {
      return {
        payUrl: data.payUrl,
        qrCodeUrl: data.qrCodeUrl,
        deeplink: data.deeplink,
        deeplinkMiniApp: data.deeplinkMiniApp,
      };
    }

    // MoMo returned an error
    console.warn("[MOMO CREATE] Error:", data.resultCode, data.message);

    // Common error codes for debugging:
    // 11 = Access denied (wrong accessKey)
    // 12 = Invalid signature (wrong secretKey or signature format)
    // 40 = Duplicate requestId
    // 41 = Duplicate orderId
    return {
      payUrl: null,
      qrCodeUrl: null,
      deeplink: null,
      deeplinkMiniApp: null,
      demoMode: true,
      errorCode: data.resultCode,
      errorMessage: data.message,
    };
  } catch (error) {
    console.error("[MOMO CREATE] API call failed:", error);
    return {
      payUrl: null,
      qrCodeUrl: null,
      deeplink: null,
      deeplinkMiniApp: null,
      demoMode: true,
    };
  }
};

/**
 * MoMo IPN (Instant Payment Notification) – server-to-server callback
 *
 * IPN signature format (keys alphabetically):
 *   accessKey=...&amount=...&extraData=...&message=...&orderId=...
 *   &orderInfo=...&orderType=...&partnerCode=...&payType=...
 *   &requestId=...&responseTime=...&resultCode=...&transId=...
 */
export const verifyMoMoIPN = async (body: Record<string, any>) => {
  const {
    partnerCode,
    orderId: momoOrderId,
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

  // Verify signature – keys in alphabetical order
  const rawSignature = [
    `accessKey=${accessKey}`,
    `amount=${amount}`,
    `extraData=${extraData}`,
    `message=${message}`,
    `orderId=${momoOrderId}`,
    `orderInfo=${orderInfo}`,
    `orderType=${orderType}`,
    `partnerCode=${partnerCode}`,
    `payType=${payType}`,
    `requestId=${requestId}`,
    `responseTime=${responseTime}`,
    `resultCode=${resultCode}`,
    `transId=${transId}`,
  ].join("&");

  console.log("[MOMO IPN] rawSignature:", rawSignature);
  console.log("[MOMO IPN] received body:", JSON.stringify(body, null, 2));

  const expectedSignature = createHmac("sha256", secretKey)
    .update(rawSignature)
    .digest("hex");

  const isValid = expectedSignature === receivedSignature;
  console.log("[MOMO IPN] Signature valid:", isValid, "resultCode:", resultCode);

  const status = resultCode === 0 && isValid ? "success" : "failed";

  // Find the payment record by momo orderId (stored in transactionId during creation)
  // The momoOrderId format is: {realOrderId}-{timestamp}
  const realOrderId = momoOrderId.replace(/-\d+$/, "");

  // Update payment record
  await Payment.findOneAndUpdate(
    { order: realOrderId, provider: "momo", transactionId: momoOrderId },
    {
      status,
      transactionId: String(transId), // now store the real MoMo transaction ID
      raw: body,
    },
    { sort: { createdAt: -1 } }
  );

  // Update order status based on payment result
  if (status === "success") {
    await Order.findByIdAndUpdate(realOrderId, {
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
    await Order.findByIdAndUpdate(realOrderId, {
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

  return { status, orderId: realOrderId, isValid };
};

/**
 * MoMo Return – verify redirect query params from MoMo
 * Called when MoMo redirects user back to redirectUrl
 */
export const verifyMoMoReturn = async (queryParams: Record<string, any>) => {
  const {
    partnerCode,
    orderId: momoOrderId,
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
  } = queryParams;

  const { accessKey, secretKey } = env.momo;

  // Verify signature – same format as IPN
  const rawSignature = [
    `accessKey=${accessKey}`,
    `amount=${amount}`,
    `extraData=${extraData}`,
    `message=${message}`,
    `orderId=${momoOrderId}`,
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
  const status = String(resultCode) === "0" && isValid ? "success" : "failed";

  // Extract real orderId from momo orderId
  const realOrderId = String(momoOrderId).replace(/-\d+$/, "");

  console.log("[MOMO RETURN] orderId:", realOrderId, "status:", status, "valid:", isValid);

  return { status, orderId: realOrderId, isValid };
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

// ── Refund Functions ─────────────────────────────────────

/**
 * VNPay Refund API
 * Docs: https://sandbox.vnpayment.vn/apis/
 * Endpoint: https://sandbox.vnpayment.vn/merchant_webapi/api/transaction
 *
 * IMPORTANT: The refund API uses a PIPE-DELIMITED signature, NOT the
 * sorted key=value& format used by the payment redirect URL.
 * Format: requestId|version|command|tmnCode|transactionType|txnRef|amount|
 *         transactionNo|transactionDate|createBy|createDate|ipAddr|orderInfo
 */
export const refundVnPay = async (
  orderId: string,
  amount: number,
  transactionId: string,
  originalPaymentDate: string // yyyyMMddHHmmss from the original payment
) => {
  const { tmnCode, hashSecret } = env.vnpay;

  // ── Correct refund API URL ────────────────────────────
  const refundUrl = "https://sandbox.vnpayment.vn/merchant_webapi/api/transaction";

  const createDate = vnpDate();
  const requestId = `RF-${Date.now()}`;
  const vnpAmount = String(Math.round(amount * 100));
  const orderInfo = `Hoan tien don hang ${orderId}`;
  const ipAddr = "127.0.0.1";
  const createBy = "admin";
  const transactionType = "02"; // 02 = Full refund

  // ── Pipe-delimited signature for refund API ──────────
  // Order: requestId|version|command|tmnCode|transactionType|txnRef|
  //        amount|transactionNo|transactionDate|createBy|createDate|ipAddr|orderInfo
  const signData = [
    requestId,
    "2.1.0",
    "refund",
    tmnCode,
    transactionType,
    orderId,
    vnpAmount,
    transactionId,
    originalPaymentDate,
    createBy,
    createDate,
    ipAddr,
    orderInfo,
  ].join("|");

  console.log("[VNPAY REFUND] signData:", signData);

  const hmac = createHmac("sha512", hashSecret);
  const secureHash = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");

  const requestBody: Record<string, string> = {
    vnp_RequestId: requestId,
    vnp_Version: "2.1.0",
    vnp_Command: "refund",
    vnp_TmnCode: tmnCode,
    vnp_TransactionType: transactionType,
    vnp_TxnRef: orderId,
    vnp_Amount: vnpAmount,
    vnp_TransactionNo: transactionId,
    vnp_TransactionDate: originalPaymentDate,
    vnp_CreateBy: createBy,
    vnp_CreateDate: createDate,
    vnp_IpAddr: ipAddr,
    vnp_OrderInfo: orderInfo,
    vnp_SecureHash: secureHash,
  };

  console.log("[VNPAY REFUND] URL:", refundUrl);
  console.log("[VNPAY REFUND] Body:", JSON.stringify(requestBody, null, 2));

  try {
    const response = await fetch(refundUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });
    const data = await response.json();
    console.log("[VNPAY REFUND] Response:", JSON.stringify(data, null, 2));

    if (data.vnp_ResponseCode === "00") {
      return { success: true, refundTransactionId: data.vnp_TransactionNo || requestId, raw: data };
    }

    // Non-zero code = actual failure from VNPay
    const errorMsg = `VNPay refund rejected (code: ${data.vnp_ResponseCode}, message: ${data.vnp_Message || "unknown"})`;
    console.error("[VNPAY REFUND]", errorMsg);
    throw new ApiError(400, errorMsg);
  } catch (error: any) {
    // Re-throw ApiError (already formatted)
    if (error instanceof ApiError) throw error;

    console.error("[VNPAY REFUND] API call failed:", error);
    throw new ApiError(502, `VNPay refund API unreachable: ${error.message || "Network error"}`);
  }
};

/**
 * MoMo Refund API
 * Endpoint: https://test-payment.momo.vn/v2/gateway/api/refund
 */
export const refundMoMo = async (orderId: string, amount: number, transactionId: string) => {
  const { partnerCode, accessKey, secretKey } = env.momo;
  const refundUrl = (env.momo.paymentUrl || "").replace("/create", "/refund");

  const requestId = `${partnerCode}-REFUND-${Date.now()}`;
  const refundOrderId = `${orderId}-REFUND-${Date.now()}`;
  const description = `Refund for order ${orderId}`;

  // MoMo refund signature (alphabetical key order)
  const rawSignature = [
    `accessKey=${accessKey}`,
    `amount=${amount}`,
    `description=${description}`,
    `orderId=${refundOrderId}`,
    `partnerCode=${partnerCode}`,
    `requestId=${requestId}`,
    `transId=${transactionId}`,
  ].join("&");

  const signature = createHmac("sha256", secretKey)
    .update(rawSignature)
    .digest("hex");

  const requestBody = {
    partnerCode,
    orderId: refundOrderId,
    requestId,
    amount,
    transId: transactionId,
    lang: "vi",
    description,
    signature,
  };

  console.log("[MOMO REFUND] URL:", refundUrl);
  console.log("[MOMO REFUND] Body:", JSON.stringify(requestBody, null, 2));

  try {
    const response = await fetch(refundUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });
    const data = await response.json();
    console.log("[MOMO REFUND] Response:", JSON.stringify(data, null, 2));

    if (data.resultCode === 0) {
      return { success: true, refundTransactionId: String(data.transId || requestId), raw: data };
    }

    const errorMsg = `MoMo refund rejected (code: ${data.resultCode}, message: ${data.message || "unknown"})`;
    console.error("[MOMO REFUND]", errorMsg);
    throw new ApiError(400, errorMsg);
  } catch (error: any) {
    if (error instanceof ApiError) throw error;

    console.error("[MOMO REFUND] API call failed:", error);
    throw new ApiError(502, `MoMo refund API unreachable: ${error.message || "Network error"}`);
  }
};

/**
 * Extract the original VNPay payment date from the Payment record.
 * VNPay requires vnp_TransactionDate = the original vnp_CreateDate (yyyyMMddHHmmss).
 * We try to extract it from the raw callback data, otherwise derive from createdAt.
 */
const getOriginalVnPayDate = (payment: any): string => {
  // 1. Try to get from the raw VNPay callback stored during verification
  const raw = payment.raw;
  if (raw && typeof raw === "object") {
    // VNPay callback stores vnp_PayDate or we can use vnp_CreateDate
    if (raw.vnp_PayDate) return String(raw.vnp_PayDate);
    if (raw.vnp_CreateDate) return String(raw.vnp_CreateDate);
  }

  // 2. Fallback: derive from the payment createdAt timestamp
  const d = new Date(payment.createdAt);
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

/**
 * Orchestrator: Process a refund for an order.
 * Finds the successful payment, calls the provider's refund API, updates records.
 */
export const processRefund = async (orderId: string, adminId?: string) => {
  const order = await Order.findById(orderId);
  if (!order) throw new ApiError(404, "Order not found");

  // Find the successful payment for this order
  const payment = await Payment.findOne({ order: orderId, status: "success" }).sort({ createdAt: -1 });
  if (!payment) throw new ApiError(400, "No successful payment found for this order");

  const amount = payment.amount;
  const provider = payment.provider;
  const transactionId = payment.transactionId || "";

  let refundResult: { success: boolean; refundTransactionId: string; raw: any; simulated?: boolean };

  if (provider === "vnpay") {
    const originalPaymentDate = getOriginalVnPayDate(payment);
    console.log("[REFUND] VNPay original payment date:", originalPaymentDate);
    console.log("[REFUND] VNPay transactionId:", transactionId);
    refundResult = await refundVnPay(orderId, amount, transactionId, originalPaymentDate);
  } else if (provider === "momo") {
    refundResult = await refundMoMo(orderId, amount, transactionId);
  } else {
    // For COD/bank_transfer/other — just mark as refunded without API call
    refundResult = { success: true, refundTransactionId: `MANUAL-${Date.now()}`, raw: { note: "Manual refund for non-online payment" } };
  }

  if (refundResult.success) {
    // Update payment record
    await Payment.findByIdAndUpdate(payment._id, {
      status: "refunded",
      refundTransactionId: refundResult.refundTransactionId,
      refundedAt: new Date(),
      refundAmount: amount,
    });

    // Update order status
    await Order.findByIdAndUpdate(orderId, {
      status: "returned",
      refundStatus: "completed",
      refundAmount: amount,
      $push: {
        statusHistory: {
          status: "returned",
          changedAt: new Date(),
          changedBy: adminId ? (adminId as any) : undefined,
          note: `Refund processed via ${provider.toUpperCase()}. Refund TX: ${refundResult.refundTransactionId}`,
        },
      },
    });

    return { success: true, refundTransactionId: refundResult.refundTransactionId, amount, provider };
  }

  throw new ApiError(500, "Refund processing failed");
};

