import { confirmAction } from "../../components/ConfirmModal";
import Head from "next/head";
import { useEffect, useState, useRef, useMemo } from "react";
import Link from "next/link";
import { Layout } from "../../components/Layout";
import { fetchProfile, updateProfile, uploadImage, fetchUserOrders, fetchNotifications, markNotificationRead, markAllNotificationsRead, createReview, cancelUserOrder, confirmReceipt, requestReturn, requestRefund, fetchUserReviews, updateReview, getPaymentStatus } from "../../lib/api";
import { useRouter } from "next/router";
import { User, Package, Bell, Ticket, Camera, Save, Lock, MapPin, CheckCircle2, Clock, ChevronDown, ChevronRight, Plus, Trash2, ShoppingCart, Truck, Eye, Star, X, } from "lucide-react";
import Image from "next/image";

type OrderStatus = "paid" | "pending" | "confirmed" | "delivered" | "received" | "returned" | "cancelled" | "refund_requested";
const statusLabel: Partial<Record<OrderStatus, string>> = {
  pending: "Pending Confirmation",
  paid: "Pending Confirmation",
  confirmed: "Pending Delivery",
  delivered: "Delivered",
  received: "Received",
  returned: "Returned",
  cancelled: "Cancelled",
  refund_requested: "Refund Requested",
};

const tabs = [
  { key: "pending", label: "Pending Confirmation", icon: "⏳", color: "text-amber-600 bg-amber-50 border-amber-200" },
  { key: "confirmed", label: "Pending Delivery", icon: "📦", color: "text-blue-600 bg-blue-50 border-blue-200" },
  { key: "delivered", label: "Delivered", icon: "🚚", color: "text-purple-600 bg-purple-50 border-purple-200" },
  { key: "received", label: "Received", icon: "✅", color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
  { key: "cancelled", label: "Returned / Cancelled", icon: "↩️", color: "text-red-600 bg-red-50 border-red-200" },
] as const;

type TabKey = typeof tabs[number]["key"];

const statusBadge: Record<string, { label: string; cls: string }> = {
  pending: { label: "Pending Confirmation", cls: "bg-amber-100 text-amber-700" },
  paid: { label: "Pending Confirmation", cls: "bg-amber-100 text-amber-700" },
  confirmed: { label: "Pending Delivery", cls: "bg-blue-100 text-blue-700" },
  delivered: { label: "Delivered", cls: "bg-purple-100 text-purple-700" },
  received: { label: "Received", cls: "bg-emerald-100 text-emerald-700" },
  returned: { label: "Returned", cls: "bg-red-100 text-red-700" },
  cancelled: { label: "Cancelled", cls: "bg-red-100 text-red-700" },
  refund_requested: { label: "Refund Requested", cls: "bg-orange-100 text-orange-700" },
};

export default function ProfilePurchasesPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"profile" | "address" | "password" | "purchases" | "notifications" | "vouchers">("purchases");
  const [isProfileExpanded, setIsProfileExpanded] = useState(false);

  // Auth & Data
  const [token, setToken] = useState<string | null>(null);
  const [account, setAccount] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [activeOrder, setActiveOrder] = useState<any | null>(null);

  // Purchases states
  const [activePurchaseTab, setActivePurchaseTab] = useState<TabKey>("pending");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [returnModal, setReturnModal] = useState<string | null>(null);
  const [returnReason, setReturnReasonText] = useState("");
  const [refundModal, setRefundModal] = useState<string | null>(null);
  const [refundReasonPreset, setRefundReasonPreset] = useState("");
  const [refundReasonCustom, setRefundReasonCustom] = useState("");
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<any[]>([]);

  // Form States
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState("");
  const [dob, setDob] = useState("");
  const [avatar, setAvatar] = useState("");

  // Address States
  const [addressList, setAddressList] = useState<string[]>([]);
  const [primaryAddress, setPrimaryAddress] = useState("");
  const [newAddressText, setNewAddressText] = useState("");
  const [isAddingAddress, setIsAddingAddress] = useState(false);

  // Password States
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  // Review States
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewProductId, setReviewProductId] = useState<string | null>(null);
  const [reviewProductName, setReviewProductName] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState("");
  const [reviewComment, setReviewComment] = useState("");
  const [reviewTags, setReviewTags] = useState("");
  const [reviewImages, setReviewImages] = useState<string[]>([]);
  const [reviewVideos, setReviewVideos] = useState<string[]>([]);
  const [reviewedItems, setReviewedItems] = useState<string[]>([]);
  const [userReviews, setUserReviews] = useState<any[]>([]);
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredOrders = useMemo(() => {
    if (activePurchaseTab === "cancelled") {
      return orders.filter((o) => o.status === "returned" || o.status === "cancelled" || o.status === "refund_requested");
    }
    if (activePurchaseTab === "pending") {
      return orders.filter((o) => o.status === "pending" || o.status === "paid");
    }
    return orders.filter((o) => o.status === activePurchaseTab);
  }, [orders, activePurchaseTab]);

  const purchaseTabCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    tabs.forEach((t) => {
      if (t.key === "cancelled") {
        counts[t.key] = orders.filter((o) => o.status === "returned" || o.status === "cancelled" || o.status === "refund_requested").length;
      }
      else if (t.key === "pending") {
        counts[t.key] = orders.filter((o) => o.status === "pending" || o.status === "paid").length;
      }
      else {
        counts[t.key] = orders.filter((o) => o.status === t.key).length;
      }
    });
    return counts;
  }, [orders]);

  const handleCancel = async (orderId: string) => {
    if (!(await confirmAction("Are you sure you want to delete this?"))) return;
    if (!token || !confirm("Are you sure you want to cancel this order?")) return;
    setActionLoading(orderId);
    try {
      await cancelUserOrder(orderId, token);
      setOrders((prev) => prev.map((o) => (o._id === orderId || o.id === orderId) ? { ...o, status: "cancelled" } : o));
    } catch (e: any) {
      alert(e?.response?.data?.error || "Failed to cancel order");
    } finally {
      setActionLoading(null);
    }
  };

  const handleConfirmReceipt = async (orderId: string) => {
    if (!token || !confirm("Confirm that you have received this order?")) return;
    setActionLoading(orderId);
    try {
      await confirmReceipt(orderId, token);
      setOrders((prev) => prev.map((o) => (o._id === orderId || o.id === orderId) ? { ...o, status: "received" } : o));
    } catch (e: any) {
      alert(e?.response?.data?.error || "Failed to confirm receipt");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRequestReturn = async (orderId: string) => {
    if (!token || !returnReason.trim()) return;
    setActionLoading(orderId);
    try {
      await requestReturn(orderId, returnReason.trim(), token);
      setReturnModal(null);
      setReturnReasonText("");
      setOrders((prev) => prev.map((o) => (o._id === orderId || o.id === orderId) ? { ...o, refundStatus: "requested", returnReason: returnReason.trim() } : o));
      alert("Return request submitted. The admin will review your request.");
    } catch (e: any) {
      alert(e?.response?.data?.error || "Failed to submit return request");
    } finally {
      setActionLoading(null);
    }
  };

  const REFUND_REASONS = [
    { value: "defective_product", label: "🔧 Defective product" },
    { value: "wrong_item", label: "📦 Wrong item received" },
    { value: "out_of_stock", label: "❌ Product out of stock" },
    { value: "changed_mind", label: "🤔 Changed my mind" },
    { value: "found_cheaper", label: "💰 Found a cheaper price" },
    { value: "duplicate_order", label: "🔁 Duplicate order" },
    { value: "other", label: "✏️ Other (specify below)" },
  ];

  const handleRequestRefund = async (orderId: string) => {
    const reason = refundReasonPreset === "other" ? refundReasonCustom.trim() : REFUND_REASONS.find(r => r.value === refundReasonPreset)?.label.replace(/^[^\s]+\s/, '') || refundReasonCustom.trim();
    if (!token || !reason) return;
    setActionLoading(orderId);
    try {
      await requestRefund(orderId, reason, token);
      setRefundModal(null);
      setRefundReasonPreset("");
      setRefundReasonCustom("");
      setOrders((prev) => prev.map((o) => (o._id === orderId || o.id === orderId) ? { ...o, status: "refund_requested", refundStatus: "requested", cancelReason: reason } : o));
      alert("Refund request submitted. The admin will review and process your refund.");
    } catch (e: any) {
      alert(e?.response?.data?.error || "Failed to submit refund request");
    } finally {
      setActionLoading(null);
    }
  };

  const oid = (o: any) => o._id || o.id || "";

  useEffect(() => {
    if (typeof window === "undefined") return;
    const t = localStorage.getItem("accessToken");
    if (!t) {
      router.push("/login?next=/profile");
      return;
    }
    setToken(t);

    Promise.all([
      fetchProfile(t),
      fetchUserOrders(t).catch(() => {
        const raw = localStorage.getItem("orders");
        return raw ? JSON.parse(raw) : [];
      }),
      fetchUserReviews(t).catch(() => [])
    ]).then(([profileRes, ordersRes, reviewsRes]) => {
      setAccount({ ...profileRes, id: profileRes.id || profileRes._id });
      setName(profileRes.name || "");
      setEmail(profileRes.email || "");
      setPhone(profileRes.phone || "");
      setGender(profileRes.gender || "");
      setDob(profileRes.dob || "");
      setAvatar(profileRes.avatar || "");
      setPrimaryAddress(profileRes.address || "");
      setAddressList(profileRes.addressList || []);

      const ords = Array.isArray(ordersRes) ? ordersRes.reverse() : [];
      setOrders(ords);
      if (ords.length > 0) setActiveOrder(ords[0]);

      const rvs = Array.isArray(reviewsRes) ? reviewsRes : [];
      setUserReviews(rvs);
      setReviewedItems(rvs.map((r: any) => r.product));

    }).catch(() => {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("user");
      router.push("/login?next=/profile");
    }).finally(() => setLoading(false));
  }, []);

  // Handle URL ?tab= query parameter
  useEffect(() => {
    const tab = router.query.tab as string;
    if (tab === "notifications") {
      setActiveTab("notifications");
      setIsProfileExpanded(false);
    }
  }, [router.query.tab]);

  // Fetch notifications when tab is active
  useEffect(() => {
    if (activeTab !== "notifications" || !token) return;
    fetchNotifications(token)
      .then((data) => setNotifications(Array.isArray(data) ? data : []))
      .catch(() => setNotifications([]));
  }, [activeTab, token]);

  const handleAvatarSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !token) return;
    try {
      setIsSubmitting(true);
      const url = await uploadImage(file);
      setAvatar(url);
      await updateProfile({ avatar: url }, token);
      setMessage({ type: "success", text: "Profile picture updated!" });
    } catch (err) {
      setMessage({ type: "error", text: "Failed to upload image." });
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setMessage({ type: "", text: "" }), 3000);
    }
  };

  const handleSave = async (scope: "profile" | "address" | "password") => {
    if (!token) return;
    try {
      setIsSubmitting(true);
      const payload: any = {};

      if (scope === "profile") {
        payload.name = name;
        payload.email = email;
        payload.phone = phone;
        payload.gender = gender;
        payload.dob = dob;
      } else if (scope === "address") {
        payload.addressList = addressList;
        payload.address = primaryAddress;
      } else if (scope === "password") {
        if (!oldPassword || !newPassword) {
          throw new Error("Please enter both old and new passwords.");
        }
        payload.oldPassword = oldPassword;
        payload.newPassword = newPassword;
      }

      const updated = await updateProfile(payload, token);
      setAccount(updated);

      if (scope === "profile") {
        const rawUser = localStorage.getItem("user");
        if (rawUser) {
          const u = JSON.parse(rawUser);
          localStorage.setItem("user", JSON.stringify({ ...u, name: updated.name }));
          window.dispatchEvent(new Event("auth:user-updated"));
        }
      }

      if (scope === "password") {
        setOldPassword("");
        setNewPassword("");
      }

      setMessage({ type: "success", text: "Information updated successfully!" });
    } catch (err: any) {
      setMessage({ type: "error", text: err?.message || err?.response?.data?.error || "Failed to update information." });
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setMessage({ type: "", text: "" }), 4000);
    }
  };

  const addAddress = () => {
    if (!newAddressText.trim()) return;
    const nextList = [...addressList, newAddressText.trim()];
    setAddressList(nextList);
    if (!primaryAddress) setPrimaryAddress(newAddressText.trim());
    setNewAddressText("");
    setIsAddingAddress(false);
  };

  const removeAddress = async (idx: number) => {
    if (!(await confirmAction("Are you sure you want to delete this?"))) return;
    const txt = addressList[idx];
    const nextList = addressList.filter((_, i) => i !== idx);
    setAddressList(nextList);
    if (primaryAddress === txt) {
      setPrimaryAddress(nextList[0] || "");
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Head>
        <title>My Account | Badminton Hub</title>
      </Head>
      <section className="section-padding bg-gray-50/30 min-h-[80vh]">
        <div className="container-default">
          <div className="mb-8">
            <h1 className="font-heading text-3xl font-semibold text-secondary">My Account</h1>
            <p className="mt-2 text-secondary/70">Manage your connected experiences and settings.</p>
          </div>

          <div className="grid gap-8 lg:grid-cols-[250px_1fr]">
            {/* Sidebar Navigation */}
            <div className="space-y-1 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5 h-fit">
              {/* Profile Summary */}
              {account && (
                <div className="mb-6 rounded-2xl bg-red-to-br from-red-900 to-red-800 p-5 text-black shadow-lg mx-auto text-center relative overflow-hidden">

                  <div className="relative mx-auto mb-3 h-16 w-16 overflow-hidden rounded-full border-2 border-white/20 bg-gray-700">
                    {account.avatar ? (
                      <Image src={account.avatar} alt="Avatar" fill className="object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <User className="h-8 w-8 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <h3 className="font-bold text-lg leading-tight line-clamp-1 relative z-10">{account.name || "Your Name"}</h3>

                  {/* Tiers display */}
                  <div className="mt-3 flex flex-wrap justify-center gap-2 relative z-10">
                    {account.membershipTier && (
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold shadow-sm
                                  ${account.membershipTier === "Bronze" ? "bg-amber-700/80 text-amber-100 border border-amber-500/30" :
                          account.membershipTier === "Silver" ? "bg-slate-300 text-slate-800 border border-slate-400/50" :
                            account.membershipTier === "Gold" ? "bg-yellow-400 text-yellow-900 border border-yellow-500/50" :
                              account.membershipTier === "Diamond" ? "bg-cyan-300 text-cyan-900 border border-cyan-400/50" :
                                "bg-primary/20 text-black"}`}>
                        {account.membershipTier} Member
                      </span>
                    )}
                    <span className="inline-flex items-center rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-semibold text-black border border-white/10">
                      <Star className="mr-1 h-3 w-3 text-yellow-400 fill-yellow-400" />
                      {account.points || 0} pts
                    </span>
                  </div>
                </div>
              )}

              {/* Personal Profile Collapsible */}
              <div>
                <div
                  className={`flex flex-row items-center justify-between w-full rounded-xl px-4 py-3 text-left text-sm font-semibold transition-colors ${activeTab === "profile" ? "bg-primary/10 text-primary" : "text-secondary hover:bg-gray-100"}`}
                >
                  <Link href="/profile" className="flex items-center gap-3 flex-1" onClick={() => setIsProfileExpanded(true)}>
                    <User className="h-5 w-5" />
                    Personal Profile
                  </Link>
                  <button onClick={() => setIsProfileExpanded(!isProfileExpanded)}>
                    {isProfileExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </button>
                </div>

                {isProfileExpanded && (
                  <div className="mt-1 ml-4 pl-4 border-l-2 border-primary/20 space-y-1 animate-in slide-in-from-top-2 duration-200">
                    <Link
                      href="/profile/address"
                      className={`flex flex-row items-center gap-2 w-full rounded-lg px-3 py-2 text-left text-sm font-semibold transition-colors ${activeTab === "address" ? "text-primary bg-primary/5" : "text-secondary/70 hover:text-secondary hover:bg-gray-50"}`}
                    >
                      <MapPin className="h-4 w-4" />
                      Address Book
                    </Link>
                    <Link
                      href="/profile/password"
                      className={`flex flex-row items-center gap-2 w-full rounded-lg px-3 py-2 text-left text-sm font-semibold transition-colors ${activeTab === "password" ? "text-primary bg-primary/5" : "text-secondary/70 hover:text-secondary hover:bg-gray-50"}`}
                    >
                      <Lock className="h-4 w-4" />
                      Change Password
                    </Link>
                  </div>
                )}
              </div>

              {[
                { id: "purchases", label: "My Purchases", icon: Package },
                { id: "notifications", label: "Notifications", icon: Bell },
                { id: "vouchers", label: "Vouchers", icon: Ticket },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <Link
                    key={tab.id}
                    href={`/profile/${tab.id}`}
                    className={`flex flex-row items-center gap-3 w-full rounded-xl px-4 py-3 text-left text-sm font-semibold transition-colors mt-1
                      ${isActive ? "bg-primary/10 text-primary" : "text-secondary hover:bg-gray-100"}`}
                  >
                    <Icon className="h-5 w-5" />
                    {tab.label}
                  </Link>
                );
              })}
            </div>

            {/* Main Content Area */}
            <div className="rounded-2xl bg-white shadow-sm ring-1 ring-black/5 overflow-hidden">

              {message.text && activeTab !== "purchases" && activeTab !== "notifications" && activeTab !== "vouchers" && (
                <div className={`m-6 mb-0 rounded-xl p-4 text-sm font-semibold ${message.type === "success" ? "bg-green-50 text-green-700 ring-1 ring-green-600/20" : "bg-red-50 text-red-700 ring-1 ring-red-600/20"}`}>
                  {message.text}
                </div>
              )}







              {activeTab === "purchases" && (
                <div className="p-6 sm:p-8 space-y-6 animate-in fade-in duration-300 bg-gray-50/30">
                  {/* Tab navigation */}
                  <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    {tabs.map((tab) => (
                      <button
                        key={tab.key}
                        onClick={() => setActivePurchaseTab(tab.key)}
                        className={`flex items-center gap-2 whitespace-nowrap rounded-2xl border px-4 py-3 text-sm font-semibold transition-all ${activePurchaseTab === tab.key
                          ? `${tab.color} shadow-sm`
                          : "border-black/5 bg-white text-secondary/70 hover:bg-gray-50"
                          }`}
                      >
                        <span>{tab.icon}</span>
                        <span>{tab.label}</span>
                        {purchaseTabCounts[tab.key] > 0 && (
                          <span
                            className={`ml-1 flex h-5 min-w-5 items-center justify-center rounded-full text-[10px] font-bold ${activePurchaseTab === tab.key
                              ? "bg-white/80 text-secondary"
                              : "bg-black/5 text-secondary/60"
                              }`}
                          >
                            {purchaseTabCounts[tab.key]}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Empty state */}
                  {!loading && !filteredOrders.length && (
                    <div className="rounded-2xl border border-black/5 bg-white p-12 text-center shadow-sm">
                      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-50 text-3xl">
                        {tabs.find((t) => t.key === activePurchaseTab)?.icon || "📋"}
                      </div>
                      <h3 className="font-heading text-lg font-semibold text-secondary">No orders here</h3>
                      <p className="mt-1 text-sm text-secondary/60">
                        {activePurchaseTab === "pending" && "Orders waiting for admin confirmation will appear here."}
                        {activePurchaseTab === "confirmed" && "Orders confirmed and being prepared for delivery."}
                        {activePurchaseTab === "delivered" && "Delivered orders where you can confirm receipt or request return."}
                        {activePurchaseTab === "received" && "Orders you've confirmed receiving."}
                        {activePurchaseTab === "cancelled" && "Returned or cancelled orders will appear here."}
                      </p>
                    </div>
                  )}

                  {/* Orders list */}
                  <div className="space-y-4">
                    {filteredOrders.slice().reverse().map((o) => {
                      const id = oid(o);
                      const badge = statusBadge[o.status] || { label: o.status, cls: "bg-gray-100 text-gray-600" };
                      const isActioning = actionLoading === id;

                      return (
                        <div key={id} className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm transition hover:shadow-md">
                          {/* Order header */}
                          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/5 bg-gray-50/50 px-5 py-3">
                            <div className="flex items-center gap-4">
                              <div>
                                <p className="font-semibold text-secondary">#{String(id).slice(-8).toUpperCase()}</p>
                                <p className="text-xs text-secondary/50">{new Date(o.createdAt).toLocaleString()}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              {o.trackingNumber && (
                                <span className="rounded-lg bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-600">
                                  🔗 {o.trackingNumber}
                                </span>
                              )}
                              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${badge.cls}`}>
                                {badge.label}
                              </span>
                            </div>
                          </div>

                          {/* Items */}
                          <div className="divide-y divide-black/5 px-5">
                            {o.items.map((it: any, idx: number) => {
                              const name = it.product?.name || it.name || "Unknown Product";
                              const image = it.product?.image || it.image || "";
                              const price = Number(it.price || 0);
                              const qty = Number(it.quantity || 1);
                              return (
                                <div key={idx} className="flex items-center justify-between gap-4 py-4">

                                  <div className="flex items-center gap-3">
                                    <div className="relative h-14 w-14 overflow-hidden rounded-xl bg-gray-50 ring-1 ring-black/5">
                                      <Link href={`/products/${it.product?.slug || it.product?._id}`} className="flex items-center gap-3">
                                        {image && <Image src={image} alt={name} fill className="object-cover" />}
                                      </Link>
                                    </div>
                                    <div>
                                      <Link href={`/products/${it.product?.slug || it.product?._id}`} className="flex items-center gap-3">
                                        <p className="text-sm font-semibold text-secondary line-clamp-1">{name}</p>
                                      </Link>
                                      <p className="text-xs text-secondary/50">Qty: {qty} × ${price.toFixed(2)}</p>
                                    </div>
                                  </div>
                                  <div className="flex flex-col items-end gap-2">
                                    <div className="text-sm font-bold text-secondary">${(price * qty).toFixed(2)}</div>
                                    {o.status === "received" && (
                                      reviewedItems.includes(it.product?.id || it.product?._id) ? (
                                        <div className="flex gap-2">
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              router.push(`/products/${it.product?.slug || it.product?.id || it.product?._id}`);
                                            }}
                                            className="text-xs font-bold text-white bg-primary hover:bg-primary/90 px-3 py-1.5 rounded-lg transition"
                                          >
                                            Buy Again
                                          </button>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              const existingReview = userReviews.find(r => r.product === (it.product?.id || it.product?._id));
                                              if (existingReview) {
                                                setReviewProductId(it.product?.id || it.product?._id || "");
                                                setReviewProductName(name);
                                                setEditingReviewId(existingReview._id);
                                                setReviewTitle(existingReview.title || "");
                                                setReviewComment(existingReview.comment || "");
                                                setReviewRating(existingReview.rating || 5);
                                                setReviewTags(existingReview.tags ? existingReview.tags.join(", ") : "");
                                                setReviewImages(existingReview.images || []);
                                                setReviewVideos(existingReview.videos || []);
                                                setReviewModalOpen(true);
                                              }
                                            }}
                                            className="text-xs font-bold text-primary hover:underline border border-primary/20 px-3 py-1.5 rounded-lg bg-primary/5 transition hover:bg-primary/10"
                                          >
                                            View Rating
                                          </button>

                                        </div>
                                      ) : (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setReviewProductId(it.product?.id || it.product?._id || "");
                                            setReviewProductName(name);
                                            setEditingReviewId(null);
                                            setReviewTitle("");
                                            setReviewComment("");
                                            setReviewRating(5);
                                            setReviewTags("");
                                            setReviewImages([]);
                                            setReviewVideos([]);
                                            setReviewModalOpen(true);
                                          }}
                                          className="text-xs font-bold text-primary hover:underline border border-primary/20 px-3 py-1.5 rounded-lg bg-primary/5 transition hover:bg-primary/10"
                                        >
                                          Write Review
                                        </button>
                                      )
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* Order summary */}
                          <div className="border-t border-black/5 bg-gray-50/30 px-5 py-4">
                            <div className="flex flex-wrap items-end justify-between gap-4">
                              <div className="space-y-1 text-sm text-secondary/60">
                                <div className="flex gap-6">
                                  <span>Subtotal: <b className="text-secondary">${o.subtotal.toFixed(2)}</b></span>
                                  <span>Shipping: <b className="text-secondary">
                                    {Number(o.shippingFee ?? o.shipping ?? 0) === 0 ? "Free" : `$${Number(o.shippingFee ?? o.shipping ?? 0).toFixed(2)}`}
                                  </b></span>
                                </div>
                                <div className="flex items-center gap-6">
                                  {o.payment && <p className="text-xs">Payment: {o.payment === "cod" ? "Cash on Delivery" : o.payment === "bank" ? "Bank Transfer" : o.payment}</p>}
                                  {o.paymentInfo?.status === "success" && <div className="bg-green-100 w-fit px-2 py-1 rounded-lg text-xs text-green-600">✅ Payment Successful </div>}
                                  {o.paymentInfo?.status === "failed" && <div className="bg-red-100 w-fit px-2 py-1 rounded-lg text-xs text-red-600">❌ Payment failed </div>}
                                </div>
                              </div>
                              <div className="text-right">
                                {o.discountAmount > 0 && <p className="text-xs text-red-600">Discount: -${o.discountAmount}</p>}
                                <p className="text-xs text-secondary/50">Total</p>
                                <p className="text-xl font-bold text-secondary">${o.total.toFixed(2)}</p>
                              </div>
                            </div>
                          </div>

                          {/* Action buttons per status */}
                          {o.status === "pending" && (
                            <div className="flex items-center justify-end gap-3 border-t border-black/5 px-5 py-3">
                              <button
                                disabled={isActioning}
                                onClick={() => handleCancel(id)}
                                className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-100 disabled:opacity-50"
                              >
                                {isActioning ? "Cancelling..." : "Cancel Order"}
                              </button>
                            </div>
                          )}

                          {o.status === "paid" && (
                            <div className="flex items-center justify-end gap-3 border-t border-black/5 px-5 py-3">
                              <button
                                disabled={isActioning}
                                onClick={() => setRefundModal(id)}
                                className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-100 disabled:opacity-50"
                              >
                                {isActioning ? "Processing..." : "Cancel and Refund"}
                              </button>
                            </div>
                          )}

                          {o.status === "refund_requested" && (
                            <div className="border-t border-black/5 px-5 py-3 bg-orange-50/50">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
                                <span className="text-sm font-bold text-orange-700">Refund Request Pending Review</span>
                              </div>
                              {o.cancelReason && <p className="text-xs text-secondary/60 ml-4">Reason: <span className="font-semibold text-secondary">{o.cancelReason}</span></p>}
                            </div>
                          )}

                          {o.status === "delivered" && (
                            <div className="flex items-center justify-end gap-3 border-t border-black/5 px-5 py-3">
                              <button
                                disabled={isActioning}
                                onClick={() => setReturnModal(id)}
                                className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700 transition hover:bg-amber-100 disabled:opacity-50"
                              >
                                Request Return
                              </button>
                              <button
                                disabled={isActioning}
                                onClick={() => handleConfirmReceipt(id)}
                                className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600 disabled:opacity-50"
                              >
                                {isActioning ? "Confirming..." : "✓ Confirm Receipt"}
                              </button>
                            </div>
                          )}

                          {o.status === "returned" && (
                            <div className="border-t border-black/5 px-5 py-3 bg-green-50/30">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-green-600">✅</span>
                                <span className="text-sm font-bold text-green-700">Refund Completed</span>
                              </div>
                              {(o.returnReason || o.cancelReason) && <p className="text-xs text-secondary/60 ml-6">Reason: <span className="font-semibold text-secondary">{o.returnReason || o.cancelReason}</span></p>}
                              {o.refundAmount && <p className="text-xs text-green-600 ml-6 font-semibold">Refund amount: ${o.refundAmount.toFixed(2)}</p>}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}




            </div>
          </div>
        </div>
      </section>

      {/* Return Reason Modal */}
      {returnModal && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-black/40 p-4 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) { setReturnModal(null); setReturnReasonText(""); } }}>
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl animate-in zoom-in-95">
            <h3 className="font-heading text-xl font-semibold text-secondary">Request Return</h3>
            <p className="mt-1 text-sm text-secondary/60">Please provide a reason for your return request. The admin will review and respond.</p>
            <textarea
              className="mt-4 w-full rounded-xl border border-black/10 bg-gray-50 px-4 py-3 text-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              rows={4}
              placeholder="Describe why you want to return this order..."
              value={returnReason}
              onChange={(e) => setReturnReasonText(e.target.value)}
            />
            <div className="mt-4 flex items-center justify-end gap-3">
              <button
                onClick={() => { setReturnModal(null); setReturnReasonText(""); }}
                className="rounded-xl border border-black/10 px-4 py-2 text-sm font-semibold text-secondary transition hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                disabled={!returnReason.trim() || actionLoading === returnModal}
                onClick={() => handleRequestReturn(returnModal)}
                className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:opacity-50"
              >
                {actionLoading === returnModal ? "Submitting..." : "Submit Return Request"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Refund Request Modal */}
      {refundModal && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-black/40 p-4 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) { setRefundModal(null); setRefundReasonPreset(""); setRefundReasonCustom(""); } }}>
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-lg">💸</div>
              <div>
                <h3 className="font-heading text-xl font-semibold text-secondary">Request Refund</h3>
                <p className="text-xs text-secondary/50">Your order payment will be refunded after admin review</p>
              </div>
            </div>
            <p className="mt-3 text-sm text-secondary/60">Please select a reason for requesting a refund:</p>

            <div className="mt-4 space-y-2">
              {REFUND_REASONS.map((r) => (
                <label
                  key={r.value}
                  className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium cursor-pointer transition-all ${refundReasonPreset === r.value
                    ? "border-orange-400 bg-orange-50 text-orange-800 shadow-sm"
                    : "border-black/10 bg-gray-50 text-secondary/80 hover:bg-gray-100"
                    }`}
                >
                  <input
                    type="radio"
                    name="refund_reason"
                    value={r.value}
                    checked={refundReasonPreset === r.value}
                    onChange={() => setRefundReasonPreset(r.value)}
                    className="accent-orange-500"
                  />
                  {r.label}
                </label>
              ))}
            </div>

            {refundReasonPreset === "other" && (
              <textarea
                className="mt-3 w-full rounded-xl border border-black/10 bg-gray-50 px-4 py-3 text-sm transition focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-200"
                rows={3}
                placeholder="Please describe your reason..."
                value={refundReasonCustom}
                onChange={(e) => setRefundReasonCustom(e.target.value)}
              />
            )}

            <div className="mt-5 flex items-center justify-end gap-3">
              <button
                onClick={() => { setRefundModal(null); setRefundReasonPreset(""); setRefundReasonCustom(""); }}
                className="rounded-xl border border-black/10 px-4 py-2 text-sm font-semibold text-secondary transition hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                disabled={!refundReasonPreset || (refundReasonPreset === "other" && !refundReasonCustom.trim()) || actionLoading === refundModal}
                onClick={() => handleRequestRefund(refundModal)}
                className="rounded-xl bg-gradient-to-r from-orange-500 to-red-500 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:opacity-50"
              >
                {actionLoading === refundModal ? "Submitting..." : "Submit Refund Request"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {reviewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl relative animate-in zoom-in-95 duration-200">
            <button onClick={() => setReviewModalOpen(false)} className="absolute top-4 right-4 p-2 text-secondary/50 hover:text-secondary rounded-full hover:bg-gray-100">
              <Plus className="w-5 h-5 rotate-45" />
            </button>
            <h2 className="text-xl font-bold text-secondary mb-1">Rate Product</h2>
            <p className="text-sm text-secondary/60 mb-6 font-semibold line-clamp-1">{reviewProductName}</p>

            <div className="space-y-4">
              <div className="flex justify-center gap-2 mb-2">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button key={s} type="button" onClick={() => setReviewRating(s)}>
                    <Star size={36} className={s <= reviewRating ? "text-amber-400" : "text-gray-200"} fill={s <= reviewRating ? "currentColor" : "none"} />
                  </button>
                ))}
              </div>

              <div>
                <label className="text-sm font-semibold text-secondary mb-1.5 block">Review Title</label>
                <input value={reviewTitle} onChange={(e) => setReviewTitle(e.target.value)} placeholder="Sum up your experience" className="w-full rounded-xl border border-black/10 bg-gray-50/50 px-4 py-3 text-sm focus:border-primary focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10" />
              </div>

              <div>
                <label className="text-sm font-semibold text-secondary mb-1.5 block">Detailed Feedback</label>
                <textarea value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} placeholder="How is the quality? Was the delivery fast?" rows={4} className="w-full rounded-xl border border-black/10 bg-gray-50/50 px-4 py-3 text-sm focus:border-primary focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10 resize-none" />
              </div>

              <div>
                <label className="text-sm font-semibold text-secondary mb-1.5 block">Tags (comma separated)</label>
                <input value={reviewTags} onChange={(e) => setReviewTags(e.target.value)} placeholder="e.g. durability, power, comfort" className="w-full rounded-xl border border-black/10 bg-gray-50/50 px-4 py-2 text-sm focus:border-primary focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10" />
              </div>

              {/* Media Upload */}
              <div>
                <label className="text-sm font-semibold text-secondary mb-1.5 block">Images & Videos</label>
                <div className="flex flex-wrap gap-3">
                  {reviewImages.map((url, i) => (
                    <div key={`img-${i}`} className="relative h-16 w-16 rounded-lg border border-black/10 overflow-hidden group">
                      <Image src={url} alt="Review Image" fill className="object-cover" />
                      <button type="button" onClick={() => setReviewImages(prev => prev.filter((_, idx) => idx !== i))} className="absolute right-1 top-1 rounded-full bg-black/50 p-1 text-white opacity-0 transition group-hover:opacity-100">
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                  {reviewVideos.map((url, i) => (
                    <div key={`vid-${i}`} className="relative h-16 w-16 rounded-lg border border-black/10 overflow-hidden bg-black group">
                      <video src={url} className="h-full w-full object-cover" />
                      <button type="button" onClick={() => setReviewVideos(prev => prev.filter((_, idx) => idx !== i))} className="absolute right-1 top-1 rounded-full bg-black/50 p-1 text-white opacity-0 transition group-hover:opacity-100">
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                  <label className="flex h-16 w-16 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-primary/40 bg-primary/5 text-primary transition hover:bg-primary/10 hover:border-primary">
                    <Camera size={18} />
                    <span className="mt-1 text-[10px] font-bold">Add Media</span>
                    <input type="file" className="hidden" accept="image/*,video/*" multiple onChange={async (e) => {
                      const files = Array.from(e.target.files || []);
                      if (!files.length) return;
                      setIsSubmitting(true);
                      for (const file of files) {
                        try {
                          const url = await uploadImage(file);
                          if (file.type.startsWith("video/")) {
                            setReviewVideos(prev => [...prev, url]);
                          } else {
                            setReviewImages(prev => [...prev, url]);
                          }
                        } catch (err) {
                          console.error("Upload failed", err);
                        }
                      }
                      setIsSubmitting(false);
                    }} />
                  </label>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setReviewModalOpen(false)} className="px-5 py-2.5 text-sm font-semibold text-secondary hover:bg-gray-100 rounded-xl transition">Cancel</button>
              <button
                onClick={async () => {
                  if (!token || !reviewProductId) return;
                  try {
                    setIsSubmitting(true);
                    const tagArray = reviewTags.split(",").map(t => t.trim()).filter(Boolean);
                    if (editingReviewId) {
                      const updated = await updateReview(editingReviewId, {
                        rating: reviewRating,
                        title: reviewTitle,
                        comment: reviewComment,
                        tags: tagArray,
                        images: reviewImages,
                        videos: reviewVideos
                      }, token);
                      setUserReviews(prev => prev.map(r => r._id === editingReviewId ? updated : r));
                      setMessage({ type: "success", text: "Review updated successfully!" });
                    } else {
                      const newReview = await createReview({
                        product: reviewProductId,
                        rating: reviewRating,
                        title: reviewTitle,
                        comment: reviewComment,
                        tags: tagArray,
                        images: reviewImages,
                        videos: reviewVideos
                      }, token);
                      setReviewedItems(prev => [...prev, reviewProductId]);
                      setUserReviews(prev => [newReview, ...prev]);
                      setMessage({ type: "success", text: "Review submitted successfully!" });
                    }
                    setReviewModalOpen(false);
                    // Reset review state
                    setEditingReviewId(null);
                    setReviewTitle(""); setReviewComment(""); setReviewTags(""); setReviewRating(5); setReviewImages([]); setReviewVideos([]);
                  } catch (e) {
                    setMessage({ type: "error", text: "Failed to submit review." });
                  } finally {
                    setIsSubmitting(false);
                    window.scrollTo(0, 0); // Scroll to top to see message
                    setTimeout(() => setMessage({ type: "", text: "" }), 5000);
                  }
                }}
                disabled={isSubmitting || !reviewComment.trim()}
                className="btn-primary py-2.5 px-6 shrink-0"
              >
                {isSubmitting ? "Submitting..." : (editingReviewId ? "Update Review" : "Submit Review")}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
