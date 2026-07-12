import { confirmAction } from "../components/ConfirmModal";
import Head from "next/head";
import { useEffect, useState, useRef, useMemo } from "react";
import Link from "next/link";
import { Layout } from "../components/Layout";
import { fetchProfile, updateProfile, uploadImage, fetchUserOrders, fetchNotifications, markNotificationRead, markAllNotificationsRead, createReview, cancelUserOrder, confirmReceipt, requestReturn, fetchUserReviews, updateReview } from "../lib/api";
import { useRouter } from "next/router";
import { User, Package, Bell, Ticket, Camera, Save, Lock, MapPin, CheckCircle2, Clock, ChevronDown, ChevronRight, Plus, Trash2, ShoppingCart, Truck, Eye, Star, Trophy, TrendingUp } from "lucide-react";
import Image from "next/image";

type OrderStatus = "pending" | "confirmed" | "delivered" | "received" | "returned" | "cancelled";
const statusLabel: Partial<Record<OrderStatus, string>> = {
  pending: "Pending Confirmation",
  confirmed: "Pending Delivery",
  delivered: "Delivered",
  received: "Received",
  returned: "Returned",
  cancelled: "Cancelled",
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
  confirmed: { label: "Pending Delivery", cls: "bg-blue-100 text-blue-700" },
  delivered: { label: "Delivered", cls: "bg-purple-100 text-purple-700" },
  received: { label: "Received", cls: "bg-emerald-100 text-emerald-700" },
  returned: { label: "Returned", cls: "bg-red-100 text-red-700" },
  cancelled: { label: "Cancelled", cls: "bg-red-100 text-red-700" },
};

export default function ProfilePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"profile" | "address" | "password" | "purchases" | "notifications" | "vouchers">("profile");
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
  const [reviewedItems, setReviewedItems] = useState<string[]>([]);
  const [userReviews, setUserReviews] = useState<any[]>([]);
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredOrders = useMemo(() => {
    if (activePurchaseTab === "cancelled") {
      return orders.filter((o) => o.status === "returned" || o.status === "cancelled");
    }
    return orders.filter((o) => o.status === activePurchaseTab);
  }, [orders, activePurchaseTab]);

  const purchaseTabCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    tabs.forEach((t) => {
      if (t.key === "cancelled") {
        counts[t.key] = orders.filter((o) => o.status === "returned" || o.status === "cancelled").length;
      } else {
        counts[t.key] = orders.filter((o) => o.status === t.key).length;
      }
    });
    return counts;
  }, [orders]);

  const calculateTotalSpent = () => {
    return orders.reduce((total, order) => {
      return total + (order.status === "received" ? order.subtotal : 0);
    }, 0);
  };

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
      alert("Return request submitted. The admin will review your request.");
    } catch (e: any) {
      alert(e?.response?.data?.error || "Failed to submit return request");
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
                  className={`flex flex-row items-center justify-between w-full rounded-xl px-4 py-3 text-left text-sm font-semibold transition-colors ${activeTab === "profile" ? "text-primary bg-primary/20" : "text-secondary hover:bg-gray-100"}`}
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

              {activeTab === "profile" && (
                <div className="p-6 sm:p-8 space-y-8 animate-in fade-in zoom-in-95 duration-300">
                  <div>
                  <div className="flex flex-col sm:flex-row items-center gap-6 border-b border-black/5 pb-8">
                    <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full bg-gray-100 ring-4 ring-white shadow-md cursor-pointer hover:opacity-90 transition-opacity" onClick={() => fileInputRef.current?.click()}>
                      {avatar ? (
                        <Image src={avatar} alt="Avatar" fill className="object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-gray-400">
                          <User className="h-8 w-8" />
                        </div>
                      )}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity hover:opacity-100">
                        <Camera className="h-6 w-6 text-white" />
                      </div>
                      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleAvatarSelect} />
                    </div>
                    <div className="text-center sm:text-left">
                      <h2 className="text-xl font-bold text-secondary">{name || "Your Name"}</h2>
                      <p className="text-sm text-secondary/60">{email}</p>
                    </div>
                  </div>
      
                  </div>
                  

                  {/* ── Loyalty & Tier Dashboard ── */}
                  {account && (() => {
                    const tiers = [
                      { name: "Bronze", min: 0, color: "from-amber-700 to-amber-600", textColor: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200", icon: "🥉" },
                      { name: "Silver", min: 500, color: "from-slate-400 to-slate-500", textColor: "text-slate-600", bg: "bg-slate-50", border: "border-slate-200", icon: "🥈" },
                      { name: "Gold", min: 1500, color: "from-yellow-400 to-amber-500", textColor: "text-yellow-700", bg: "bg-yellow-50", border: "border-yellow-200", icon: "🥇" },
                      { name: "Diamond", min: 3000, color: "from-cyan-400 to-blue-500", textColor: "text-cyan-700", bg: "bg-cyan-50", border: "border-cyan-200", icon: "💎" },
                    ];
                    const currentTier = tiers.find(t => t.name === (account.membershipTier || "Bronze")) || tiers[0];
                    const currentTierIdx = tiers.indexOf(currentTier);
                    const nextTier = currentTierIdx < tiers.length - 1 ? tiers[currentTierIdx + 1] : null;
                    const pts = account.points || 0;
                    const progressToNext = nextTier ? Math.min(100, Math.round(((pts - currentTier.min) / (nextTier.min - currentTier.min)) * 100)) : 100;
                    const ptsNeeded = nextTier ? Math.max(0, nextTier.min - pts) : 0;

                    return (
                      <div className="rounded-2xl border border-black/5 bg-gradient-to-br from-gray-50 to-white p-6 space-y-5">
                        {/* Stats Row */}
                        <div className="grid grid-cols-3 gap-4">
                          <div className={`rounded-xl ${currentTier.bg} ${currentTier.border} border p-4 text-center`}>
                            <Trophy className={`mx-auto h-6 w-6 ${currentTier.textColor} mb-1.5`} />
                            <p className="text-[11px] font-semibold text-secondary/50 uppercase tracking-wider">Current Tier</p>
                            <p className={`text-lg font-black ${currentTier.textColor}`}>{currentTier.name}</p>
                          </div>
                          <div className="rounded-xl bg-primary/5 border border-primary/10 p-4 text-center">
                            <Star className="mx-auto h-6 w-6 text-primary mb-1.5 fill-primary/20" />
                            <p className="text-[11px] font-semibold text-secondary/50 uppercase tracking-wider">Points</p>
                            <p className="text-lg font-black text-primary">{pts.toLocaleString()}</p>
                          </div>
                          <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-4 text-center">
                            <TrendingUp className="mx-auto h-6 w-6 text-emerald-600 mb-1.5" />
                            <p className="text-[11px] font-semibold text-secondary/50 uppercase tracking-wider">Total Spent</p>
                            <p className="text-lg font-black text-emerald-600">${(calculateTotalSpent() || 0).toLocaleString()}</p>
                          </div>
                        </div>

                        {/* Progress to Next Tier */}
                        {nextTier ? (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-secondary/70">Progress to <span className={nextTier.textColor}>{nextTier.name}</span></span>
                              <span className="text-xs font-bold text-primary">{progressToNext}%</span>
                            </div>
                            <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100 shadow-inner">
                              <div className={`h-full rounded-full bg-gradient-to-r ${currentTier.color} transition-all duration-1000 ease-out`} style={{ width: `${progressToNext}%` }} />
                            </div>
                            <p className="text-xs text-secondary/50 text-center">
                              <span className="font-bold text-secondary/70">{ptsNeeded.toLocaleString()}</span> more points needed to reach {nextTier.icon} {nextTier.name}
                            </p>
                          </div>
                        ) : (
                          <div className="text-center rounded-xl bg-gradient-to-r from-cyan-50 to-blue-50 border border-cyan-100 p-4">
                            <p className="text-sm font-bold text-cyan-700">💎 You've reached the highest tier! Enjoy all exclusive benefits.</p>
                          </div>
                        )}

                        {/* Tier Roadmap */}
                        <div className="flex items-center justify-between gap-1 pt-2">
                          {tiers.map((tier, i) => {
                            const isActive = tier.name === currentTier.name;
                            const isPast = i < currentTierIdx;
                            return (
                              <div key={tier.name} className="flex-1 flex flex-col items-center gap-1.5">
                                <div className={`relative flex h-9 w-9 items-center justify-center rounded-full text-sm transition-all
                                  ${isActive ? `bg-gradient-to-br ${tier.color} text-white shadow-lg ring-2 ring-offset-2 ring-offset-white scale-110` + (tier.name === 'Bronze' ? ' ring-amber-400' : tier.name === 'Silver' ? ' ring-slate-400' : tier.name === 'Gold' ? ' ring-yellow-400' : ' ring-cyan-400') :
                                    isPast ? `bg-gradient-to-br ${tier.color} text-white opacity-60` :
                                      "bg-gray-100 text-gray-400"}`}>
                                  {tier.icon}
                                </div>
                                <span className={`text-[10px] font-bold tracking-tight ${isActive ? currentTier.textColor : isPast ? "text-secondary/40" : "text-secondary/30"}`}>{tier.name}</span>
                                <span className={`text-[9px] font-semibold ${isActive || isPast ? "text-secondary/40" : "text-secondary/25"}`}>{tier.min.toLocaleString()} pts</span>
                              </div>
                            );
                          })}
                        </div>

                        {/* How points work */}
                        <div className="rounded-xl bg-blue-50/60 border border-blue-100/80 px-4 py-3">
                          <p className="text-xs font-semibold text-blue-800/70 leading-relaxed">
                            💡 <span className="font-bold text-blue-900/80">How it works:</span> Earn <span className="font-black text-blue-900">1 point</span> for every <span className="font-black text-blue-900">$0.50</span> spent. Points accumulate over your lifetime and determine your membership tier. Higher tiers unlock exclusive discounts and early access to flash sales!
                          </p>
                        </div>
                      </div>
                    );
                  })()}

                  <div className="grid gap-6 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-secondary">Full Name</label>
                      <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-xl border border-black/10 bg-gray-50/50 px-4 py-3 text-sm focus:border-primary focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-secondary">Email</label>
                      <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" className="w-full rounded-xl border border-black/10 bg-gray-50/50 px-4 py-3 text-sm focus:border-primary focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-secondary">Phone Number</label>
                      <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 234 567 890" className="w-full rounded-xl border border-black/10 bg-gray-50/50 px-4 py-3 text-sm focus:border-primary focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-secondary">Date of Birth</label>
                      <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} className="w-full rounded-xl border border-black/10 bg-gray-50/50 px-4 py-3 text-sm focus:border-primary focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10" />
                    </div>
                    <div className="space-y-2 sm:col-span-2 mt-2">
                      <label className="text-sm font-semibold text-secondary">Gender</label>
                      <div className="flex gap-4">
                        {["male", "female", "other"].map((g) => (
                          <label key={g} className="flex items-center gap-2 text-sm cursor-pointer">
                            <input type="radio" name="gender" value={g} checked={gender === g} onChange={() => setGender(g)} className="accent-primary w-4 h-4" />
                            <span className="capitalize">{g}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end pt-6 border-t border-black/5">
                    <button onClick={() => handleSave("profile")} disabled={isSubmitting} className="btn-primary flex items-center gap-2"><Save className="h-4 w-4" /> Save General Info</button>
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
                        tags: tagArray
                      }, token);
                      setUserReviews(prev => prev.map(r => r._id === editingReviewId ? updated : r));
                      setMessage({ type: "success", text: "Review updated successfully!" });
                    } else {
                      const newReview = await createReview({
                        product: reviewProductId,
                        rating: reviewRating,
                        title: reviewTitle,
                        comment: reviewComment,
                        tags: tagArray
                      }, token);
                      setReviewedItems(prev => [...prev, reviewProductId]);
                      setUserReviews(prev => [newReview, ...prev]);
                      setMessage({ type: "success", text: "Review submitted successfully!" });
                    }
                    setReviewModalOpen(false);
                    // Reset review state
                    setEditingReviewId(null);
                    setReviewTitle(""); setReviewComment(""); setReviewTags(""); setReviewRating(5);
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
