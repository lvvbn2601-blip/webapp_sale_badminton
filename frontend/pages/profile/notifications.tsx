import { confirmAction } from "../../components/ConfirmModal";
import Head from "next/head";
import { useEffect, useState, useRef, useMemo } from "react";
import Link from "next/link";
import { Layout } from "../../components/Layout";
import { fetchProfile, updateProfile, uploadImage, fetchUserOrders, fetchNotifications, markNotificationRead, markAllNotificationsRead, createReview, cancelUserOrder, confirmReceipt, requestReturn, fetchUserReviews, updateReview } from "../../lib/api";
import { useRouter } from "next/router";
import { User, Package, Bell, Ticket, Camera, Save, Lock, MapPin, CheckCircle2, Clock, ChevronDown, ChevronRight, Plus, Trash2, ShoppingCart, Truck, Eye, Star } from "lucide-react";
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

export default function ProfileNotificationsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"profile" | "address" | "password" | "purchases" | "notifications" | "vouchers">("notifications");
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









              {activeTab === "notifications" && (
                <div className="p-6 sm:p-8 space-y-6 animate-in fade-in duration-300">
                  <div className="flex items-center justify-between border-b border-black/5 pb-4">
                    <h3 className="flex items-center gap-2 font-heading text-xl font-semibold">
                      <Bell className="h-5 w-5 text-primary" /> Notifications
                    </h3>
                    {notifications.length > 0 && (
                      <button
                        onClick={async () => {
                          if (!token) return;
                          await markAllNotificationsRead(token);
                          setNotifications(notifications.map(n => ({ ...n, isRead: true })));
                          window.dispatchEvent(new Event("auth:user-updated"));
                        }}
                        className="text-sm font-semibold text-primary hover:underline"
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>

                  {notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <div className="mb-4 rounded-full bg-primary/10 p-6 flex items-center justify-center">
                        <Bell className="h-10 w-10 text-primary" />
                      </div>
                      <h2 className="text-xl font-bold text-secondary">No Notifications</h2>
                      <p className="mt-2 text-sm text-secondary/60 max-w-sm">You're all caught up! New updates, offers, and alerts will appear here.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {notifications.map((notif: any) => {
                        const id = notif._id || notif.id;
                        const isUnread = !notif.isRead;
                        const iconMap: Record<string, any> = {
                          new_order: ShoppingCart,
                          order_delivered: Truck,
                          order_status: Package,
                          system: Bell,
                        };
                        const Icon = iconMap[notif.type] || Bell;
                        const colorMap: Record<string, string> = {
                          new_order: "bg-blue-50 text-blue-600 ring-blue-100",
                          order_delivered: "bg-green-50 text-green-600 ring-green-100",
                          order_status: "bg-orange-50 text-orange-600 ring-orange-100",
                          system: "bg-gray-50 text-gray-600 ring-gray-100",
                        };
                        const color = colorMap[notif.type] || colorMap.system;

                        return (
                          <div
                            key={id}
                            className={`relative p-4 rounded-xl border transition-colors ${isUnread
                              ? "border-primary/20 bg-primary/[0.03]"
                              : "border-black/5 bg-white hover:bg-gray-50/50"
                              }`}
                          >
                            {isUnread && (
                              <span className="absolute top-4 right-4 w-2.5 h-2.5 bg-primary rounded-full ring-4 ring-primary/10"></span>
                            )}
                            <div className="flex gap-4">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ring-1 ${color}`}>
                                <Icon className="h-5 w-5" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm font-bold ${isUnread ? "text-secondary" : "text-secondary/80"}`}>
                                  {notif.title}
                                </p>
                                <p className="text-sm text-secondary/60 mt-1 leading-relaxed">
                                  {notif.message}
                                </p>
                                <div className="flex items-center gap-3 mt-2">
                                  <span className="text-xs text-secondary/40 flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {new Date(notif.createdAt).toLocaleString()}
                                  </span>
                                  {isUnread && (
                                    <button
                                      onClick={async () => {
                                        if (!token) return;
                                        await markNotificationRead(id, token);
                                        setNotifications(notifications.map(n =>
                                          (n._id || n.id) === id ? { ...n, isRead: true } : n
                                        ));
                                        window.dispatchEvent(new Event("auth:user-updated"));
                                      }}
                                      className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                                    >
                                      <Eye className="w-3 h-3" /> Mark read
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
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
