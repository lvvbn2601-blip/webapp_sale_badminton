import dotenv from "dotenv";

dotenv.config();

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT) || 4000,
  mongoUri: process.env.MONGO_URI || "mongodb+srv://levy:123456789dl@cluster0.rdgzpad.mongodb.net/?appName=Cluster0",
  jwtSecret: process.env.JWT_SECRET || "changeme",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  refreshSecret: process.env.REFRESH_TOKEN_SECRET || "changeme-refresh",
  refreshExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || "30d",
  redisUrl: process.env.REDIS_URL || "redis://localhost:6379",
  clientUrl: process.env.CLIENT_URL || "http://localhost:3000",
  vnpay: {
    tmnCode: process.env.VNPAY_TMN_CODE || "",
    hashSecret: process.env.VNPAY_HASH_SECRET || "",
    paymentUrl:
      process.env.VNPAY_PAYMENT_URL || "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html",
    returnUrl: process.env.VNPAY_RETURN_URL || "http://localhost:4000/api/payment/vnpay-return",
  },
  momo: {
    partnerCode: process.env.MOMO_PARTNER_CODE || "",
    accessKey: process.env.MOMO_ACCESS_KEY || "",
    secretKey: process.env.MOMO_SECRET_KEY || "",
    paymentUrl: process.env.MOMO_PAYMENT_URL || "https://test-payment.momo.vn/v2/gateway/api/create",
    returnUrl: process.env.MOMO_RETURN_URL || "http://localhost:3000/checkout?payment_status=momo",
    ipnUrl: process.env.MOMO_IPN_URL || "http://localhost:4000/api/payment/momo-ipn",
  },
};
