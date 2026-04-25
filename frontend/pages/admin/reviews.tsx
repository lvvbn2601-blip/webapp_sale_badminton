import { confirmAction } from "../../components/ConfirmModal";
import Head from "next/head";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState, useCallback } from "react";
import { AdminShell, AdminSection } from "../../components/admin/AdminShell";
import {
  fetchAdminReviews,
  updateAdminReviewStatus,
  adminReplyToReview,
  toggleReviewFeatured,
  bulkUpdateReviewStatus,
  deleteAdminReview,
  exportReviewsCsv,
  fetchNotifications,
} from "../../lib/api";
import {
  Star,
  Check,
  X,
  MessageSquare,
  Pin,
  Download,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  BarChart3,
  MessageCircle,
  Trash2,
  ChevronDown,
  AlertTriangle,
  Send,
  Edit3,
  Sparkles,
} from "lucide-react";

/* ══════════════════ DEMO DATA ══════════════════ */
const DEMO_REVIEWS = [
  {
    _id: "rev_d1",
    user: { _id: "u1", name: "Alex M.", email: "alex@sportive.com" },
    product: { _id: "p1", name: "Yonex Astrox 100 ZZ", slug: "yonex-astrox-100-zz", image: "" },
    rating: 5,
    title: "Incredible smash power",
    comment: "The racket power and control feel perfect for doubles. Huge upgrade from my old racket.",
    images: ["https://images.unsplash.com/photo-1622397194681-cd543af6bba0?auto=format&fit=crop&q=80&w=200"],
    tags: ["durability", "power", "control"],
    status: "approved",
    verified: true,
    helpfulCount: 24,
    isFeatured: true,
    adminReply: "Thank you for your review! Glad you love the Astrox 100 ZZ.",
    adminReplyAt: "2026-03-10T10:00:00Z",
    createdAt: "2026-02-08T00:00:00Z",
  },
  {
    _id: "rev_d2",
    user: { _id: "u2", name: "Jordan P.", email: "jordan@sportive.com" },
    product: { _id: "p2", name: "Yonex Aerosensa 20 Shuttlecock", slug: "yonex-as20", image: "" },
    rating: 2,
    title: "Good but brittle",
    comment: "Shuttle flight is very consistent even during long sessions, but they break fast after a few smashes.",
    tags: ["shuttle", "brittle"],
    status: "pending",
    verified: false,
    helpfulCount: 8,
    isFeatured: false,
    adminReply: "",
    createdAt: "2026-01-22T00:00:00Z",
  },
  {
    _id: "rev_d3",
    user: { _id: "u3", name: "Taylor S.", email: "taylor@sportive.com" },
    product: { _id: "p3", name: "Yonex Power Cushion 65Z3", slug: "yonex-pc-65z3", image: "" },
    rating: 5,
    title: "Best court shoes",
    comment: "Court shoes have excellent grip and lateral support. Very comfortable for long games.",
    tags: ["comfort", "grip"],
    status: "approved",
    verified: true,
    helpfulCount: 45,
    isFeatured: false,
    adminReply: "",
    createdAt: "2026-03-01T00:00:00Z",
  },
  {
    _id: "rev_d4",
    user: { _id: "u4", name: "Chris L.", email: "chris@sportive.com" },
    product: { _id: "p4", name: "Li-Ning Axforce 80", slug: "li-ning-axforce-80", image: "" },
    rating: 1,
    title: "Arrived damaged",
    comment: "The packaging was completely crushed when it arrived. Very disappointing for a premium racket.",
    tags: ["quality control"],
    status: "pending",
    verified: true,
    helpfulCount: 15,
    isFeatured: false,
    adminReply: "",
    createdAt: "2026-03-10T00:00:00Z",
  },
  {
    _id: "rev_d5",
    user: { _id: "u5", name: "Sam W.", email: "sam@sportive.com" },
    product: { _id: "p5", name: "Victor Thruster Ryuga", slug: "victor-thruster-ryuga", image: "" },
    rating: 4,
    title: "Great value",
    comment: "For the price, you cannot beat the performance. Solid build quality and nice paint job.",
    tags: ["value"],
    status: "approved",
    verified: true,
    helpfulCount: 2,
    isFeatured: false,
    adminReply: "",
    createdAt: "2026-03-15T00:00:00Z",
  },
  {
    _id: "rev_d6",
    user: { _id: "u6", name: "Morgan H.", email: "morgan@sportive.com" },
    product: { _id: "p6", name: "Yonex Nanoflare 800", slug: "yonex-nanoflare-800", image: "" },
    rating: 3,
    title: "Average racket",
    comment: "It's decent but I've used better rackets at this price point. Nothing special.",
    tags: [],
    status: "rejected",
    verified: true,
    helpfulCount: 0,
    isFeatured: false,
    adminReply: "We appreciate your feedback. Could you elaborate on what you'd improve?",
    adminReplyAt: "2026-03-22T14:00:00Z",
    createdAt: "2026-03-20T00:00:00Z",
  },
  {
    _id: "rev_d7",
    user: { _id: "u7", name: "Riley C.", email: "riley@sportive.com" },
    product: { _id: "p7", name: "Victor 9000 Series Pro Bag", slug: "victor-9000-pro-bag", image: "" },
    rating: 5,
    title: "Perfect tournament bag",
    comment: "Fits all my rackets plus shoes and gear. The thermal compartment is a game changer in summer.",
    tags: ["bag", "tournament"],
    status: "pending",
    verified: true,
    helpfulCount: 10,
    isFeatured: false,
    adminReply: "",
    createdAt: "2026-03-28T00:00:00Z",
  },
  {
    _id: "rev_d8",
    user: { _id: "u8", name: "Jamie N.", email: "jamie@sportive.com" },
    product: { _id: "p8", name: "Yonex Astrox 77 Play", slug: "yonex-astrox-77-play", image: "" },
    rating: 4,
    title: "Good beginner racket",
    comment: "Perfect for my daughter who just started playing. Light and easy to swing.",
    tags: ["beginner", "lightweight"],
    status: "pending",
    verified: true,
    helpfulCount: 5,
    isFeatured: false,
    adminReply: "",
    createdAt: "2026-04-01T00:00:00Z",
  },
];

const DEMO_STATS = {
  total: 8,
  pending: 4,
  approved: 3,
  rejected: 1,
  avgRating: 3.6,
  noReply: 5,
};

/* ══════════════════ STATUS TAB TYPE ══════════════════ */
type TabKey = "all" | "pending" | "approved" | "rejected";

const TABS: { key: TabKey; label: string; icon: any; color: string }[] = [
  { key: "all", label: "All Reviews", icon: BarChart3, color: "text-secondary" },
  { key: "pending", label: "Pending Approval", icon: Clock, color: "text-amber-600" },
  { key: "approved", label: "Approved", icon: CheckCircle2, color: "text-emerald-600" },
  { key: "rejected", label: "Rejected", icon: XCircle, color: "text-red-500" },
];

/* ══════════════════ MAIN COMPONENT ══════════════════ */
export default function AdminReviewsPage() {
  const router = useRouter();

  // Auth
  const [authChecked, setAuthChecked] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  // Data
  const [reviews, setReviews] = useState<any[]>([]);
  const [stats, setStats] = useState(DEMO_STATS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [usingMockData, setUsingMockData] = useState(false);

  // Filters
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [starFilter, setStarFilter] = useState<number>(0); // 0 = all

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Reply
  const [replyingId, setReplyingId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replySaving, setReplySaving] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Notifications
  const [notifUnreadCount, setNotifUnreadCount] = useState(0);

  // ── Show toast helper ──
  const showToast = useCallback((message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // ── Auth check ──
  useEffect(() => {
    const t = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
    setToken(t);
    let user: any = null;
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem("user") : null;
      user = raw ? JSON.parse(raw) : null;
    } catch { user = null; }

    if (!t || !user) { setAuthChecked(true); router.replace("/login?next=/admin/reviews"); return; }
    if (!["admin", "warehouse_staff", "knitter"].includes(user.role)) { setAuthChecked(true); router.replace("/"); return; }
    setAuthChecked(true);
  }, []);

  // ── Load reviews ──
  useEffect(() => {
    if (!authChecked || !token) return;
    loadReviews();
  }, [authChecked, token]);

  const loadReviews = async () => {
    setLoading(true);
    setError("");
    setUsingMockData(false);
    try {
      const res = await fetchAdminReviews(token!);
      setReviews(res.reviews || []);
      setStats(res.stats || DEMO_STATS);
    } catch (err: any) {
      setUsingMockData(true);
      setError("Live API unavailable. Loaded demo data instead.");
      setReviews(DEMO_REVIEWS);
      setStats(DEMO_STATS);
    } finally {
      setLoading(false);
    }
  };

  // ── Notifications poll ──
  useEffect(() => {
    if (!authChecked || !token) return;
    const fetchNotifs = () => {
      fetchNotifications(token!).then((data) => {
        const list = Array.isArray(data) ? data : [];
        setNotifUnreadCount(list.filter((n: any) => !n.isRead).length);
      }).catch(() => {});
    };
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 30000);
    return () => clearInterval(interval);
  }, [authChecked, token]);

  // ── Computed stats ── (recalculate from local state)
  const computedStats = useMemo(() => {
    if (usingMockData) {
      const total = reviews.length;
      const pending = reviews.filter(r => r.status === "pending").length;
      const approved = reviews.filter(r => r.status === "approved").length;
      const avgRating = total > 0 ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / total) * 10) / 10 : 0;
      const noReply = reviews.filter(r => !r.adminReply).length;
      return { total, pending, approved, rejected: total - pending - approved, avgRating, noReply };
    }
    return stats;
  }, [reviews, stats, usingMockData]);

  // ── Filtered reviews ──
  const filteredReviews = useMemo(() => {
    return reviews.filter((r) => {
      // Tab filter
      if (activeTab !== "all" && r.status !== activeTab) return false;
      // Star filter
      if (starFilter > 0 && r.rating !== starFilter) return false;
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const userName = typeof r.user === "string" ? r.user : (r.user?.name || "");
        const productName = typeof r.product === "string" ? r.product : (r.product?.name || "");
        const comment = r.comment || "";
        const title = r.title || "";
        if (
          !userName.toLowerCase().includes(q) &&
          !productName.toLowerCase().includes(q) &&
          !comment.toLowerCase().includes(q) &&
          !title.toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
  }, [reviews, activeTab, starFilter, searchQuery]);

  // ── Actions ──
  const handleUpdateStatus = async (id: string, status: "approved" | "rejected") => {
    if (usingMockData || !token) {
      setReviews(prev => prev.map(r => (r._id === id ? { ...r, status } : r)));
      showToast(`Review ${status}`);
      return;
    }
    try {
      const updated = await updateAdminReviewStatus(id, status, token);
      setReviews(prev => prev.map(r => (r._id === id ? updated : r)));
      showToast(`Review ${status}`);
    } catch (e: any) {
      showToast(e?.response?.data?.error || "Failed to update status", "error");
    }
  };

  const handleReply = async (id: string) => {
    if (!replyText.trim()) return;
    setReplySaving(true);
    if (usingMockData || !token) {
      setReviews(prev =>
        prev.map(r =>
          r._id === id ? { ...r, adminReply: replyText.trim(), adminReplyAt: new Date().toISOString() } : r
        )
      );
      setReplyingId(null);
      setReplyText("");
      setReplySaving(false);
      showToast("Reply saved");
      return;
    }
    try {
      const updated = await adminReplyToReview(id, replyText.trim(), token);
      setReviews(prev => prev.map(r => (r._id === id ? updated : r)));
      setReplyingId(null);
      setReplyText("");
      showToast("Reply saved");
    } catch (e: any) {
      showToast(e?.response?.data?.error || "Failed to save reply", "error");
    } finally {
      setReplySaving(false);
    }
  };

  const handleToggleFeatured = async (id: string) => {
    if (usingMockData || !token) {
      setReviews(prev => prev.map(r => (r._id === id ? { ...r, isFeatured: !r.isFeatured } : r)));
      showToast("Featured status toggled");
      return;
    }
    try {
      const updated = await toggleReviewFeatured(id, token);
      setReviews(prev => prev.map(r => (r._id === id ? updated : r)));
      showToast(updated.isFeatured ? "Review pinned as featured" : "Review unpinned");
    } catch (e: any) {
      showToast(e?.response?.data?.error || "Failed to toggle featured", "error");
    }
  };

  const handleDelete = async (id: string) => {
    if (!(await confirmAction("Are you sure you want to delete this?"))) return;
    if (!confirm("Are you sure you want to delete this review?")) return;
    if (usingMockData || !token) {
      setReviews(prev => prev.filter(r => r._id !== id));
      setSelectedIds(prev => { const next = new Set(prev); next.delete(id); return next; });
      showToast("Review deleted");
      return;
    }
    try {
      await deleteAdminReview(id, token);
      setReviews(prev => prev.filter(r => r._id !== id));
      setSelectedIds(prev => { const next = new Set(prev); next.delete(id); return next; });
      showToast("Review deleted");
    } catch (e: any) {
      showToast(e?.response?.data?.error || "Failed to delete review", "error");
    }
  };

  const handleBulkAction = async (status: "approved" | "rejected") => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    if (usingMockData || !token) {
      setReviews(prev => prev.map(r => (ids.includes(r._id) ? { ...r, status } : r)));
      setSelectedIds(new Set());
      showToast(`${ids.length} review(s) ${status}`);
      return;
    }
    try {
      const updated = await bulkUpdateReviewStatus(ids, status, token);
      const updatedMap = new Map(updated.map((r: any) => [r._id, r]));
      setReviews(prev => prev.map(r => updatedMap.has(r._id) ? updatedMap.get(r._id) : r));
      setSelectedIds(new Set());
      showToast(`${ids.length} review(s) ${status}`);
    } catch (e: any) {
      showToast(e?.response?.data?.error || "Bulk update failed", "error");
    }
  };

  const handleExportCsv = async () => {
    if (usingMockData || !token) {
      showToast("CSV export not available in demo mode", "error");
      return;
    }
    try {
      await exportReviewsCsv(token);
      showToast("CSV downloaded");
    } catch (e: any) {
      showToast("Export failed", "error");
    }
  };

  // ── Selection helpers ──
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredReviews.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredReviews.map(r => r._id)));
    }
  };

  // ── Logout ──
  const logout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");
      window.dispatchEvent(new Event("auth:user-updated"));
    }
    router.push("/login");
  };

  // ── Helpers ──
  const getUserName = (user: any) => (typeof user === "string" ? user : user?.name || "Unknown");
  const getUserEmail = (user: any) => (typeof user === "string" ? "" : user?.email || "");
  const getUserInitial = (user: any) => getUserName(user).charAt(0).toUpperCase();
  const getProductName = (product: any) => (typeof product === "string" ? product : product?.name || "Unknown Product");
  const formatDate = (d: string) => {
    if (!d) return "—";
    const date = new Date(d);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };
  const formatDatetime = (d: string) => {
    if (!d) return "";
    const date = new Date(d);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      pending: "bg-amber-100 text-amber-700",
      approved: "bg-emerald-100 text-emerald-700",
      rejected: "bg-red-100 text-red-700",
    };
    return map[status] || "bg-gray-100 text-gray-600";
  };

  const statusIcon = (status: string) => {
    if (status === "approved") return <CheckCircle2 size={12} />;
    if (status === "rejected") return <XCircle size={12} />;
    return <Clock size={12} />;
  };

  return (
    <AdminShell
      title="Reviews"
      section="reviews"
      onSectionChange={(s) => {
        if (s === "dashboard") router.push("/admin");
        else router.push(`/admin/${s}`);
      }}
      onLogout={logout}
      notificationCount={notifUnreadCount}
    >
      <Head>
        <title>Reviews Management | Admin</title>
      </Head>

      {/* TOAST */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 flex items-center gap-3 rounded-2xl px-5 py-3 text-sm font-semibold shadow-lg transition-all animate-in ${
            toast.type === "success"
              ? "bg-emerald-600 text-white"
              : "bg-red-600 text-white"
          }`}
          style={{ animation: "slideIn 0.3s ease-out" }}
        >
          {toast.type === "success" ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          {toast.message}
        </div>
      )}

      {!authChecked && (
        <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
          Checking access...
        </div>
      )}

      {usingMockData && (
        <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700 flex items-center gap-2">
          <AlertTriangle size={16} />
          Demo Mode — Actions are simulated locally
        </div>
      )}

      {error && !usingMockData && (
        <div className="mb-4 rounded-2xl border border-primary/30 bg-primary/10 p-4 text-primary">
          {error}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      )}

      {authChecked && !loading && (
        <div className="space-y-6">
          {/* ═══════════════ METRIC CARDS ═══════════════ */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <MetricCard
              label="Total Reviews"
              value={computedStats.total}
              icon={<BarChart3 size={20} />}
              color="bg-blue-50 text-blue-600"
              iconBg="bg-blue-100"
            />
            <MetricCard
              label="Pending Approval"
              value={computedStats.pending}
              icon={<Clock size={20} />}
              color="bg-amber-50 text-amber-600"
              iconBg="bg-amber-100"
              highlight={computedStats.pending > 0}
            />
            <MetricCard
              label="Average Rating"
              value={computedStats.avgRating}
              icon={<Star size={20} />}
              color="bg-emerald-50 text-emerald-600"
              iconBg="bg-emerald-100"
              suffix="/ 5"
            />
            <MetricCard
              label="No Reply Yet"
              value={computedStats.noReply}
              icon={<MessageCircle size={20} />}
              color="bg-red-50 text-red-600"
              iconBg="bg-red-100"
              highlight={computedStats.noReply > 0}
            />
          </div>

          {/* ═══════════════ TABS + TOOLBAR ═══════════════ */}
          <div className="rounded-2xl border border-black/5 bg-white shadow-sm overflow-hidden">
            {/* Tabs */}
            <div className="flex border-b border-black/5 overflow-x-auto">
              {TABS.map((tab) => {
                const count =
                  tab.key === "all"
                    ? reviews.length
                    : reviews.filter((r) => r.status === tab.key).length;
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.key}
                    onClick={() => { setActiveTab(tab.key); setSelectedIds(new Set()); }}
                    className={`flex items-center gap-2 whitespace-nowrap px-5 py-3.5 text-sm font-semibold transition-all border-b-2 ${
                      activeTab === tab.key
                        ? `${tab.color} border-current`
                        : "text-secondary/50 border-transparent hover:text-secondary/80 hover:bg-gray-50"
                    }`}
                  >
                    <Icon size={16} />
                    {tab.label}
                    <span
                      className={`ml-1 rounded-full px-2 py-0.5 text-xs font-bold ${
                        activeTab === tab.key
                          ? "bg-current/10 text-current"
                          : "bg-gray-100 text-secondary/60"
                      }`}
                      style={
                        activeTab === tab.key
                          ? { backgroundColor: "currentcolor", color: "white", opacity: 0.9 }
                          : {}
                      }
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Search + Filter + Export bar */}
            <div className="flex flex-wrap items-center gap-3 border-b border-black/5 px-5 py-3">
              {/* Search */}
              <div className="relative flex-1 min-w-[200px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary/40" />
                <input
                  id="review-search"
                  className="w-full rounded-xl border border-black/5 bg-gray-50 py-2.5 pl-10 pr-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition"
                  placeholder="Search by user, product, title, comment..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Star filter */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setStarFilter(0)}
                  className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                    starFilter === 0
                      ? "bg-secondary text-white"
                      : "bg-gray-100 text-secondary/60 hover:bg-gray-200"
                  }`}
                >
                  All ★
                </button>
                {[5, 4, 3, 2, 1].map((s) => (
                  <button
                    key={s}
                    onClick={() => setStarFilter(starFilter === s ? 0 : s)}
                    className={`flex items-center gap-1 rounded-lg px-2.5 py-2 text-xs font-semibold transition ${
                      starFilter === s
                        ? "bg-amber-500 text-white"
                        : "bg-gray-100 text-secondary/60 hover:bg-amber-50 hover:text-amber-600"
                    }`}
                  >
                    {s}
                    <Star size={11} fill={starFilter === s ? "white" : "none"} />
                  </button>
                ))}
              </div>

              {/* Export CSV */}
              <button
                onClick={handleExportCsv}
                className="flex items-center gap-2 rounded-xl border border-black/5 bg-white px-4 py-2.5 text-sm font-semibold text-secondary/70 shadow-sm transition hover:shadow-md hover:text-secondary"
              >
                <Download size={15} />
                Export CSV
              </button>
            </div>

            {/* BULK ACTION BAR */}
            {selectedIds.size > 0 && (
              <div className="flex items-center gap-3 border-b border-black/5 bg-blue-50 px-5 py-3 animate-in">
                <span className="text-sm font-bold text-blue-700">
                  {selectedIds.size} selected
                </span>
                <button
                  onClick={() => handleBulkAction("approved")}
                  className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-emerald-700 shadow-sm"
                >
                  <Check size={14} />
                  Approve All
                </button>
                <button
                  onClick={() => handleBulkAction("rejected")}
                  className="flex items-center gap-1.5 rounded-xl bg-red-500 px-4 py-2 text-xs font-bold text-white transition hover:bg-red-600 shadow-sm"
                >
                  <X size={14} />
                  Reject All
                </button>
                <button
                  onClick={() => setSelectedIds(new Set())}
                  className="ml-auto text-xs font-semibold text-blue-600 hover:underline"
                >
                  Clear selection
                </button>
              </div>
            )}

            {/* Select All row */}
            {filteredReviews.length > 0 && (
              <div className="flex items-center gap-3 border-b border-black/5 px-5 py-2 bg-gray-50/50">
                <label className="flex items-center gap-2 text-xs font-semibold text-secondary/60 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    className="h-4 w-4 cursor-pointer rounded accent-primary"
                    checked={selectedIds.size === filteredReviews.length && filteredReviews.length > 0}
                    onChange={toggleSelectAll}
                  />
                  Select All ({filteredReviews.length})
                </label>
              </div>
            )}
          </div>

          {/* ═══════════════ REVIEW CARDS LIST ═══════════════ */}
          {filteredReviews.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-black/10 bg-white p-12 text-center">
              <MessageSquare className="mx-auto mb-3 text-secondary/20" size={40} />
              <p className="font-semibold text-secondary/60">No reviews match your filters</p>
              <p className="mt-1 text-sm text-secondary/40">Try adjusting your search or tab selection</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredReviews.map((review) => (
                <ReviewAdminCard
                  key={review._id}
                  review={review}
                  selected={selectedIds.has(review._id)}
                  onToggleSelect={() => toggleSelect(review._id)}
                  onApprove={() => handleUpdateStatus(review._id, "approved")}
                  onReject={() => handleUpdateStatus(review._id, "rejected")}
                  onToggleFeatured={() => handleToggleFeatured(review._id)}
                  onDelete={() => handleDelete(review._id)}
                  isReplying={replyingId === review._id}
                  onStartReply={() => {
                    setReplyingId(review._id);
                    setReplyText(review.adminReply || "");
                  }}
                  onCancelReply={() => { setReplyingId(null); setReplyText(""); }}
                  replyText={replyText}
                  onReplyTextChange={setReplyText}
                  onSubmitReply={() => handleReply(review._id)}
                  replySaving={replySaving}
                  getUserName={getUserName}
                  getUserEmail={getUserEmail}
                  getUserInitial={getUserInitial}
                  getProductName={getProductName}
                  formatDate={formatDate}
                  formatDatetime={formatDatetime}
                  statusBadge={statusBadge}
                  statusIcon={statusIcon}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Inline styles for animations */}
      <style jsx global>{`
        @keyframes slideIn {
          from { transform: translateX(30px); opacity:0; }
          to { transform: translateX(0); opacity:1; }
        }
        .animate-in { animation: slideIn 0.25s ease-out; }
      `}</style>
    </AdminShell>
  );
}

/* ══════════════════ METRIC CARD ══════════════════ */
function MetricCard({
  label,
  value,
  icon,
  color,
  iconBg,
  highlight,
  suffix,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  iconBg: string;
  highlight?: boolean;
  suffix?: string;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border p-5 shadow-sm transition hover:shadow-md ${
        highlight
          ? "border-amber-200 bg-gradient-to-br from-amber-50 to-white"
          : "border-black/5 bg-white"
      }`}
    >
      {highlight && (
        <div className="absolute top-0 right-0 h-16 w-16 rounded-bl-full bg-amber-200/30" />
      )}
      <div className={`mb-3 grid h-10 w-10 place-items-center rounded-xl ${iconBg} ${color}`}>
        {icon}
      </div>
      <p className="text-xs font-semibold text-secondary/60 uppercase tracking-wider">{label}</p>
      <p className={`mt-1 font-heading text-2xl font-bold ${color.split(" ")[1] || "text-secondary"}`}>
        {value}
        {suffix && <span className="ml-1 text-sm font-medium text-secondary/40">{suffix}</span>}
      </p>
    </div>
  );
}

/* ══════════════════ REVIEW ADMIN CARD ══════════════════ */
function ReviewAdminCard({
  review,
  selected,
  onToggleSelect,
  onApprove,
  onReject,
  onToggleFeatured,
  onDelete,
  isReplying,
  onStartReply,
  onCancelReply,
  replyText,
  onReplyTextChange,
  onSubmitReply,
  replySaving,
  getUserName,
  getUserEmail,
  getUserInitial,
  getProductName,
  formatDate,
  formatDatetime,
  statusBadge,
  statusIcon,
}: {
  review: any;
  selected: boolean;
  onToggleSelect: () => void;
  onApprove: () => void;
  onReject: () => void;
  onToggleFeatured: () => void;
  onDelete: () => void;
  isReplying: boolean;
  onStartReply: () => void;
  onCancelReply: () => void;
  replyText: string;
  onReplyTextChange: (v: string) => void;
  onSubmitReply: () => void;
  replySaving: boolean;
  getUserName: (u: any) => string;
  getUserEmail: (u: any) => string;
  getUserInitial: (u: any) => string;
  getProductName: (p: any) => string;
  formatDate: (d: string) => string;
  formatDatetime: (d: string) => string;
  statusBadge: (s: string) => string;
  statusIcon: (s: string) => React.ReactNode;
}) {
  return (
    <div
      className={`rounded-2xl border bg-white shadow-sm transition-all hover:shadow-md ${
        selected ? "border-primary/40 ring-2 ring-primary/10" : "border-black/5"
      } ${review.isFeatured ? "ring-2 ring-amber-300/40 border-amber-200" : ""}`}
    >
      {/* Featured banner */}
      {review.isFeatured && (
        <div className="flex items-center gap-2 rounded-t-2xl bg-gradient-to-r from-amber-50 to-orange-50 px-5 py-2 text-xs font-bold text-amber-700 border-b border-amber-100">
          <Sparkles size={13} className="text-amber-500" />
          Featured Review — Pinned to top of product page
        </div>
      )}

      <div className="p-5">
        {/* Top row: checkbox + user info + status + rating */}
        <div className="flex items-start gap-4">
          {/* Checkbox */}
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 shrink-0 cursor-pointer rounded accent-primary"
            checked={selected}
            onChange={onToggleSelect}
          />

          {/* Avatar */}
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary/15 to-primary/5 text-primary text-sm font-bold">
            {getUserInitial(review.user)}
          </div>

          {/* User + Product */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-secondary">{getUserName(review.user)}</span>
              {review.verified && (
                <span className="flex items-center gap-0.5 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
                  <Check size={9} strokeWidth={3} />
                  Verified
                </span>
              )}
              <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold capitalize ${statusBadge(review.status)}`}>
                {statusIcon(review.status)}
                {review.status}
              </span>
            </div>
            <div className="mt-0.5 flex items-center gap-2 text-xs text-secondary/50">
              <span>{getUserEmail(review.user)}</span>
              {getUserEmail(review.user) && <span>•</span>}
              <span>{formatDate(review.createdAt)}</span>
            </div>
            <div className="mt-1 text-xs text-secondary/60">
              <span className="font-semibold text-secondary/80">Product:</span>{" "}
              {getProductName(review.product)}
            </div>
          </div>

          {/* Stars */}
          <div className="flex items-center gap-0.5 shrink-0">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                size={16}
                className={s <= review.rating ? "text-amber-400" : "text-gray-200"}
                fill={s <= review.rating ? "currentColor" : "none"}
              />
            ))}
          </div>
        </div>

        {/* Title + Comment */}
        <div className="mt-4 ml-[72px]">
          {review.title && (
            <h4 className="font-bold text-secondary">{review.title}</h4>
          )}
          <p className={`text-sm text-secondary/80 leading-relaxed ${review.title ? "mt-1" : ""}`}>
            {review.comment}
          </p>

          {/* Media */}
          {((review.images && review.images.length > 0) || (review.videos && review.videos.length > 0)) && (
            <div className="mt-3 flex flex-wrap gap-2">
              {review.images?.map((url: string, i: number) => (
                <img key={`img-${i}`} src={url} alt="Review image" className="h-16 w-16 rounded-lg object-cover border border-black/5" />
              ))}
              {review.videos?.map((url: string, i: number) => (
                <video key={`vid-${i}`} src={url} controls className="h-16 w-auto max-w-[120px] rounded-lg object-cover border border-black/5 bg-black" />
              ))}
            </div>
          )}

          {/* Tags */}
          {review.tags && review.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {review.tags.map((tag: string) => (
                <span
                  key={tag}
                  className="rounded-md bg-gray-100 px-2 py-1 text-xs font-semibold text-secondary/60"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Admin reply (existing) */}
          {review.adminReply && !isReplying && (
            <div className="mt-4 rounded-xl border border-primary/10 bg-primary/5 px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-primary">
                  <MessageSquare size={13} />
                  From shop
                </div>
                <button
                  onClick={onStartReply}
                  className="flex items-center gap-1 text-xs font-semibold text-primary/70 hover:text-primary transition"
                >
                  <Edit3 size={12} />
                  Edit reply
                </button>
              </div>
              <p className="mt-2 text-sm text-secondary/80 leading-relaxed">{review.adminReply}</p>
              {review.adminReplyAt && (
                <p className="mt-1 text-[10px] text-secondary/40">{formatDatetime(review.adminReplyAt)}</p>
              )}
            </div>
          )}

          {/* Reply form (inline) */}
          {isReplying && (
            <div className="mt-4 rounded-xl border border-primary/20 bg-white p-4 shadow-sm">
              <label className="text-xs font-bold text-secondary/60 uppercase tracking-wider mb-2 block">
                Reply as shop
              </label>
              <textarea
                className="w-full rounded-xl border border-black/10 bg-gray-50 px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition resize-none"
                rows={3}
                placeholder="Write your reply..."
                value={replyText}
                onChange={(e) => onReplyTextChange(e.target.value)}
                autoFocus
              />
              <div className="mt-3 flex items-center gap-2 justify-end">
                <button
                  onClick={onCancelReply}
                  className="rounded-lg px-4 py-2 text-xs font-semibold text-secondary/60 transition hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  onClick={onSubmitReply}
                  disabled={replySaving || !replyText.trim()}
                  className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-white transition hover:bg-primary/90 disabled:opacity-50"
                >
                  <Send size={13} />
                  {replySaving ? "Saving..." : "Save Reply"}
                </button>
              </div>
            </div>
          )}

          {/* Actions row */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {/* Approve */}
            {review.status !== "approved" && (
              <button
                onClick={onApprove}
                className="flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100 hover:shadow-sm"
              >
                <CheckCircle2 size={14} />
                Approve
              </button>
            )}

            {/* Reject */}
            {review.status !== "rejected" && (
              <button
                onClick={onReject}
                className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-bold text-red-600 transition hover:bg-red-100 hover:shadow-sm"
              >
                <XCircle size={14} />
                Reject
              </button>
            )}

            {/* Reply */}
            {!isReplying && !review.adminReply && (
              <button
                onClick={onStartReply}
                className="flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-2 text-xs font-bold text-blue-600 transition hover:bg-blue-100 hover:shadow-sm"
              >
                <MessageSquare size={14} />
                Reply
              </button>
            )}

            {/* Featured Pin */}
            <button
              onClick={onToggleFeatured}
              className={`flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-bold transition hover:shadow-sm ${
                review.isFeatured
                  ? "border-amber-300 bg-amber-100 text-amber-700 hover:bg-amber-50"
                  : "border-black/10 bg-white text-secondary/60 hover:bg-amber-50 hover:text-amber-600 hover:border-amber-200"
              }`}
              title={review.isFeatured ? "Unpin from featured" : "Pin as featured"}
            >
              <Pin size={14} className={review.isFeatured ? "fill-current" : ""} />
              {review.isFeatured ? "Unpin" : "Pin"}
            </button>

            {/* Delete */}
            <button
              onClick={onDelete}
              className="flex items-center gap-1.5 rounded-xl border border-black/10 bg-white px-3.5 py-2 text-xs font-bold text-secondary/50 transition hover:bg-red-50 hover:text-red-500 hover:border-red-200 hover:shadow-sm ml-auto"
            >
              <Trash2 size={14} />
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
