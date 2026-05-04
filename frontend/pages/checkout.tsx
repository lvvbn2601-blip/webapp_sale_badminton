import Head from "next/head";
import { useRouter } from "next/router";
import { useState, useEffect, useMemo, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  CreditCard, Banknote, Wallet, ShieldCheck, MapPin, Lock, X,
  Phone, User, Mail, QrCode, ArrowRight, Package, Tag, Loader2, CheckCircle2, ChevronRight,
  Truck, Wrench, Ticket, Percent, DollarSign, ExternalLink, Smartphone, AlertCircle
} from "lucide-react";
import { useCart } from "../context/CartContext";
import { createOrder, fetchProfile, fetchPublicCoupons, createVnPayPayment, createMoMoPayment, simulatePayment } from "../lib/api";
import { VariantOptions } from "../types";
import { useTracking } from "../lib/useTracking";
import { FrequentlyPurchasedTogether } from "../components/FrequentlyPurchasedTogether";
import { Footer } from "../components/Footer";

const SHOP_NAME = "Badminton Hub";

const formatVND = (amount: number) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};

const PROVINCES = ["Hà Nội", "Hồ Chí Minh", "Đà Nẵng", "Cần Thơ", "Hải Phòng"];
const DISTRICTS = ["Quận 1", "Quận 3", "Quận Đống Đa", "Quận Cầu Giấy", "Quận Sơn Trà"];
const WARDS = ["Phường 1", "Phường Bến Nghé", "Phường Kim Mã", "Phường Tứ Liên"];

const SHIPPING_METHODS = [
  { id: "Express 2H", icon: "🚀", carrier: "GrabExpress", time: "2 Hours", price: 30000 },
  { id: "Standard", icon: "🚚", carrier: "Giao Hàng Nhanh", time: "2-3 Days", price: 0 },
  { id: "Economy", icon: "🐢", carrier: "VNPost", time: "4-5 Days", price: 0 },
];

const PAYMENT_METHODS = [
  {
    id: "MoMo",
    label: "MoMo",
    icon: "momo",
    color: "#a50064",
    bgColor: "#fce4f3",
    borderColor: "#f0b4d8",
    description: "Ví điện tử MoMo",
  },
  {
    id: "VNPay",
    label: "VNPay",
    icon: "vnpay",
    color: "#0064af",
    bgColor: "#e0f0ff",
    borderColor: "#a8d4f5",
    description: "Cổng thanh toán VNPay",
  },
  {
    id: "ZaloPay",
    label: "ZaloPay",
    icon: "zalopay",
    color: "#008fe5",
    bgColor: "#e0f5ff",
    borderColor: "#a0d8f5",
    description: "Ví ZaloPay",
  },
  {
    id: "International Card",
    label: "Thẻ quốc tế",
    icon: "card",
    color: "#1a1a2e",
    bgColor: "#f0f0f5",
    borderColor: "#d0d0e0",
    description: "Visa, MasterCard, JCB",
  },
  {
    id: "Bank Transfer",
    label: "Chuyển khoản",
    icon: "bank",
    color: "#0d6efd",
    bgColor: "#e7f1ff",
    borderColor: "#b6d4fe",
    description: "Chuyển khoản ngân hàng",
  },
  {
    id: "COD",
    label: "Thanh toán khi nhận hàng",
    icon: "cod",
    color: "#e65100",
    bgColor: "#fff3e0",
    borderColor: "#ffcc80",
    description: "Trả tiền mặt khi nhận",
  },
];

// SVG icons for payment methods
const PaymentIcon = ({ type, size = 24 }: { type: string; size?: number }) => {
  switch (type) {
    case "momo":
      return (
        <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
          <rect width="48" height="48" rx="12" fill="#A50064" />
          <circle cx="18" cy="24" r="7" stroke="white" strokeWidth="3" fill="none" />
          <circle cx="30" cy="24" r="7" stroke="white" strokeWidth="3" fill="none" />
        </svg>
      );
    case "vnpay":
      return (
        <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
          <rect width="48" height="48" rx="12" fill="#0064AF" />
          <path d="M12 16L18 32L24 20L30 32L36 16" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "zalopay":
      return (
        <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
          <rect width="48" height="48" rx="12" fill="#008FE5" />
          <text x="24" y="30" textAnchor="middle" fill="white" fontWeight="bold" fontSize="18">Z</text>
        </svg>
      );
    case "card":
      return (
        <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
          <rect width="48" height="48" rx="12" fill="#1A1A2E" />
          <rect x="10" y="15" width="28" height="18" rx="3" stroke="white" strokeWidth="2.5" fill="none" />
          <line x1="10" y1="22" x2="38" y2="22" stroke="white" strokeWidth="2.5" />
        </svg>
      );
    case "bank":
      return (
        <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
          <rect width="48" height="48" rx="12" fill="#0D6EFD" />
          <path d="M24 12L12 20H36L24 12Z" fill="white" />
          <rect x="15" y="22" width="3" height="10" fill="white" rx="1" />
          <rect x="22.5" y="22" width="3" height="10" fill="white" rx="1" />
          <rect x="30" y="22" width="3" height="10" fill="white" rx="1" />
          <rect x="12" y="33" width="24" height="3" fill="white" rx="1" />
        </svg>
      );
    case "cod":
      return (
        <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
          <rect width="48" height="48" rx="12" fill="#E65100" />
          <rect x="14" y="16" width="20" height="16" rx="2" stroke="white" strokeWidth="2.5" fill="none" />
          <circle cx="24" cy="24" r="4" stroke="white" strokeWidth="2" fill="none" />
          <text x="24" y="27" textAnchor="middle" fill="white" fontWeight="bold" fontSize="8">₫</text>
        </svg>
      );
    default:
      return <Wallet size={size} />;
  }
};

export default function CheckoutPage() {
  const router = useRouter();
  const { selectedItems, clear } = useCart();
  const [isReady, setIsReady] = useState(false);
  const { trackEvent, fetchSmartVouchers, smartVouchers } = useTracking();

  // Form States
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  const [province, setProvince] = useState(PROVINCES[0]);
  const [district, setDistrict] = useState(DISTRICTS[0]);
  const [ward, setWard] = useState(WARDS[0]);
  const [street, setStreet] = useState("");
  const [note, setNote] = useState("");

  const [shippingMethod, setShippingMethod] = useState("Standard");
  const [paymentMethod, setPaymentMethod] = useState("COD");

  // Card
  const [cardNumber, setCardNumber] = useState("");
  const [cardName, setCardName] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");

  // UI States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [toast, setToast] = useState<{ show: boolean, message: string, type: "success" | "error" }>({ show: false, message: "", type: "success" });

  // Payment gateway states
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [paymentGatewayUrl, setPaymentGatewayUrl] = useState<string | null>(null);
  const [momoQrUrl, setMomoQrUrl] = useState<string | null>(null);
  const [momoDeeplink, setMomoDeeplink] = useState<string | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);

  // Coupon / Voucher Slider
  const [showVouchers, setShowVouchers] = useState(false);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [selectedCoupon, setSelectedCoupon] = useState<any | null>(null);
  const [manualCode, setManualCode] = useState("");

  // Timer
  const [timeLeft, setTimeLeft] = useState(300);
  const [timerActive, setTimerActive] = useState(false);

  // Handle payment_status query param (return from gateway)
  useEffect(() => {
    if (router.query.payment_status && router.query.result) {
      const result = router.query.result as string;
      const provider = router.query.payment_status as string;
      if (result === "success") {
        showToast(`Thanh toán ${provider.toUpperCase()} thành công! 🎉`, "success");
        clear();
        setTimeout(() => router.push("/profile?tab=purchases"), 2000);
      } else {
        showToast(`Thanh toán ${provider.toUpperCase()} thất bại. Vui lòng thử lại.`, "error");
      }
    }
  }, [router.query]);

  useEffect(() => {
    setIsReady(true);
    const token = localStorage.getItem("accessToken");
    if (!token) {
      router.push("/login?next=/checkout");
      return;
    }
    fetchProfile(token)
      .then((profile) => {
        if (profile.name) setFullName(profile.name);
        if (profile.phone) setPhone(profile.phone);
        if (profile.email) setEmail(profile.email);
        if (profile.address) setStreet(profile.address);
        else if (profile.addressList && profile.addressList.length > 0) {
          setStreet(profile.addressList[0]);
        }
      })
      .catch((err) => console.log(err))
      .finally(() => setIsLoadingProfile(false));
  }, [router]);

  useEffect(() => {
    fetchPublicCoupons().then(setCoupons).catch(() => { });
    // Fetch smart vouchers for checkout context
    fetchSmartVouchers(selectedItems).catch(() => { });
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timerActive && timeLeft > 0) interval = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    else if (timeLeft <= 0) setTimerActive(false);
    return () => clearInterval(interval);
  }, [timerActive, timeLeft]);

  useEffect(() => {
    if (["MoMo", "VNPay", "ZaloPay"].includes(paymentMethod)) {
      setTimeLeft(300);
      setTimerActive(true);
    } else {
      setTimerActive(false);
    }
    // Reset payment gateway states when switching methods
    setPaymentGatewayUrl(null);
    setMomoQrUrl(null);
    setMomoDeeplink(null);
    setIsDemoMode(false);
  }, [paymentMethod]);

  const items = selectedItems;
  const USD_TO_VND = 25000;
  const baseSubtotalVND = items.reduce(
    (acc, i) => acc + (i.product.price || (i.product as any).basePrice || 0) * USD_TO_VND * i.quantity,
    0
  );

  const selectedShipping = SHIPPING_METHODS.find(m => m.id === shippingMethod);
  const shippingFeeVND = selectedShipping?.price || 0;
  const codFeeVND = paymentMethod === "COD" ? 5000 : 0;

  const applicableCoupons = useMemo(() => coupons.filter(c =>
    (!c.minOrderValue || (baseSubtotalVND / USD_TO_VND) >= c.minOrderValue) &&
    !c.usedByCurrentUser &&
    !(c.usageLimit && c.usageCount >= c.usageLimit)
  ), [coupons, baseSubtotalVND, USD_TO_VND]);
  const ineligibleCoupons = useMemo(() => coupons.filter(c =>
    (c.minOrderValue && (baseSubtotalVND / USD_TO_VND) < c.minOrderValue) ||
    c.usedByCurrentUser ||
    (c.usageLimit && c.usageCount >= c.usageLimit)
  ), [coupons, baseSubtotalVND, USD_TO_VND]);

  useEffect(() => {
    if (showVouchers && !selectedCoupon && applicableCoupons.length > 0) {
      let best: any = null;
      let maxDiscount = 0;
      applicableCoupons.forEach(c => {
        let val = 0;
        if (c.discountType === "amount") val = c.amount;
        else if (c.discountType === "percent") {
          val = ((baseSubtotalVND / USD_TO_VND) * c.amount) / 100;
          if (c.maxDiscount && val > c.maxDiscount) val = c.maxDiscount;
        }
        if (val > maxDiscount) { maxDiscount = val; best = c; }
      });
      setSelectedCoupon(best);
    }
  }, [showVouchers, applicableCoupons, selectedCoupon, baseSubtotalVND, USD_TO_VND]);

  const discountAmountVND = useMemo(() => {
    if (!selectedCoupon) return 0;
    if (selectedCoupon.discountType === "amount") return selectedCoupon.amount * USD_TO_VND;
    if (selectedCoupon.discountType === "percent") {
      let val = baseSubtotalVND * (selectedCoupon.amount / 100);
      if (selectedCoupon.maxDiscount && val > (selectedCoupon.maxDiscount * USD_TO_VND)) {
        val = selectedCoupon.maxDiscount * USD_TO_VND;
      }
      return val;
    }
    return 0;
  }, [selectedCoupon, baseSubtotalVND, USD_TO_VND]);

  const finalTotalVND = baseSubtotalVND - discountAmountVND + shippingFeeVND + codFeeVND;

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "success" }), 3000);
  };

  const handleApplyCoupon = () => {
    const found = coupons.find(c => c.code.toUpperCase() === manualCode.toUpperCase());
    if (found) {
      if (found.minOrderValue && (baseSubtotalVND / USD_TO_VND) < found.minOrderValue) {
        showToast("Order value does not meet the minimum requirement.", "error");
      } else {
        setSelectedCoupon(found);
        setManualCode("");
        showToast("Discount Applied Successfully!", "success");
      }
    } else {
      showToast("Invalid code or not applicable.", "error");
    }
  };

  const handleCardNumber = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, "");
    val = val.replace(/(.{4})/g, "$1 ").trim();
    setCardNumber(val.slice(0, 19));
  };

  const handleExpiry = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, "");
    if (val.length >= 2) val = val.slice(0, 2) + " / " + val.slice(2, 4);
    setCardExpiry(val.slice(0, 7));
  };

  // Process payment through gateway (MoMo / VNPay)
  const processGatewayPayment = useCallback(async (orderId: string, method: string) => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;

    setPaymentProcessing(true);

    try {
      if (method === "VNPay") {
        const result = await createVnPayPayment(orderId, finalTotalVND, token);
        if (result.paymentUrl) {
          setPaymentGatewayUrl(result.paymentUrl);
          // Redirect to VNPay gateway
          window.location.href = result.paymentUrl;
        } else {
          // Demo mode - simulate
          setIsDemoMode(true);
          setPaymentProcessing(false);
        }
      } else if (method === "MoMo") {
        const result = await createMoMoPayment(orderId, finalTotalVND, token);
        if (result.payUrl) {
          setPaymentGatewayUrl(result.payUrl);
          setMomoDeeplink(result.deeplink);
          // Note: MoMo qrCodeUrl is a deeplink (momo://...), not an image URL.
          // For web checkout, redirect directly to MoMo's payUrl (web payment page).
          window.location.href = result.payUrl;
        } else {
          // Demo mode
          setIsDemoMode(true);
          setPaymentProcessing(false);
        }
      }
    } catch (err: any) {
      console.error("Payment gateway error:", err);
      setIsDemoMode(true);
      setPaymentProcessing(false);
    }
  }, [finalTotalVND]);

  // Simulate payment completion (demo mode)
  const handleSimulatePayment = useCallback(async () => {
    if (!createdOrderId) return;
    const token = localStorage.getItem("accessToken");
    if (!token) return;

    setPaymentProcessing(true);
    try {
      await simulatePayment(createdOrderId, paymentMethod.toLowerCase(), token);
      showToast(`Thanh toán ${paymentMethod} thành công! 🎉`, "success");
      clear();
      setTimeout(() => router.push("/profile/purchases"), 1500);
    } catch (err: any) {
      showToast(err?.response?.data?.error || "Simulation failed", "error");
      setPaymentProcessing(false);
    }
  }, [createdOrderId, paymentMethod, clear, router]);

  const onSubmit = async () => {
    if (!fullName.trim() || !phone.trim() || !street.trim() || !province || !district || !ward) {
      showToast("Vui lòng điền đầy đủ các trường bắt buộc.", "error");
      return;
    }
    if (!items.length) {
      showToast("Giỏ hàng trống.", "error");
      return;
    }

    setIsSubmitting(true);
    await new Promise((r) => setTimeout(r, 1500));

    const token = localStorage.getItem("accessToken");
    if (!token) return;

    const fullAddress = `${street}, ${ward}, ${district}, ${province}\nNote: ${note}`.trim();

    try {
      const payload = {
        items: items.map((i) => {
          const vo = i.variantOptions || {} as VariantOptions;
          return {
            productId: i.product.id || (i.product as any)._id,
            name: i.product.name,
            image: i.product.image,
            price: i.product.price || (i.product as any).basePrice || 0,
            quantity: i.quantity,
            // Variant metadata
            selectedColor: vo.selectedColor,
            selectedGrip: vo.selectedGrip,
            selectedSize: vo.selectedSize,
            selectedBagType: vo.selectedBagType,
            selectedMaterial: vo.selectedMaterial,
            selectedSpeed: vo.selectedSpeed,
            accessoryType: vo.accessoryType,
            // Stringing service
            needsStringing: vo.addStringingService || false,
            stringType: vo.stringType,
            stringTension: vo.stringTension,
          };
        }),
        shippingAddress: fullAddress,
        payment: paymentMethod,
        discountCode: selectedCoupon ? selectedCoupon.code : undefined,
      };

      const order = await createOrder(payload, token);
      const orderId = order._id || order.id;
      setCreatedOrderId(orderId);

      // Track the checkout event with the total value paid in USD
      trackEvent('checkout', orderId, 'order', { price: finalTotalVND / USD_TO_VND });

      // For MoMo & VNPay: create order first, then redirect to gateway
      if (paymentMethod === "MoMo" || paymentMethod === "VNPay") {
        showToast("Đơn hàng đã tạo, đang chuyển tới cổng thanh toán...", "success");
        await processGatewayPayment(orderId, paymentMethod);
        return;
      }

      // For other methods, complete immediately
      showToast("Đặt hàng thành công!", "success");
      clear();
      setTimeout(() => router.push("/profile/purchases"), 1500);
    } catch (err: any) {
      showToast(err?.response?.data?.error || "Failed to create order", "error");
      setIsSubmitting(false);
    }
  };

  if (!isReady) return null;

  const currentPayment = PAYMENT_METHODS.find(p => p.id === paymentMethod);

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-gray-800 font-sans pb-20 relative">
      <Head>
        <title>Thanh Toán | {SHOP_NAME}</title>
      </Head>

      {/* Payment processing overlay */}
      {paymentProcessing && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white rounded-3xl p-10 shadow-2xl flex flex-col items-center gap-5 max-w-sm mx-4 animate-in zoom-in duration-300">
            <div className="relative">
              <div className="w-20 h-20 rounded-full border-4 border-gray-100 flex items-center justify-center">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
              </div>
              <div className="absolute -right-1 -bottom-1 w-8 h-8 bg-white rounded-full shadow-md flex items-center justify-center">
                {currentPayment && <PaymentIcon type={currentPayment.icon} size={20} />}
              </div>
            </div>
            <div className="text-center">
              <h3 className="font-bold text-lg text-gray-900">Đang xử lý thanh toán</h3>
              <p className="text-sm text-gray-500 mt-1">Đang kết nối tới {paymentMethod}...</p>
            </div>
          </div>
        </div>
      )}

      {/* TOP NAVIGATION */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-[1100px] mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-primary font-bold text-xl">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white font-black text-sm">B</div>
            <span className="hidden sm:block">{SHOP_NAME}</span>
          </Link>

          {/* Progress Bar */}
          <div className="hidden md:flex items-center gap-2 text-sm font-medium">
            <span className="text-gray-400">Cart</span>
            <ChevronRight className="w-4 h-4 text-gray-300" />
            <span className="text-gray-400">Info</span>
            <ChevronRight className="w-4 h-4 text-gray-300" />
            <span className="text-primary font-bold">Payment</span>
            <ChevronRight className="w-4 h-4 text-gray-300" />
            <span className="text-gray-400">Confirmation</span>
          </div>

          <div className="flex items-center gap-1.5 text-sm font-semibold text-green-700 bg-green-50 px-3 py-1.5 rounded-full ring-1 ring-green-600/20">
            <ShieldCheck className="w-4 h-4" /> Secure Checkout
          </div>
        </div>
      </header>

      <main className="max-w-[1100px] mx-auto px-4 mt-8">
        <div className="flex flex-col lg:flex-row gap-8 items-start relative">

          {/* LEFT COLUMN: FORM */}
          <div className="w-full lg:flex-1 space-y-8 order-2 lg:order-1">

            {/* [1] CONTACT INFORMATION */}
            <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative">
              {isLoadingProfile && (
                <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-10 rounded-2xl flex items-center justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              )}
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><User className="w-5 h-5 text-primary" /> Contact Information</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-600">Full Name <span className="text-red-500">*</span></label>
                  <input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Nguyen Van A" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-4 focus:ring-primary/10 transition outline-none text-sm" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-600">Phone Number <span className="text-red-500">*</span></label>
                  <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="090 123 4567" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-4 focus:ring-primary/10 transition outline-none text-sm" />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-sm font-medium text-gray-600">Email (Optional)</label>
                  <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="example@email.com" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-4 focus:ring-primary/10 transition outline-none text-sm" />
                </div>
              </div>
            </section>

            {/* [2] SHIPPING ADDRESS */}
            <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><MapPin className="w-5 h-5 text-primary" /> Shipping Address</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-600">Province/City <span className="text-red-500">*</span></label>
                  <select value={province} onChange={e => setProvince(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition outline-none text-sm">
                    <option value="">Select Province</option>
                    {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-600">District <span className="text-red-500">*</span></label>
                  <select value={district} onChange={e => setDistrict(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition outline-none text-sm">
                    <option value="">Select District</option>
                    {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-600">Ward/Commune <span className="text-red-500">*</span></label>
                  <select value={ward} onChange={e => setWard(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition outline-none text-sm">
                    <option value="">Select Ward</option>
                    {WARDS.map(w => <option key={w} value={w}>{w}</option>)}
                  </select>
                </div>
              </div>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-600">House number & Street name <span className="text-red-500">*</span></label>
                  <input value={street} onChange={e => setStreet(e.target.value)} placeholder="e.g. 123 Nguyen Hue" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-4 focus:ring-primary/10 transition outline-none text-sm" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-600">Delivery Note (Optional)</label>
                  <input value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. Call before delivery" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-4 focus:ring-primary/10 transition outline-none text-sm" />
                </div>
              </div>
            </section>

            {/* [3] SHIPPING METHOD */}
            <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><Truck className="w-5 h-5 text-primary" /> Shipping Method</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {SHIPPING_METHODS.map((m) => {
                  const isActive = shippingMethod === m.id;
                  return (
                    <button
                      key={m.id}
                      onClick={() => setShippingMethod(m.id)}
                      className={`text-left p-4 flex justify-between rounded-xl border-2 transition-all ${isActive ? "border-primary bg-primary/5" : "border-gray-100 bg-white hover:border-gray-200"}`}
                    >
                      <div>
                        <div className="font-bold flex items-center gap-1.5 mb-1"><span className="text-lg">{m.icon}</span> {m.id}</div>
                        <div className="text-xs text-gray-500 mb-2">{m.carrier}</div>
                        <div className="text-xs text-gray-400 font-medium">Est: {m.time}</div>
                      </div>
                      <div className="font-semibold text-primary text-sm flex flex-col justify-end">
                        {m.price === 0 ? "Free" : formatVND(m.price)}
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* E-WALLET PROMOTION BANNER */}
            {smartVouchers.filter(v => v.type === 'PAYMENT_SPECIFIC').map((promo, idx) => (
              <div key={idx} className="bg-gradient-to-r from-violet-50 via-purple-50 to-pink-50 rounded-2xl border border-purple-200/60 p-4 flex items-center gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-pink-500 text-white text-xl shadow-md shadow-purple-200">
                  {promo.icon || '💳'}
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-gray-800 text-sm">{promo.message}</h4>
                  {promo.description && (
                    <p className="text-xs text-gray-500 mt-0.5">{promo.description}</p>
                  )}
                </div>
                <div className="flex gap-1.5">
                  {promo.gateways?.map(gw => (
                    <span key={gw} className="px-2.5 py-1 rounded-lg text-xs font-bold bg-white shadow-sm border border-purple-100 text-purple-700">
                      {gw}
                    </span>
                  ))}
                </div>
              </div>
            ))}

            {/* [4] PAYMENT METHOD */}
            <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><Wallet className="w-5 h-5 text-primary" /> Payment Method</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {PAYMENT_METHODS.map((pay) => {
                  const isActive = paymentMethod === pay.id;
                  return (
                    <button
                      key={pay.id}
                      id={`payment-method-${pay.id.toLowerCase().replace(/\s+/g, '-')}`}
                      onClick={() => setPaymentMethod(pay.id)}
                      className={`group relative p-4 rounded-2xl border-2 transition-all duration-200 flex flex-col items-center gap-2.5 text-center ${isActive
                        ? "border-current shadow-lg scale-[1.02]"
                        : "border-gray-100 bg-white hover:border-gray-200 hover:shadow-sm"
                        }`}
                      style={isActive ? {
                        borderColor: pay.color,
                        backgroundColor: pay.bgColor,
                        color: pay.color,
                      } : {}}
                    >
                      {/* Active indicator dot */}
                      {isActive && (
                        <div
                          className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full flex items-center justify-center shadow-md"
                          style={{ backgroundColor: pay.color }}
                        >
                          <CheckCircle2 className="w-4 h-4 text-white" />
                        </div>
                      )}

                      <PaymentIcon type={pay.icon} size={32} />
                      <div>
                        <div className={`font-bold text-sm ${isActive ? "" : "text-gray-700"}`}>{pay.label}</div>
                        <div className={`text-[10px] mt-0.5 font-medium ${isActive ? "opacity-70" : "text-gray-400"}`}>{pay.description}</div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* ── MoMo Payment Section ── */}
              {paymentMethod === "MoMo" && (
                <div className="mt-4 col-span-2 sm:col-span-3 animate-in fade-in slide-in-from-bottom-3 duration-400">
                  <div className="rounded-2xl border-2 border-[#a50064]/20 overflow-hidden">
                    {/* MoMo Header */}
                    <div className="bg-gradient-to-r from-[#a50064] to-[#d4006a] px-6 py-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-md">
                          <PaymentIcon type="momo" size={28} />
                        </div>
                        <div>
                          <h4 className="text-white font-bold text-sm">Thanh toán qua MoMo</h4>
                          <p className="text-white/70 text-xs">Quét mã QR hoặc mở ứng dụng MoMo</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 bg-white/20 rounded-full px-3 py-1.5 text-white/90 text-xs font-bold backdrop-blur-sm">
                        <span>⏱</span>
                        <span className="tabular-nums">{Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}</span>
                      </div>
                    </div>

                    <div className="bg-gradient-to-b from-[#fce4f3]/50 to-white p-6">
                      {/* Demo mode or real QR */}
                      <div className="flex flex-col md:flex-row gap-6 items-center">
                        {/* QR Code section */}
                        <div className="flex flex-col items-center gap-3">
                          <div className="relative group">
                            <div className="w-52 h-52 bg-white rounded-2xl border-2 border-[#a50064]/10 flex items-center justify-center shadow-lg">
                              {momoQrUrl ? (
                                <img src={momoQrUrl} alt="MoMo QR Code" className="w-44 h-44 rounded-lg" />
                              ) : (
                                <div className="text-center p-4">
                                  <div className="w-36 h-36 mx-auto rounded-xl bg-[#fce4f3]/50 flex items-center justify-center mb-2 relative overflow-hidden">
                                    {/* Simulated QR pattern */}
                                    <div className="grid grid-cols-8 gap-0.5 w-28 h-28">
                                      {Array.from({ length: 64 }).map((_, idx) => (
                                        <div
                                          key={idx}
                                          className="rounded-[1px]"
                                          style={{
                                            backgroundColor: Math.random() > 0.4 ? '#a50064' : 'transparent',
                                            opacity: 0.7 + Math.random() * 0.3,
                                          }}
                                        />
                                      ))}
                                    </div>
                                    <div className="absolute inset-0 flex items-center justify-center">
                                      <div className="w-10 h-10 bg-white rounded-lg shadow-md flex items-center justify-center">
                                        <PaymentIcon type="momo" size={24} />
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                            {/* Decorative corners */}
                            <div className="absolute -top-1 -left-1 w-5 h-5 border-t-3 border-l-3 border-[#a50064] rounded-tl-lg" />
                            <div className="absolute -top-1 -right-1 w-5 h-5 border-t-3 border-r-3 border-[#a50064] rounded-tr-lg" />
                            <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-3 border-l-3 border-[#a50064] rounded-bl-lg" />
                            <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-3 border-r-3 border-[#a50064] rounded-br-lg" />
                          </div>
                          <p className="text-xs text-[#a50064] font-semibold">Quét mã bằng ứng dụng MoMo</p>
                        </div>

                        {/* Instructions */}
                        <div className="flex-1 space-y-4">
                          <div className="space-y-3">
                            {[
                              { step: 1, text: "Mở ứng dụng MoMo trên điện thoại", icon: Smartphone },
                              { step: 2, text: "Chọn \"Quét mã QR\" để thanh toán", icon: QrCode },
                              { step: 3, text: "Xác nhận thanh toán trên ứng dụng", icon: CheckCircle2 },
                            ].map((item) => (
                              <div key={item.step} className="flex items-center gap-3 group">
                                <div className="w-8 h-8 rounded-full bg-[#a50064] text-white flex items-center justify-center text-sm font-black shrink-0 shadow-sm group-hover:scale-110 transition-transform">
                                  {item.step}
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-700 font-medium">
                                  <item.icon className="w-4 h-4 text-[#a50064]" />
                                  {item.text}
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Open MoMo App button */}
                          <div className="flex flex-col gap-2 pt-2">
                            {momoDeeplink ? (
                              <a
                                href={momoDeeplink}
                                className="flex items-center justify-center gap-2 bg-[#a50064] text-white font-bold text-sm py-3 px-6 rounded-xl shadow-lg shadow-[#a50064]/30 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-[#a50064]/40 transition-all active:scale-[0.98]"
                              >
                                <Smartphone className="w-4 h-4" />
                                Mở ứng dụng MoMo
                                <ExternalLink className="w-3.5 h-3.5 ml-1 opacity-60" />
                              </a>
                            ) : (
                              <div className="flex items-center gap-2 bg-[#a50064]/10 text-[#a50064] font-semibold text-xs py-3 px-4 rounded-xl">
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                <span>Bạn sẽ được chuyển đến MoMo sau khi đặt hàng</span>
                              </div>
                            )}
                          </div>

                          {/* Amount display */}
                          <div className="bg-[#fce4f3]/60 rounded-xl p-4 flex items-center justify-between border border-[#a50064]/10">
                            <span className="text-sm text-[#a50064]/80 font-medium">Số tiền thanh toán</span>
                            <span className="text-xl font-black text-[#a50064]">{formatVND(finalTotalVND)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Demo mode notice */}
                      {isDemoMode && (
                        <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 animate-in fade-in duration-300">
                          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-bold text-amber-800">Chế độ Demo</p>
                            <p className="text-xs text-amber-700 mt-1">MoMo sandbox chưa được cấu hình. Bấm nút bên dưới để mô phỏng thanh toán thành công.</p>
                            <button
                              onClick={handleSimulatePayment}
                              disabled={paymentProcessing}
                              className="mt-2 bg-[#a50064] text-white text-sm font-bold py-2.5 px-5 rounded-lg hover:bg-[#8e0055] transition disabled:opacity-60 flex items-center gap-2"
                            >
                              {paymentProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                              Xác nhận thanh toán (Demo)
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ── VNPay Payment Section ── */}
              {paymentMethod === "VNPay" && (
                <div className="mt-4 col-span-2 sm:col-span-3 animate-in fade-in slide-in-from-bottom-3 duration-400">
                  <div className="rounded-2xl border-2 border-[#0064af]/20 overflow-hidden">
                    {/* VNPay Header */}
                    <div className="bg-gradient-to-r from-[#0064af] to-[#0088e8] px-6 py-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-md">
                          <PaymentIcon type="vnpay" size={28} />
                        </div>
                        <div>
                          <h4 className="text-white font-bold text-sm">Thanh toán qua VNPay</h4>
                          <p className="text-white/70 text-xs">Hỗ trợ 40+ ngân hàng & ví điện tử</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 bg-white/20 rounded-full px-3 py-1.5 text-white/90 text-xs font-bold backdrop-blur-sm">
                        <span>⏱</span>
                        <span className="tabular-nums">{Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}</span>
                      </div>
                    </div>

                    <div className="bg-gradient-to-b from-[#e0f0ff]/50 to-white p-6">
                      <div className="flex flex-col md:flex-row gap-6 items-center">
                        {/* QR Code section */}
                        <div className="flex flex-col items-center gap-3">
                          <div className="relative group">
                            <div className="w-52 h-52 bg-white rounded-2xl border-2 border-[#0064af]/10 flex items-center justify-center shadow-lg">
                              <div className="text-center p-4">
                                <div className="w-36 h-36 mx-auto rounded-xl bg-[#e0f0ff]/50 flex items-center justify-center mb-2 relative overflow-hidden">
                                  {/* Simulated QR pattern */}
                                  <div className="grid grid-cols-8 gap-0.5 w-28 h-28">
                                    {Array.from({ length: 64 }).map((_, idx) => (
                                      <div
                                        key={idx}
                                        className="rounded-[1px]"
                                        style={{
                                          backgroundColor: Math.random() > 0.4 ? '#0064af' : 'transparent',
                                          opacity: 0.7 + Math.random() * 0.3,
                                        }}
                                      />
                                    ))}
                                  </div>
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-10 h-10 bg-white rounded-lg shadow-md flex items-center justify-center">
                                      <PaymentIcon type="vnpay" size={24} />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                            {/* Decorative corners */}
                            <div className="absolute -top-1 -left-1 w-5 h-5 border-t-3 border-l-3 border-[#0064af] rounded-tl-lg" />
                            <div className="absolute -top-1 -right-1 w-5 h-5 border-t-3 border-r-3 border-[#0064af] rounded-tr-lg" />
                            <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-3 border-l-3 border-[#0064af] rounded-bl-lg" />
                            <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-3 border-r-3 border-[#0064af] rounded-br-lg" />
                          </div>
                          <p className="text-xs text-[#0064af] font-semibold">Quét mã hoặc sử dụng app ngân hàng</p>
                        </div>

                        {/* Instructions */}
                        <div className="flex-1 space-y-4">
                          <div className="space-y-3">
                            {[
                              { step: 1, text: "Mở ứng dụng ngân hàng của bạn", icon: Smartphone },
                              { step: 2, text: "Quét mã QR hoặc chọn VNPay", icon: QrCode },
                              { step: 3, text: "Xác nhận OTP để hoàn tất thanh toán", icon: ShieldCheck },
                            ].map((item) => (
                              <div key={item.step} className="flex items-center gap-3 group">
                                <div className="w-8 h-8 rounded-full bg-[#0064af] text-white flex items-center justify-center text-sm font-black shrink-0 shadow-sm group-hover:scale-110 transition-transform">
                                  {item.step}
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-700 font-medium">
                                  <item.icon className="w-4 h-4 text-[#0064af]" />
                                  {item.text}
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Supported banks */}
                          <div className="pt-2">
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-2">Ngân hàng hỗ trợ</p>
                            <div className="flex flex-wrap gap-1.5">
                              {["Vietcombank", "BIDV", "Agribank", "Techcombank", "MB Bank", "VPBank", "ACB", "TPBank", "+32"].map((bank, idx) => (
                                <span key={bank} className={`text-[10px] font-bold px-2 py-1 rounded-md ${idx === 8 ? "bg-[#0064af] text-white" : "bg-[#e0f0ff] text-[#0064af]"}`}>
                                  {bank}
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* VNPay redirect notice */}
                          <div className="flex items-center gap-2 bg-[#e0f0ff]/60 text-[#0064af] font-semibold text-xs py-3 px-4 rounded-xl border border-[#0064af]/10">
                            <ExternalLink className="w-4 h-4 shrink-0" />
                            <span>Bạn sẽ được chuyển đến cổng VNPay sau khi đặt hàng</span>
                          </div>

                          {/* Amount display */}
                          <div className="bg-[#e0f0ff]/60 rounded-xl p-4 flex items-center justify-between border border-[#0064af]/10">
                            <span className="text-sm text-[#0064af]/80 font-medium">Số tiền thanh toán</span>
                            <span className="text-xl font-black text-[#0064af]">{formatVND(finalTotalVND)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Demo mode notice */}
                      {isDemoMode && (
                        <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 animate-in fade-in duration-300">
                          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-bold text-amber-800">Chế độ Demo</p>
                            <p className="text-xs text-amber-700 mt-1">VNPay sandbox chưa được cấu hình. Bấm nút bên dưới để mô phỏng thanh toán thành công.</p>
                            <button
                              onClick={handleSimulatePayment}
                              disabled={paymentProcessing}
                              className="mt-2 bg-[#0064af] text-white text-sm font-bold py-2.5 px-5 rounded-lg hover:bg-[#00549a] transition disabled:opacity-60 flex items-center gap-2"
                            >
                              {paymentProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                              Xác nhận thanh toán (Demo)
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ── ZaloPay Payment Section ── */}
              {paymentMethod === "ZaloPay" && (
                <div className="mt-4 p-6 bg-white rounded-xl border border-gray-200 flex flex-col items-center justify-center text-center animate-in fade-in zoom-in duration-300">
                  <div className="w-48 h-48 bg-[#e0f5ff]/50 rounded-xl flex items-center justify-center border border-[#008fe5]/10 shadow-sm mb-4">
                    <QrCode className="w-16 h-16 text-[#008fe5]/40" />
                  </div>
                  <p className="font-medium text-gray-800">Quét mã QR bằng ứng dụng ZaloPay</p>
                  <div className="mt-3 inline-flex items-center gap-2 px-4 py-1.5 bg-red-50 text-red-600 rounded-full text-sm font-bold">
                    <span>⏱ Vui lòng thanh toán trong</span>
                    <span className="tabular-nums">{Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}</span>
                  </div>
                </div>
              )}

              {/* ── International Card ── */}
              {paymentMethod === "International Card" && (
                <div className="mt-4 grid grid-cols-2 gap-4 p-5 bg-gray-50/50 rounded-xl border border-gray-100 animate-in fade-in duration-300">
                  <div className="col-span-2 space-y-1.5">
                    <label className="text-xs font-semibold text-gray-500">Card Number</label>
                    <input
                      placeholder="0000 0000 0000 0000"
                      value={cardNumber} onChange={handleCardNumber}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-4 focus:ring-primary/10 focus:border-primary text-sm font-medium outline-none transition"
                    />
                  </div>
                  <div className="col-span-2 space-y-1.5">
                    <label className="text-xs font-semibold text-gray-500">Cardholder Name</label>
                    <input
                      placeholder="NGUYEN VAN A"
                      value={cardName} onChange={e => setCardName(e.target.value.toUpperCase())}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-4 focus:ring-primary/10 focus:border-primary text-sm font-medium outline-none transition uppercase"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-500">Expiry Date</label>
                    <input
                      placeholder="MM / YY"
                      value={cardExpiry} onChange={handleExpiry}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-4 focus:ring-primary/10 focus:border-primary text-sm font-medium outline-none transition"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-500">CVV</label>
                    <input
                      placeholder="123"
                      maxLength={4}
                      value={cardCvv} onChange={e => setCardCvv(e.target.value.replace(/\D/g, ""))}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-4 focus:ring-primary/10 focus:border-primary text-sm font-medium outline-none transition"
                    />
                  </div>
                </div>
              )}

              {/* ── Bank Transfer ── */}
              {paymentMethod === "Bank Transfer" && (
                <div className="mt-4 p-5 bg-blue-50/40 rounded-xl border border-blue-100 animate-in fade-in duration-300">
                  <h4 className="font-semibold text-blue-900 mb-3 text-sm">Account Information</h4>
                  <div className="bg-white rounded-xl border border-blue-100 overflow-hidden text-sm shadow-sm ring-1 ring-black/5">
                    <div className="grid grid-cols-3 border-b border-gray-100 p-3.5">
                      <span className="text-gray-500">Bank:</span>
                      <span className="col-span-2 font-medium">Techcombank</span>
                    </div>
                    <div className="grid grid-cols-3 border-b border-gray-100 p-3.5">
                      <span className="text-gray-500">Account No:</span>
                      <span className="col-span-2 font-medium">1903 0000 000 000</span>
                    </div>
                    <div className="grid grid-cols-3 border-b border-gray-100 p-3.5">
                      <span className="text-gray-500">Account Name:</span>
                      <span className="col-span-2 font-medium uppercase font-semibold">BADMINTON HUB CO LTD</span>
                    </div>
                    <div className="grid grid-cols-3 p-3.5 bg-blue-50/50">
                      <span className="text-gray-500">Reference:</span>
                      <span className="col-span-2 font-bold text-primary tracking-wide">DH{Math.floor(Math.random() * 89999 + 10000)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* ── COD ── */}
              {paymentMethod === "COD" && (
                <div className="mt-4 p-4 bg-orange-50/50 text-orange-800 rounded-xl border border-orange-100 flex gap-3 text-sm font-medium animate-in fade-in duration-300">
                  <Banknote className="w-5 h-5 shrink-0 text-orange-500" />
                  <div>
                    <p className="font-bold">Nhận hàng rồi thanh toán</p>
                    <p className="text-orange-700/80 text-xs mt-0.5">Phí thu hộ (COD) {formatVND(5000)} sẽ được áp dụng cho phương thức này.</p>
                  </div>
                </div>
              )}



            </section>
          </div>

          {/* RIGHT COLUMN: ORDER SUMMARY */}
          <div className="w-full lg:w-[380px] lg:sticky lg:top-24 order-1 lg:order-2 space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h2 className="text-lg font-bold mb-5 flex items-center justify-between">
                <span>Order Summary</span>
                <span className="bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full text-xs font-bold">{items.length} items</span>
              </h2>

              <div className="max-h-[350px] overflow-y-auto custom-scrollbar space-y-4 pr-2 mb-6">
                {items.map((item) => {
                  const vo = item.variantOptions;
                  return (
                    <div key={item.product.id} className="flex gap-3 items-start group">
                      <div className="relative w-16 h-16 rounded-xl border border-gray-100 bg-gray-50 overflow-hidden shrink-0">
                        {item.product.image ? (
                          <Image src={item.product.image} alt={item.product.name} fill className="object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xs text-gray-400"><Package className="h-6 w-6" /></div>
                        )}
                        <div className="absolute top-0 right-0 bg-black/60 text-white text-[10px] px-1.5 py-0.5 font-bold rounded-bl-lg">
                          x{item.quantity}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 line-clamp-2 leading-tight mb-1">{item.product.name}</p>
                        {/* Variant details */}
                        <div className="space-y-0.5">
                          {vo?.selectedColor && <p className="text-[11px] text-gray-500">Color: {vo.selectedColor}</p>}
                          {vo?.selectedGrip && <p className="text-[11px] text-gray-500">Grip: {vo.selectedGrip}</p>}
                          {vo?.selectedSize && <p className="text-[11px] text-gray-500">Size: EU {vo.selectedSize}</p>}
                          {vo?.selectedBagType && <p className="text-[11px] text-gray-500">Type: {vo.selectedBagType}</p>}
                          {vo?.selectedMaterial && <p className="text-[11px] text-gray-500">Material: {vo.selectedMaterial}</p>}
                          {vo?.selectedSpeed && <p className="text-[11px] text-gray-500">Speed: {vo.selectedSpeed}</p>}
                          {vo?.accessoryType && <p className="text-[11px] text-gray-500">Type: {vo.accessoryType}</p>}
                          {vo?.addStringingService && (
                            <div className="flex items-center gap-1 mt-1">
                              <Wrench className="w-3 h-3 text-primary" />
                              <span className="text-[11px] font-semibold text-primary">Stringing: {vo.stringType} @ {vo.stringTension} lbs</span>
                            </div>
                          )}
                          {!vo?.selectedColor && !vo?.selectedGrip && !vo?.selectedSize && !vo?.addStringingService && !vo?.selectedBagType && !vo?.accessoryType && (
                            <p className="text-[11px] text-gray-500">Variant: Standard</p>
                          )}
                        </div>
                      </div>
                      <div className="text-sm font-bold text-gray-800 shrink-0">
                        {formatVND((item.product.price || (item.product as any).basePrice || 0) * USD_TO_VND * item.quantity)}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Select Voucher Button */}
              <button
                onClick={() => setShowVouchers(true)}
                className="mb-6 flex w-full items-center justify-between rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-primary transition hover:bg-primary/10 hover:border-primary/30 active:scale-[0.99]"
              >
                <div className="flex items-center gap-3">
                  <Ticket size={18} className={selectedCoupon ? "text-primary" : "text-primary/60"} />
                  <div className="flex flex-col items-start gap-0.5">
                    <span className="text-sm font-bold">{selectedCoupon ? selectedCoupon.code : "Select Discount Code"}</span>
                    {selectedCoupon && <span className="text-xs text-primary/70">{selectedCoupon.program}</span>}
                  </div>
                </div>
                <ChevronRight size={18} className="text-primary/50" />
              </button>

              <div className="space-y-3 pt-5 border-t border-gray-100 text-sm font-medium text-gray-500">
                <div className="flex justify-between items-center">
                  <span>Subtotal</span>
                  <span className="text-gray-800">{formatVND(baseSubtotalVND)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Shipping Fee</span>
                  <span className="text-gray-800">{shippingFeeVND === 0 ? "Free" : formatVND(shippingFeeVND)}</span>
                </div>
                {selectedCoupon && (
                  <div className="flex justify-between items-center text-green-600 animate-in fade-in">
                    <span>Discount ({selectedCoupon.code})</span>
                    <span>-{formatVND(discountAmountVND)}</span>
                  </div>
                )}
                {paymentMethod === "COD" && (
                  <div className="flex justify-between items-center text-orange-600 animate-in fade-in">
                    <span>COD Fee</span>
                    <span>{formatVND(codFeeVND)}</span>
                  </div>
                )}
              </div>

              {/* Selected payment method indicator */}
              {currentPayment && (
                <div className="mt-4 flex items-center gap-2.5 p-3 rounded-xl border border-gray-100 bg-gray-50/50">
                  <PaymentIcon type={currentPayment.icon} size={24} />
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-bold text-gray-700">{currentPayment.label}</span>
                    <span className="text-[10px] text-gray-400 ml-1.5">{currentPayment.description}</span>
                  </div>
                  <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: currentPayment.color }} />
                </div>
              )}

              <div className="border-t border-gray-100 mt-5 pt-5 flex items-end justify-between">
                <div>
                  <div className="text-gray-500 text-sm font-medium">Grand Total</div>
                  <div className="text-[10px] text-gray-400 mt-0.5">(VAT Included)</div>
                </div>
                <div className="text-2xl font-black text-primary">
                  {formatVND(finalTotalVND)}
                </div>
              </div>

              <button
                onClick={onSubmit}
                disabled={isSubmitting || paymentProcessing}
                className="w-full h-[52px] bg-primary text-white font-bold text-base rounded-xl mt-6 shadow-lg shadow-primary/20 hover:-translate-y-0.5 transition-transform disabled:opacity-70 flex items-center justify-center gap-2 disabled:transform-none"
              >
                {isSubmitting ? <><Loader2 className="w-5 h-5 animate-spin" /> Processing...</> : (
                  <>
                    {paymentMethod === "MoMo" || paymentMethod === "VNPay" ? (
                      <>
                        <PaymentIcon type={currentPayment?.icon || "card"} size={20} />
                        Đặt hàng & Thanh toán {paymentMethod}
                      </>
                    ) : (
                      "Place Order & Pay"
                    )}
                  </>
                )}
              </button>
            </div>

            <div className="bg-white/50 px-6 py-4 rounded-xl flex items-center justify-between border border-gray-100 text-[10px] font-bold text-gray-500 uppercase tracking-tight">
              <span className="flex items-center gap-1.5"><Lock className="w-3.5 h-3.5" /> SSL 256-bit</span>
              <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
              <span className="flex items-center gap-1.5"><ArrowRight className="w-3.5 h-3.5" /> 7-day Return</span>
              <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> Authentic</span>
            </div>


          </div>
        </div>
      </main>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <FrequentlyPurchasedTogether
          productIds={items.map(item => item.product.id || (item.product as any)._id)}
        />
      </div>


      {/* TOAST NOTIFICATION */}
      {toast.show && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 px-6 py-3 rounded-xl shadow-xl flex items-center gap-3 font-semibold text-sm z-[99] animate-in slide-in-from-bottom-5 fade-in duration-300 ${toast.type === "success" ? "bg-gray-900 border border-gray-800 text-white" : "bg-white border text-red-600 border-red-100"}`}>
          {toast.type === "success" ? <CheckCircle2 className="w-5 h-5 text-green-400" /> : <ShieldCheck className="w-5 h-5 text-red-500" />}
          {toast.message}
        </div>
      )}

      {/* ── DISCOUNT SLIDING DRAWER ── */}
      <div
        className={`fixed inset-0 z-50 transition pointer-events-none ${showVouchers ? "pointer-events-auto" : ""}`}
        aria-hidden={!showVouchers}
      >
        <div
          className={`absolute inset-0 bg-black/50 backdrop-blur-sm transition duration-300 ${showVouchers ? "opacity-100" : "opacity-0"}`}
          onClick={() => setShowVouchers(false)}
        />
        <aside
          className={`absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-gray-50 shadow-2xl transition-transform duration-300 ease-in-out ${showVouchers ? "translate-x-0" : "translate-x-full"}`}
        >
          <div className="flex items-center justify-between border-b border-black/5 bg-white px-6 py-4 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] z-10">
            <h3 className="font-heading text-lg font-bold text-secondary">Vouchers</h3>
            <button
              onClick={() => setShowVouchers(false)}
              className="grid h-8 w-8 place-items-center rounded-full bg-black/5 text-secondary/60 transition hover:bg-black/10 hover:text-secondary"
            >
              <X size={16} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto pb-32">
            {/* Banner Section */}
            <div className="relative w-full h-32 bg-gradient-to-r from-orange-100 via-amber-100 to-yellow-100 overflow-hidden flex items-center px-6">
              <div className="z-10 w-2/3">
                <h2 className="text-xl font-black text-orange-800 leading-tight">Unlock Great <br />Savings Today!</h2>
                <p className="text-xs text-orange-700/80 mt-1 font-semibold">Apply codes below to save big.</p>
              </div>
              <div className="absolute -bottom-4 right-0 w-44 h-44 drop-shadow-2xl">
                <Image src="/images/voucher-banner.png" alt="Vouchers" fill className="object-contain" />
              </div>
              {/* Confetti / Shapes */}
              <div className="absolute top-2 right-1/2 w-3 h-3 rounded-full bg-red-400 animate-bounce delay-75" />
              <div className="absolute bottom-4 left-1/2 w-2 h-2 rounded-full bg-blue-400 animate-pulse delay-150" />
            </div>

            {/* Manual Code Entry */}
            <div className="bg-white px-6 py-5 border-b border-black/5 relative z-10 shadow-sm">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={manualCode}
                  onChange={e => setManualCode(e.target.value.toUpperCase())}
                  placeholder="Enter code manually..."
                  className="flex-1 rounded-xl border border-black/10 bg-gray-50 px-4 py-2.5 text-sm font-bold uppercase placeholder:font-medium placeholder:normal-case outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
                <button onClick={handleApplyCoupon} className="rounded-xl bg-secondary px-5 py-2.5 text-sm font-bold text-white transition hover:bg-black">
                  Apply
                </button>
              </div>
            </div>

            {/* Applicable Codes */}
            <div className="p-6">
              {applicableCoupons.length > 0 && (
                <div className="mb-8">
                  <h4 className="mb-4 text-sm font-black uppercase tracking-wider text-secondary flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-emerald-500" /> Applicable voucher
                  </h4>
                  <div className="space-y-4">
                    {applicableCoupons.map((c: any) => {
                      const isSelected = selectedCoupon?._id === c._id;
                      return (
                        <label
                          key={c._id}
                          className={`relative flex cursor-pointer rounded-2xl transition-all shadow-sm overflow-hidden group ${isSelected ? "ring-2 ring-primary ring-offset-2 scale-[1.01] shadow-lg" : "hover:scale-[1.01] hover:shadow-md"}`}
                        >
                          {/* Ticket Left Part (Value) */}
                          <div className={`flex w-24 flex-col items-center justify-center p-3 text-center transition-colors ${isSelected ? "bg-primary text-white" : "bg-gradient-to-br from-emerald-50 to-teal-50 border-r border-dashed border-emerald-200 text-emerald-800 group-hover:from-emerald-100 group-hover:border-emerald-300"}`}>
                            {c.discountType === "percent" ? (
                              <>
                                <span className="text-2xl font-black leading-none">{c.amount}%</span>
                                <span className="text-[10px] font-bold uppercase mt-1 opacity-80 text-center">OFF</span>
                              </>
                            ) : (
                              <>
                                <span className="text-[10px] font-bold uppercase mb-0.5 opacity-80">{c.code}</span>
                                <span className="text-xl font-black leading-none">${c.amount * USD_TO_VND / 1000}k</span>
                              </>
                            )}

                            {/* Cutouts for ticket effect */}
                            <div className="absolute -top-2 left-[5.5rem] w-4 h-4 rounded-full bg-gray-50 z-10 hidden sm:block" />
                            <div className="absolute -bottom-2 left-[5.5rem] w-4 h-4 rounded-full bg-gray-50 z-10 hidden sm:block" />
                          </div>

                          {/* Ticket Right Part (Details) */}
                          <div className={`flex flex-1 items-center justify-between border-y border-r border-black/5 bg-white p-4 transition-colors ${isSelected ? "bg-primary/5 border-primary/20" : ""}`}>
                            <div>
                              <div className="mb-1 flex items-center gap-2">
                                <span className={`font-mono text-sm font-bold px-2 py-0.5 rounded-md ${isSelected ? "bg-primary/10 text-primary" : "bg-black/5 text-secondary"}`}>{c.code}</span>
                                {c.maxDiscount && <span className="text-[10px] font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded">Max ${(c.maxDiscount * USD_TO_VND / 1000).toLocaleString('en-US')}k</span>}
                              </div>
                              <p className="text-xs font-semibold text-secondary/70 mb-1.5 leading-snug">{c.program}</p>
                              <div className="text-[10px] text-secondary/40 font-bold uppercase tracking-wide">
                                Expires: {new Date(c.expiresAt).toLocaleDateString()}
                              </div>
                              {c.usageLimit && (
                                <div className="mt-2 w-full pr-4">
                                  <div className="flex justify-between text-[9px] text-secondary/60 mb-1 font-bold uppercase tracking-wide">
                                    <span>Usage Progress</span>
                                    <span>{c.usageCount} / {c.usageLimit}</span>
                                  </div>
                                  <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                                    <div className="bg-primary h-1.5 rounded-full transition-all duration-500" style={{ width: `${Math.min((c.usageCount / c.usageLimit) * 100, 100)}%` }}></div>
                                  </div>
                                </div>
                              )}
                            </div>

                            <div className="pl-3 relative z-20">
                              <input
                                type="radio"
                                name="voucher"
                                checked={isSelected}
                                onChange={() => setSelectedCoupon(c)}
                                className="h-6 w-6 rounded-full border-gray-300 text-primary focus:ring-primary accent-primary cursor-pointer transition-transform hover:scale-110"
                              />
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Ineligible Codes */}
              {ineligibleCoupons.length > 0 && (
                <div>
                  <h4 className="mb-4 text-sm font-black uppercase tracking-wider text-secondary/40 flex items-center gap-2">
                    <Ticket size={16} className="text-secondary/40" /> Other Codes
                  </h4>
                  <div className="space-y-4 opacity-75">
                    {ineligibleCoupons.map((c: any) => {
                      const neededVND = c.minOrderValue ? (c.minOrderValue * USD_TO_VND) - baseSubtotalVND : 0;
                      return (
                        <div key={c._id} className="relative flex rounded-2xl transition-all shadow-sm overflow-hidden grayscale pointer-events-none">
                          {/* Ticket Left Part */}
                          <div className="flex w-24 flex-col items-center justify-center p-3 text-center bg-gray-200 border-r border-dashed border-gray-300 text-gray-500">
                            {c.discountType === "percent" ? (
                              <>
                                <span className="text-2xl font-black leading-none">{c.amount}%</span>
                                <span className="text-[10px] font-bold uppercase mt-1 opacity-80">OFF</span>
                              </>
                            ) : (
                              <>
                                <span className="text-[10px] font-bold uppercase mb-0.5 opacity-80">{c.code}</span>
                                <span className="text-xl font-black leading-none">${c.amount * USD_TO_VND / 1000}k</span>
                              </>
                            )}
                          </div>

                          {/* Ticket Right Part */}
                          <div className="flex flex-1 flex-col justify-center border-y border-r border-black/5 bg-gray-50 p-4">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-mono text-sm font-bold px-2 py-0.5 rounded-md bg-gray-200 text-gray-600">{c.code}</span>
                            </div>
                            <p className="text-xs font-semibold text-gray-500 mb-2 leading-snug">{c.program}</p>

                            {/* Upsell Suggestion overlayed to pop out even inside grayscale */}
                            {c.usedByCurrentUser ? (
                              <div className="mt-1 rounded border border-gray-300 bg-gray-200/80 px-2.5 py-1.5 text-[11px] font-bold text-gray-600">
                                🔒 Already Used
                              </div>
                            ) : (c.usageLimit && c.usageCount >= c.usageLimit) ? (
                              <div className="mt-1 rounded border border-gray-300 bg-gray-200/80 px-2.5 py-1.5 text-[11px] font-bold text-gray-600">
                                🔒 Out of Uses
                              </div>
                            ) : neededVND > 0 ? (
                              <div className="mt-1 rounded border border-gray-300 bg-gray-200/80 px-2.5 py-1.5 text-[11px] font-bold text-gray-600">
                                🔒 Add <span className="font-black text-gray-800">{formatVND(neededVND)}</span> to unlock
                              </div>
                            ) : null}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="absolute bottom-0 left-0 w-full border-t border-black/5 bg-white p-6 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)]">
            <div className="mb-3 flex justify-between text-sm font-semibold">
              <span className="text-secondary/60">Selected:</span>
              {selectedCoupon ? (
                <span className="text-primary font-bold">{selectedCoupon.code} selected</span>
              ) : (
                <span className="text-secondary">None</span>
              )}
            </div>
            <button
              onClick={() => setShowVouchers(false)}
              className="w-full rounded-2xl bg-secondary px-6 py-4 text-sm font-bold text-white shadow-lg transition active:scale-[0.98] active:bg-black"
            >
              CONFIRM SELECTION
            </button>
          </div>
        </aside>
      </div>
      <Footer />
    </div>
  );
}
