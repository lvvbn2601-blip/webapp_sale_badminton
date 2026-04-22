import Head from "next/head";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { Layout } from "../components/Layout";
import { fetchUserOrders, cancelUserOrder, confirmReceipt, requestReturn, createReview } from "../lib/api";
import { useRouter } from "next/router";
import { Plus, Star } from "lucide-react";

type OrderStatus = "pending" | "confirmed" | "delivered" | "received" | "returned" | "cancelled";

type Order = {
  id?: string;
  _id?: string;
  createdAt: string;
  status: OrderStatus;
  items: any[];
  subtotal: number;
  shippingFee?: number;
  shipping?: number;
  total: number;
  trackingNumber?: string;
  carrier?: string;
  payment?: string;
  returnReason?: string;
  returnRequestedAt?: string;
  recipientName?: string;
  recipientPhone?: string;
  shippingAddress?: string;
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
  cancelled: { label: "Cancelled", cls: "bg-gray-100 text-gray-600" },
};

export default function PurchasesPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [active, setActive] = useState<TabKey>("pending");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [returnModal, setReturnModal] = useState<string | null>(null);
  const [returnReason, setReturnReasonText] = useState("");
  const [token, setToken] = useState<string | null>(null);

  // Review States
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewProductId, setReviewProductId] = useState<string | null>(null);
  const [reviewProductName, setReviewProductName] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState("");
  const [reviewComment, setReviewComment] = useState("");
  const [reviewTags, setReviewTags] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewedItems, setReviewedItems] = useState<string[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const t = localStorage.getItem("accessToken");
    setToken(t);
    if (!t) {
      router.push("/login?next=/purchases");
      return;
    }
    fetchUserOrders(t)
      .then((res) => {
        setOrders(Array.isArray(res) ? res.reverse() : []);
        setLoading(false);
      })
      .catch(() => {
        setOrders([]);
        setLoading(false);
      });
  }, []);

  const filtered = useMemo(() => {
    if (active === "cancelled") {
      return orders.filter((o) => o.status === "returned" || o.status === "cancelled");
    }
    return orders.filter((o) => o.status === active);
  }, [orders, active]);

  const tabCounts = useMemo(() => {
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
    if (!window.confirm("Are you sure you want to delete this?")) return;
    if (!token || !confirm("Are you sure you want to cancel this order?")) return;
    setActionLoading(orderId);
    try {
      await cancelUserOrder(orderId, token);
      setOrders((prev) => prev.map((o) => (o._id === orderId || o.id === orderId) ? { ...o, status: "returned_cancelled" as OrderStatus } : o));
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
      setOrders((prev) => prev.map((o) => (o._id === orderId || o.id === orderId) ? { ...o, status: "received" as OrderStatus } : o));
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

  const oid = (o: Order) => o._id || o.id || "";

  return (
    <Layout>
      <Head>
        <title>My Purchases | Badminton Hub</title>
      </Head>
      <section className="section-padding">
        <div className="container-default space-y-6">
          {/* Header */}
          <div>
            <p className="pill bg-primary/10 text-primary">My Orders</p>
            <h1 className="mt-2 font-heading text-3xl font-semibold">My Purchases</h1>
            <p className="text-secondary/70">Track & manage all your orders in one place.</p>
          </div>

          {/* Tab navigation */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActive(tab.key)}
                className={`flex items-center gap-2 whitespace-nowrap rounded-2xl border px-4 py-3 text-sm font-semibold transition-all ${active === tab.key
                  ? `${tab.color} shadow-sm`
                  : "border-black/5 bg-white text-secondary/70 hover:bg-gray-50"
                  }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
                {tabCounts[tab.key] > 0 && (
                  <span className={`ml-1 flex h-5 min-w-5 items-center justify-center rounded-full text-[10px] font-bold ${active === tab.key ? "bg-white/80 text-secondary" : "bg-black/5 text-secondary/60"
                    }`}>
                    {tabCounts[tab.key]}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Loading */}
          {loading && (
            <div className="rounded-2xl border border-black/5 bg-white p-12 text-center shadow-sm">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <p className="mt-3 text-sm text-secondary/60">Loading orders...</p>
            </div>
          )}

          {/* Empty state */}
          {!loading && !filtered.length && (
            <div className="rounded-2xl border border-black/5 bg-white p-12 text-center shadow-sm">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-50 text-3xl">
                {tabs.find((t) => t.key === active)?.icon || "📋"}
              </div>
              <h3 className="font-heading text-lg font-semibold text-secondary">No orders here</h3>
              <p className="mt-1 text-sm text-secondary/60">
                {active === "pending" && "Orders waiting for admin confirmation will appear here."}
                {active === "confirmed" && "Orders confirmed and being prepared for delivery."}
                {active === "delivered" && "Delivered orders where you can confirm receipt or request return."}
                {active === "received" && "Orders you've confirmed receiving."}
                {active === "cancelled" && "Returned or cancelled orders will appear here."}
              </p>
            </div>
          )}

          {/* Orders list */}
          <div className="space-y-4">
            {filtered.map((o) => {
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
                              {image && <Image src={image} alt={name} fill className="object-cover" />}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-secondary line-clamp-1">{name}</p>
                              <p className="text-xs text-secondary/50">Qty: {qty} × ${price.toFixed(2)}</p>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <div className="text-sm font-bold text-secondary">${(price * qty).toFixed(2)}</div>
                            {o.status === "received" && (
                              reviewedItems.includes(it.product?.id || it.product?._id) ? (
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    router.push(`/products/${it.product?.slug || it.product?.id || it.product?._id}`);
                                  }}
                                  className="text-xs font-bold text-white bg-primary hover:bg-primary/90 px-3 py-1.5 rounded-lg transition"
                                >
                                  Buy again
                                </button>
                              ) : (
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setReviewProductId(it.product?.id || it.product?._id || "");
                                    setReviewProductName(name);
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
                        {o.payment && <p className="text-xs">Payment: {o.payment === "cod" ? "Cash on Delivery" : o.payment === "bank" ? "Bank Transfer" : o.payment}</p>}
                      </div>
                      <div className="text-right">
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

                  {o.status === "returned" && o.returnReason && (
                    <div className="border-t border-black/5 px-5 py-3">
                      <p className="text-xs text-secondary/60">Return reason: <span className="font-semibold text-secondary">{o.returnReason}</span></p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Return Reason Modal */}
      {returnModal && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) { setReturnModal(null); setReturnReasonText(""); } }}>
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
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
                    setIsSubmittingReview(true);
                    await createReview({
                      product: reviewProductId,
                      rating: reviewRating,
                      title: reviewTitle,
                      comment: reviewComment,
                      tags: reviewTags.split(",").map(t => t.trim()).filter(Boolean)
                    }, token);
                    setReviewedItems(prev => [...prev, reviewProductId]);
                    alert("Review submitted successfully!");
                    setReviewModalOpen(false);
                    // Reset review state
                    setReviewTitle(""); setReviewComment(""); setReviewTags(""); setReviewRating(5);
                  } catch(e: any) {
                    alert(e?.response?.data?.error || "Failed to submit review.");
                  } finally {
                    setIsSubmittingReview(false);
                  }
                }}
                disabled={isSubmittingReview || !reviewComment.trim()}
                className="rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:opacity-50 shrink-0"
              >
                {isSubmittingReview ? "Submitting..." : "Submit Review"}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
