/**
 * Quick test script for MoMo payment integration
 * Run: npx ts-node test-momo.ts
 * 
 * This tests the MoMo API connection with sandbox credentials directly,
 * without needing the full server running.
 */
import { createHmac } from "crypto";

// MoMo official sandbox test credentials
const config = {
  partnerCode: "MOMO",
  accessKey: "F8BBA842ECF85",
  secretKey: "K951B6PE1waDMi640xX08PD3vg6EkVlz",
  paymentUrl: "https://test-payment.momo.vn/v2/gateway/api/create",
  redirectUrl: "http://localhost:3000/checkout?payment_status=momo",
  ipnUrl: "http://localhost:4000/api/payment/momo-ipn",
};

async function testMoMoPayment() {
  const orderId = `TEST-${Date.now()}`;
  const requestId = `${config.partnerCode}-${Date.now()}`;
  const orderInfo = `Test payment order ${orderId}`;
  const amount = 50000; // 50,000 VND
  const requestType = "captureWallet";
  const extraData = "";

  // Build raw signature (alphabetically sorted keys)
  const rawSignature = [
    `accessKey=${config.accessKey}`,
    `amount=${amount}`,
    `extraData=${extraData}`,
    `ipnUrl=${config.ipnUrl}`,
    `orderId=${orderId}`,
    `orderInfo=${orderInfo}`,
    `partnerCode=${config.partnerCode}`,
    `redirectUrl=${config.redirectUrl}`,
    `requestId=${requestId}`,
    `requestType=${requestType}`,
  ].join("&");

  console.log("\n📋 Raw Signature:\n", rawSignature);

  const signature = createHmac("sha256", config.secretKey)
    .update(rawSignature)
    .digest("hex");

  console.log("\n🔐 Signature:", signature);

  const requestBody = {
    partnerCode: config.partnerCode,
    accessKey: config.accessKey,
    requestId,
    amount,
    orderId,
    orderInfo,
    redirectUrl: config.redirectUrl,
    ipnUrl: config.ipnUrl,
    extraData,
    requestType,
    signature,
    lang: "vi",
  };

  console.log("\n📤 Request Body:\n", JSON.stringify(requestBody, null, 2));
  console.log("\n🌐 Calling:", config.paymentUrl);

  try {
    const response = await fetch(config.paymentUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });
    const data = await response.json();

    console.log("\n📥 Response:\n", JSON.stringify(data, null, 2));

    if (data.resultCode === 0) {
      console.log("\n✅ SUCCESS! Payment URL:", data.payUrl);
      console.log("   QR Code URL:", data.qrCodeUrl);
      console.log("   Deeplink:", data.deeplink);
    } else {
      console.log(`\n❌ ERROR: resultCode=${data.resultCode}, message="${data.message}"`);
      
      // Explain common error codes
      const errorMap: Record<number, string> = {
        11: "Access denied – check accessKey",
        12: "Invalid signature – check secretKey or signature format",
        40: "Duplicate requestId",
        41: "Duplicate orderId – use a unique orderId per request",
      };
      if (errorMap[data.resultCode]) {
        console.log(`   💡 Hint: ${errorMap[data.resultCode]}`);
      }
    }
  } catch (error) {
    console.error("\n❌ Network error:", error);
  }
}

testMoMoPayment();
