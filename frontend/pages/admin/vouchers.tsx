import { confirmAction } from "../../components/ConfirmModal";
import { useState, useMemo, useEffect, useCallback } from "react";
import Head from "next/head";
import { AdminShell } from "../../components/admin/AdminShell";
import { fetchAdminCoupons, createAdminCoupon, updateAdminCoupon, updateAdminCouponStatus, deleteAdminCoupon, fetchNotifications, fetchCategories, fetchProducts } from "../../lib/api";
import { useRouter } from "next/router";
import {
  Ticket,
  Plus,
  Search,
  Filter,
  Copy,
  CheckCircle2,
  XCircle,
  Clock,
  PauseCircle,
  Dices,
  Percent,
  DollarSign,
  Truck,
  Users,
  Target,
  ShieldAlert,
  ArrowLeft,
  Calendar,
  MoreVertical,
  AlertTriangle,
  Edit3,
  Trash2,
  PlayCircle
} from "lucide-react";

// Types
type VoucherStatus = "running" | "waiting" | "completed" | "paused";

type Voucher = {
  _id: string; // Mongo ID
  code: string;
  program: string;
  discountType: "amount" | "percent" | "shipping";
  amount: number;
  maxDiscount?: number;
  usageCount: number;
  usageLimit?: number;
  startDate: string;
  expiresAt: string;
  status: VoucherStatus;
  applicableCategories?: any[];
  applicableProducts?: any[];
};

// Mock Data as Fallback
const MOCK_VOUCHERS: Voucher[] = [
  {
    _id: "1",
    code: "VOTMOI2026",
    program: "Exciting Summer Sale (Demo)",
    discountType: "percent",
    amount: 10,
    maxDiscount: 2,
    usageCount: 45,
    usageLimit: 100,
    startDate: "2026-04-01T00:00:00Z",
    expiresAt: "2026-04-30T23:59:59Z",
    status: "running"
  },
  {
    _id: "2",
    code: "GIAYSIZE44",
    program: "Clearance Sale (Demo)",
    discountType: "amount",
    amount: 15,
    usageCount: 12,
    usageLimit: 50,
    startDate: "2026-04-05T00:00:00Z",
    expiresAt: "2026-05-05T23:59:59Z",
    status: "running"
  }
];

export default function AdminVouchers() {
  const router = useRouter();

  // Auth & Token
  const [authChecked, setAuthChecked] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  // Data
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [usingMockData, setUsingMockData] = useState(false);

  // UI States
  const [view, setView] = useState<"list" | "form">("list");
  const [search, setSearch] = useState("");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [notifUnreadCount, setNotifUnreadCount] = useState(0);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [selectedVoucher, setSelectedVoucher] = useState<Voucher | null>(null);

  // --- FORM STATE ---
  const [code, setCode] = useState("");
  const [program, setProgram] = useState("");
  const [discountType, setDiscountType] = useState<"amount" | "percent" | "shipping">("amount");
  const [amount, setAmount] = useState<number | "">("");
  const [maxDiscount, setMaxDiscount] = useState<number | "">("");
  const [minOrderValue, setMinOrderValue] = useState<number | "">("");

  const [applyTo, setApplyTo] = useState<"store" | "category" | "product">("store");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [categoriesList, setCategoriesList] = useState<any[]>([]);
  const [productsList, setProductsList] = useState<any[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [excludeFlashSale, setExcludeFlashSale] = useState(false);
  const [excludeShuttlecocks, setExcludeShuttlecocks] = useState(true);

  const [customerTarget, setCustomerTarget] = useState("all");
  const [specificCustomersData, setSpecificCustomersData] = useState("");
  const [membershipTarget, setMembershipTarget] = useState("all");

  const [usageLimit, setUsageLimit] = useState<number | "">("");
  const [limitPerCustomer, setLimitPerCustomer] = useState(1);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

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

    if (!t || !user) { setAuthChecked(true); router.replace("/login?next=/admin/vouchers"); return; }
    if (!["admin"].includes(user.role)) { setAuthChecked(true); router.replace("/"); return; }
    setAuthChecked(true);
  }, []);

  // ── Load Vouchers & Dependencies ──
  useEffect(() => {
    if (!authChecked || !token) return;
    loadVouchers();

    // Load categories and products for the form
    fetchCategories().then(data => setCategoriesList(data)).catch(() => {});
    fetchProducts({ limit: 1000 }).then(data => setProductsList(data.data)).catch(() => {});

    // Auto-update every 10 seconds in the background
    const interval = setInterval(() => {
      fetchAdminCoupons(token!).then((data) => {
        if (data && !usingMockData) {
          const now = new Date();
          const updated = data.map((v: any) => {
            if ((v.status === "running" || v.status === "waiting") && new Date(v.expiresAt) < now) {
              return { ...v, status: "completed" };
            }
            return v;
          });
          setVouchers(updated);
        }
      }).catch(() => { });
    }, 10000);

    return () => clearInterval(interval);
  }, [authChecked, token, usingMockData]);

  const loadVouchers = async () => {
    setLoading(true);
    setError("");
    setUsingMockData(false);
    try {
      const data = await fetchAdminCoupons(token!);
      setVouchers(data || []);
    } catch (err: any) {
      setUsingMockData(true);
      setError("Live API unavailable. Loaded demo data instead.");
      setVouchers(MOCK_VOUCHERS);
    } finally {
      setLoading(false);
    }
  };

  // ── Notifications ──
  useEffect(() => {
    if (!authChecked || !token) return;
    const fetchNotifs = () => {
      fetchNotifications(token!).then((data) => {
        const list = Array.isArray(data) ? data : [];
        setNotifUnreadCount(list.filter((n: any) => !n.isRead).length);
      }).catch(() => { });
    };
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 30000);
    return () => clearInterval(interval);
  }, [authChecked, token]);

  const generateRandomCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let res = "";
    for (let i = 0; i < 8; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCode(res);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(text);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleSubmit = async () => {
    if (!code || !program || !amount || !startDate || !endDate) {
      showToast("Please fill all required fields", "error");
      return;
    }
    if (discountType === "percent" && !maxDiscount) {
      showToast("Maximum Discount limits are REQUIRED for percentage discounts!", "error");
      return;
    }

    const payload = {
      code,
      program,
      discountType,
      amount: Number(amount),
      maxDiscount: maxDiscount ? Number(maxDiscount) : undefined,
      minOrderValue: minOrderValue ? Number(minOrderValue) : undefined,
      startDate: new Date(startDate),
      expiresAt: new Date(endDate),
      applyTo,
      applicableCategories: applyTo === "category" ? selectedCategories : [],
      applicableProducts: applyTo === "product" ? selectedProducts : [],
      excludeFlashSale,
      excludeShuttlecocks,
      customerTarget,
      specificCustomers: customerTarget === "specific" ? specificCustomersData.split(',').map(s => s.trim()).filter(Boolean) : [],
      membershipTarget,
      usageLimit: usageLimit ? Number(usageLimit) : undefined,
      limitPerCustomer
    };

    setIsSubmitting(true);
    try {
      if (editingId) {
        if (usingMockData || !token) {
          const updated = vouchers.map(v => v._id === editingId ? { ...v, ...payload } : v);
          setVouchers(updated as Voucher[]);
          showToast("Mock Voucher updated");
        } else {
          const result = await updateAdminCoupon(editingId, payload, token);
          setVouchers(vouchers.map(v => v._id === editingId ? result : v));
          showToast("Voucher updated successfully!");
        }
      } else {
        if (usingMockData || !token) {
          // Mock add
          const newVoucher: Voucher = {
            _id: Math.random().toString(),
            ...payload,
            startDate: payload.startDate.toISOString(),
            expiresAt: payload.expiresAt.toISOString(),
            usageCount: 0,
            status: "running" as VoucherStatus
          };
          setVouchers([newVoucher, ...vouchers]);
          showToast("Mock Voucher created");
        } else {
          const result = await createAdminCoupon(payload, token);
          setVouchers([result, ...vouchers]);
          showToast("Voucher created successfully!");
        }
      }

      setView("list");
      setEditingId(null);
      // Reset form
      setCode(""); setProgram(""); setAmount(""); setMaxDiscount(""); setUsageLimit("");
      setStartDate(""); setEndDate("");
      setMinOrderValue(""); setLimitPerCustomer(1);
      setSelectedCategories([]); setSelectedProducts([]);
      setApplyTo("store"); setCustomerTarget("all"); setSpecificCustomersData(""); setMembershipTarget("all");
    } catch (e: any) {
      showToast(e?.response?.data?.error || `Failed to ${editingId ? "update" : "create"} voucher`, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (v: Voucher) => {
    setEditingId(v._id);
    setCode(v.code);
    setProgram(v.program);
    setDiscountType(v.discountType);
    setAmount(v.amount);
    setMaxDiscount(v.maxDiscount || "");
    setMinOrderValue((v as any).minOrderValue || "");
    setUsageLimit(v.usageLimit || "");
    setLimitPerCustomer((v as any).limitPerCustomer || 1);
    setApplyTo((v as any).applyTo || "store");
    setCustomerTarget((v as any).customerTarget || "all");
    setSpecificCustomersData(((v as any).specificCustomers || []).join(", "));
    setMembershipTarget((v as any).membershipTarget || "all");
    setSelectedCategories((v.applicableCategories || []).map((c: any) => c._id || c));
    setSelectedProducts((v.applicableProducts || []).map((p: any) => p._id || p));

    // Convert to local datetime string format for input
    const start = new Date(v.startDate);
    const end = new Date(v.expiresAt);
    const startStr = new Date(start.getTime() - start.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    const endStr = new Date(end.getTime() - end.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

    setStartDate(startStr);
    setEndDate(endStr);

    setView("form");
  };

  const handleDelete = async (id: string) => {
    if (!(await confirmAction("Are you sure you want to delete this?"))) return;
    if (!confirm("Are you sure you want to delete this voucher?")) return;
    try {
      if (!usingMockData && token) {
        await deleteAdminCoupon(id, token);
      }
      setVouchers(vouchers.filter(v => v._id !== id));
      showToast("Voucher deleted");
    } catch (e: any) {
      showToast(e?.response?.data?.error || "Failed to delete voucher", "error");
    }
  };

  const handleStatusChange = async (id: string, currentStatus: VoucherStatus) => {
    const newStatus = currentStatus === "running" ? "paused" : "running";
    try {
      if (!usingMockData && token) {
        await updateAdminCouponStatus(id, newStatus, token);
      }
      setVouchers(vouchers.map(v => v._id === id ? { ...v, status: newStatus as VoucherStatus } : v));
      showToast(`Voucher ${newStatus === "running" ? "resumed" : "paused"}`);
    } catch (e: any) {
      showToast(e?.response?.data?.error || "Failed to update status", "error");
    }
  };

  const getStatusBadge = (status: VoucherStatus) => {
    switch (status) {
      case "running":
        return <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700"><CheckCircle2 size={12} /> Running</span>;
      case "waiting":
        return <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-blue-700"><Clock size={12} /> Waiting</span>;
      case "completed":
        return <span className="inline-flex items-center gap-1 rounded-full bg-black/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-secondary/70"><XCircle size={12} /> Completed</span>;
      case "paused":
        return <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-700"><PauseCircle size={12} /> Paused</span>;
    }
  };

  const renderDiscountText = (v: Voucher) => {
    if (v.discountType === "amount") return <span className="font-semibold text-emerald-600">${v.amount} OFF</span>;
    if (v.discountType === "percent") return (
      <div className="flex flex-col">
        <span className="font-semibold text-blue-600">{v.amount}% OFF</span>
        {v.maxDiscount && <span className="text-xs text-secondary/50">Max ${v.maxDiscount}</span>}
      </div>
    );
    if (v.discountType === "shipping") return (
      <div className="flex flex-col">
        <span className="font-semibold text-violet-600">Free Ship</span>
        {v.amount && <span className="text-xs text-secondary/50">Max ${v.amount}</span>}
      </div>
    );
  };

  const filtered = useMemo(() => {
    return vouchers.filter(v => v.code.toLowerCase().includes(search.toLowerCase()) || v.program.toLowerCase().includes(search.toLowerCase()));
  }, [search, vouchers]);

  const totalDiscountSpent = useMemo(() => {
    // just a mock sum for visual completeness if backend doesn't provide
    return vouchers.reduce((acc, v) => acc + (v.usageCount * (v.discountType === "amount" ? v.amount : v.discountType === "percent" ? v.maxDiscount ? v.maxDiscount : v.amount : v.amount)), 0);
  }, [vouchers]);

  return (
    <AdminShell
      title="Vouchers & Coupons"
      section="vouchers"
      onSectionChange={(s) => {
        if (s === "dashboard") router.push("/admin");
        else router.push(`/admin/${s}`);
      }}
      onLogout={() => {
        if (typeof window !== "undefined") {
          localStorage.removeItem("accessToken");
          localStorage.removeItem("user");
        }
        router.push("/login");
      }}
      notificationCount={notifUnreadCount}
    >
      <Head>
        <title>Vouchers - Admin | Badminton Hub</title>
      </Head>

      {/* TOAST */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 rounded-2xl px-5 py-3 text-sm font-semibold shadow-lg transition-all animate-in ${toast.type === "success" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"}`}>
          {toast.type === "success" ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          {toast.message}
        </div>
      )}

      {!authChecked && <div className="p-6">Checking access...</div>}

      {authChecked && error && usingMockData && (
        <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700 flex items-center gap-2">
          <AlertTriangle size={16} />
          Demo Mode — API unavailable or returned an error. Using local mock data.
        </div>
      )}

      {authChecked && view === "list" ? (
        <div className="space-y-6">
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="flex flex-col rounded-2xl border border-black/5 bg-white p-6 shadow-card relative overflow-hidden group">
              <div className="absolute -right-4 -top-4 rounded-full bg-primary/5 p-8 transition-transform group-hover:scale-110">
                <Ticket size={48} className="text-primary/20" />
              </div>
              <p className="text-sm font-semibold text-secondary/60">Active Codes</p>
              <p className="mt-2 font-heading text-4xl font-bold text-secondary">{vouchers.filter(v => v.status === "running").length}</p>
            </div>
            <div className="flex flex-col rounded-2xl border border-black/5 bg-white p-6 shadow-card relative overflow-hidden group">
              <div className="absolute -right-4 -top-4 rounded-full bg-emerald-500/5 p-8 transition-transform group-hover:scale-110">
                <DollarSign size={48} className="text-emerald-500/20" />
              </div>
              <p className="text-sm font-semibold text-secondary/60">Total Discount Spent (Est)</p>
              <p className="mt-2 font-heading text-4xl font-bold text-secondary">${totalDiscountSpent}</p>
            </div>
            <div className="flex flex-col rounded-2xl border border-black/5 bg-white p-6 shadow-card relative overflow-hidden group">
              <div className="absolute -right-4 -top-4 rounded-full bg-blue-500/5 p-8 transition-transform group-hover:scale-110">
                <Target size={48} className="text-blue-500/20" />
              </div>
              <p className="text-sm font-semibold text-secondary/60">Most Used Code</p>
              <div className="mt-2 flex items-baseline gap-2">
                <p className="font-heading text-2xl font-bold text-secondary">
                  {vouchers.length > 0 ? vouchers.reduce((a, b) => a.usageCount > b.usageCount ? a : b).code : "N/A"}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary/40" size={18} />
              <input
                type="text"
                placeholder="Search codes, programs..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-full border border-black/10 bg-white py-2 pl-10 pr-4 text-sm font-semibold outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="flex items-center gap-3">
              <button className="flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-secondary transition hover:bg-black/5">
                <Filter size={16} /> Filters
              </button>
              <button
                onClick={() => {
                  setEditingId(null);
                  setCode(""); setProgram(""); setAmount(""); setMaxDiscount(""); setUsageLimit("");
                  setStartDate(""); setEndDate(""); setSpecificCustomersData("");
                  setView("form");
                }}
                className="flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary/90"
              >
                <Plus size={16} /> New Voucher
              </button>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-card">
            {loading ? (
              <div className="flex justify-center p-12">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px] text-left text-sm">
                  <thead className="bg-black/5 text-xs uppercase text-secondary/60">
                    <tr>
                      <th className="px-6 py-4 font-semibold">Code / Program</th>
                      <th className="px-6 py-4 font-semibold w-32">Type</th>
                      <th className="px-6 py-4 font-semibold w-52">Usage Progress</th>
                      <th className="px-6 py-4 font-semibold w-40">Expiration</th>
                      <th className="px-6 py-4 font-semibold w-24">Status</th>
                      <th className="px-6 py-4 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5">
                    {filtered.map((v) => {
                      const isNearExpiry = v.status === "running" && new Date(v.expiresAt).getTime() - new Date().getTime() < 3 * 24 * 60 * 60 * 1000;
                      const percentUsed = v.usageLimit ? Math.round((v.usageCount / v.usageLimit) * 100) : 0;

                      return (
                        <tr key={v._id} className="group transition hover:bg-black/5 cursor-pointer" onClick={() => setSelectedVoucher(v)}>
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-1 items-start">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-base text-primary bg-primary/10 px-2 py-0.5 rounded-md">{v.code}</span>
                                <button
                                  onClick={(e) => { e.stopPropagation(); copyToClipboard(v.code); }}
                                  className={`text-secondary/40 transition hover:text-secondary ${copiedCode === v.code ? 'text-emerald-500' : ''}`}
                                  title="Copy code"
                                >
                                  {copiedCode === v.code ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                                </button>
                              </div>
                              <span className="text-secondary/70 line-clamp-1" title={v.program}>{v.program}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            {renderDiscountText(v)}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-2">
                              <div className="flex justify-between text-xs font-semibold">
                                <span className="text-secondary/80">{v.usageCount} / {v.usageLimit || '∞'}</span>
                                {v.usageLimit && <span className="text-secondary/50">{percentUsed}%</span>}
                              </div>
                              {v.usageLimit ? (
                                <div className="h-2 w-full rounded-full bg-black/10 overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all ${percentUsed > 90 ? 'bg-red-500' : percentUsed > 70 ? 'bg-amber-500' : 'bg-primary'}`}
                                    style={{ width: `${Math.min(percentUsed, 100)}%` }}
                                  />
                                </div>
                              ) : (
                                <div className="text-xs text-secondary/40 italic">Unlimited uses</div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span suppressHydrationWarning className="text-secondary/80">{new Date(v.startDate).toLocaleDateString()}</span>
                              <span suppressHydrationWarning className={`transition ${isNearExpiry ? 'text-red-600 font-bold' : 'text-secondary/60'}`}>
                                {new Date(v.expiresAt).toLocaleDateString()}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            {getStatusBadge(v.status)}
                          </td>
                          <td className="px-6 py-4 text-right relative" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => setActiveDropdown(activeDropdown === v._id ? null : v._id)}
                              className="rounded p-2 text-secondary/40 transition hover:bg-black/5 hover:text-secondary"
                            >
                              <MoreVertical size={16} />
                            </button>
                            {activeDropdown === v._id && (
                              <div className=" right-6 top-10 z-10 w-44 rounded-xl border border-black/5 bg-white p-1 shadow-lg animate-in fade-in zoom-in-95 text-left">
                                <button onClick={() => { handleEdit(v); setActiveDropdown(null); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-secondary hover:bg-black/5">
                                  <Edit3 size={14} /> Edit Campaign
                                </button>
                                {v.status === "running" || v.status === "paused" ? (
                                  <button onClick={() => { handleStatusChange(v._id, v.status); setActiveDropdown(null); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-secondary hover:bg-amber-50 hover:text-amber-600">
                                    {v.status === "running" ? <><PauseCircle size={14} /> Pause Campaign</> : <><PlayCircle size={14} /> Resume Campaign</>}
                                  </button>
                                ) : null}
                                <button onClick={() => { handleDelete(v._id); setActiveDropdown(null); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50">
                                  <Trash2 size={14} /> Delete
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {!loading && filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center p-12 text-center">
                <Ticket size={48} className="mb-4 text-secondary/20" />
                <p className="text-lg font-semibold text-secondary">No vouchers found</p>
                <p className="max-w-sm text-sm text-secondary/60">Try adjusting your search or create a new voucher campaign.</p>
              </div>
            )}
          </div>
          {/* ── DETAILS DRAWER ── */}
          {selectedVoucher && (
            <>
              <div
                className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm transition-opacity"
                onClick={() => setSelectedVoucher(null)}
              />
              <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white shadow-2xl transition-transform flex flex-col animate-in slide-in-from-right">
                <div className="flex items-center justify-between border-b border-black/5 px-6 py-4 bg-gray-50">
                  <div>
                    <h2 className="text-xl font-bold text-secondary">Coupon Details</h2>
                    <p className="text-xs text-secondary/60">Quick overview</p>
                  </div>
                  <button
                    onClick={() => setSelectedVoucher(null)}
                    className="rounded-full p-2 text-secondary/40 transition hover:bg-black/5 hover:text-secondary"
                  >
                    <XCircle size={24} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-mono text-2xl font-black text-primary tracking-widest">{selectedVoucher.code}</span>
                      <div className="text-sm font-medium text-secondary/70 mt-1">{selectedVoucher.program}</div>
                    </div>
                    {getStatusBadge(selectedVoucher.status)}
                  </div>

                  <div className="rounded-2xl border border-black/5 p-4 bg-gray-50 flex gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 shrink-0">
                      {selectedVoucher.discountType === "percent" ? <Percent size={24} /> : selectedVoucher.discountType === "shipping" ? <Truck size={24} /> : <DollarSign size={24} />}
                    </div>
                    <div>
                      <h4 className="font-bold text-secondary text-lg">
                        {selectedVoucher.discountType === "amount" ? `$${selectedVoucher.amount}` : selectedVoucher.discountType === "percent" ? `${selectedVoucher.amount}%` : "Free Shipping"}
                        <span className="font-medium text-sm text-secondary/60 ml-1">Discount</span>
                      </h4>
                      {selectedVoucher.maxDiscount && (
                        <span className="text-xs font-semibold text-red-500 bg-red-50 px-2 py-0.5 rounded">Max Value: ${selectedVoucher.maxDiscount}</span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h3 className="font-bold text-sm uppercase text-secondary/50 tracking-wider">Campaign Limits</h3>
                    <div className="flex justify-between py-2 border-b border-black/5 text-sm">
                      <span className="text-secondary/60">Validity Dates</span>
                      <span className="font-semibold text-secondary text-right">
                        {new Date(selectedVoucher.startDate).toLocaleDateString()} - <br />
                        {new Date(selectedVoucher.expiresAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-black/5 text-sm">
                      <span className="text-secondary/60">Total Used</span>
                      <span className="font-semibold text-secondary">{selectedVoucher.usageCount} {selectedVoucher.usageLimit ? `/ ${selectedVoucher.usageLimit}` : " (Unlimited)"}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-black/5 text-sm">
                      <span className="text-secondary/60">Per Customer Limit</span>
                      <span className="font-semibold text-secondary">{(selectedVoucher as any).limitPerCustomer} time(s)</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-black/5 text-sm">
                      <span className="text-secondary/60">Minimum Order</span>
                      <span className="font-semibold text-secondary">{(selectedVoucher as any).minOrderValue ? `$${(selectedVoucher as any).minOrderValue}` : "No minimum"}</span>
                    </div>
                  </div>
                </div>

                <div className="border-t border-black/5 p-4 bg-gray-50 flex gap-3">
                  <button
                    onClick={() => { handleEdit(selectedVoucher); setSelectedVoucher(null); }}
                    className="flex-1 rounded-xl bg-white border border-black/10 py-3 text-sm font-bold text-secondary shadow-sm transition hover:bg-black/5"
                  >
                    <Edit3 size={16} className="inline mr-2" /> Edit Fully
                  </button>
                  <button
                    onClick={() => handleStatusChange(selectedVoucher._id, selectedVoucher.status)}
                    className={`flex-1 rounded-xl py-3 text-sm font-bold shadow-sm transition text-white ${selectedVoucher.status === "running" ? "bg-amber-500 hover:bg-amber-600" : "bg-emerald-500 hover:bg-emerald-600"}`}
                  >
                    {selectedVoucher.status === "running" ? "Pause Now" : "Resume"}
                  </button>
                </div>
              </div>
            </>
          )}

        </div>
      ) : authChecked && view === "form" ? (
        <div className="mx-auto max-w-4xl animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="mb-6 flex items-center justify-between">
            <button
              onClick={() => setView("list")}
              className="group flex items-center gap-2 text-sm font-semibold text-secondary/60 transition hover:text-secondary"
            >
              <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-1" /> Back to List
            </button>
            <div className="flex items-center gap-3">
              <button disabled={isSubmitting} className="rounded-full bg-primary px-6 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90 hover:shadow disabled:opacity-50">
                {isSubmitting ? "Publishing..." : "Publish Voucher"}
              </button>
            </div>
          </div>

          <div className="space-y-8">
            {/* Block A: Basic Info */}
            <section className="rounded-2xl border border-black/5 bg-white p-6 shadow-card sm:p-8 relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-1 h-full bg-primary"></div>
              <div className="mb-6 flex items-center gap-3 border-b border-black/5 pb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Ticket size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-secondary">A. Basic Info</h2>
                  <p className="text-xs text-secondary/60">Identify the campaign and entry code</p>
                </div>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-secondary">Discount Code</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={code}
                      onChange={(e) => setCode(e.target.value.toUpperCase())}
                      placeholder="e.g. LIXI2026"
                      className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 font-mono text-lg font-bold uppercase outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
                    />
                    <button
                      onClick={generateRandomCode}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg bg-black/5 p-2 text-secondary/60 transition hover:bg-black/10 hover:text-secondary"
                      title="Generate random code"
                    >
                      <Dices size={18} />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-secondary">Program Name</label>
                  <input
                    type="text"
                    value={program}
                    onChange={e => setProgram(e.target.value)}
                    placeholder="e.g. Exciting Summer Sale"
                    className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm font-medium outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                  <p className="mt-1 text-xs text-secondary/50">For internal management only.</p>
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-2 block text-sm font-semibold text-secondary">Applicable Channels</label>
                  <div className="flex flex-wrap gap-4">
                    <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-black/10 bg-white px-4 py-3 transition hover:border-black/20 has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                      <input type="checkbox" className="accent-primary" defaultChecked />
                      <span className="text-sm font-medium">Website</span>
                    </label>
                    <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-black/10 bg-white px-4 py-3 transition hover:border-black/20 has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                      <input type="checkbox" className="accent-primary" defaultChecked />
                      <span className="text-sm font-medium">In-store POS</span>
                    </label>
                  </div>
                </div>
              </div>
            </section>

            {/* Block B: Discount Type */}
            <section className="rounded-2xl border border-black/5 bg-white p-6 shadow-card sm:p-8 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
              <div className="mb-6 flex items-center gap-3 border-b border-black/5 pb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
                  <DollarSign size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-secondary">B. Discount Configuration</h2>
                  <p className="text-xs text-secondary/60">Set how money is given to the customer</p>
                </div>
              </div>

              <div className="mb-6 grid grid-cols-3 gap-3">
                <button
                  onClick={() => setDiscountType("amount")}
                  className={`flex flex-col items-center gap-2 rounded-xl border p-4 transition ${discountType === "amount" ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-black/10 hover:border-black/20 hover:bg-black/5 text-secondary/70"}`}
                >
                  <DollarSign size={24} />
                  <span className="text-sm font-bold">Fixed Amount</span>
                </button>
                <button
                  onClick={() => setDiscountType("percent")}
                  className={`flex flex-col items-center gap-2 rounded-xl border p-4 transition ${discountType === "percent" ? "border-blue-500 bg-blue-50 text-blue-700" : "border-black/10 hover:border-black/20 hover:bg-black/5 text-secondary/70"}`}
                >
                  <Percent size={24} />
                  <span className="text-sm font-bold">Percentage</span>
                </button>
                <button
                  onClick={() => setDiscountType("shipping")}
                  className={`flex flex-col items-center gap-2 rounded-xl border p-4 transition ${discountType === "shipping" ? "border-violet-500 bg-violet-50 text-violet-700" : "border-black/10 hover:border-black/20 hover:bg-black/5 text-secondary/70"}`}
                >
                  <Truck size={24} />
                  <span className="text-sm font-bold">Free Shipping</span>
                </button>
              </div>

              <div className="grid gap-6 sm:grid-cols-2 rounded-xl bg-black/5 p-6 border border-black/5">
                {discountType === "amount" && (
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-secondary">Discount Amount ($)</label>
                    <input
                      type="number"
                      value={amount}
                      onChange={e => setAmount(Number(e.target.value))}
                      placeholder="e.g. 15"
                      className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
                    />
                  </div>
                )}

                {discountType === "percent" && (
                  <>
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-secondary">Discount Percentage (%)</label>
                      <div className="relative">
                        <input
                          type="number"
                          value={amount}
                          onChange={e => setAmount(Number(e.target.value))}
                          placeholder="e.g. 10"
                          className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
                        />
                        <Percent size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-secondary/40" />
                      </div>
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-bold text-red-600 flex items-center gap-1">
                        <ShieldAlert size={14} /> Maximum Discount ($)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          value={maxDiscount}
                          onChange={e => setMaxDiscount(Number(e.target.value))}
                          placeholder="REQUIRED! e.g. 5"
                          className="w-full rounded-xl border border-red-200 bg-white px-4 py-3 outline-none transition focus:border-red-500 focus:ring-1 focus:ring-red-500 placeholder:text-red-300"
                        />
                      </div>
                      <p className="mt-2 text-[11px] font-medium text-red-500">
                        Critical: Without limits, a 10% off on a $500 order costs you $50.
                      </p>
                    </div>
                  </>
                )}

                {discountType === "shipping" && (
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-secondary">Maximum Shipping Discount ($)</label>
                    <input
                      type="number"
                      value={amount}
                      onChange={e => setAmount(Number(e.target.value))}
                      placeholder="e.g. 2"
                      className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
                    />
                  </div>
                )}
              </div>
            </section>

            {/* Block C: Conditions */}
            <section className="rounded-2xl border border-black/5 bg-white p-6 shadow-card sm:p-8 relative overflow-hidden border-t-4 border-t-amber-500">
              <div className="mb-6 flex items-center gap-3 border-b border-black/5 pb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10 text-amber-600">
                  <Target size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-secondary">C. Conditions (Profit Protection)</h2>
                  <p className="text-xs text-secondary/60">Crucial filters to protect your store's capital</p>
                </div>
              </div>

              <div className="space-y-8">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-secondary">Minimum Order Value ($)</label>
                  <input
                    type="number"
                    value={minOrderValue}
                    onChange={e => setMinOrderValue(Number(e.target.value))}
                    placeholder="e.g. 20"
                    className="w-full sm:w-1/2 rounded-xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="rounded-xl border border-black/5 bg-black/5 p-5 flex flex-col gap-4">
                    <div>
                      <h3 className="mb-4 text-sm font-bold text-secondary">Applies To</h3>
                      <div className="space-y-3">
                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                          <input type="radio" name="applyTo" value="store" checked={applyTo === "store"} onChange={() => setApplyTo("store")} className="accent-primary" /> Entire Store
                        </label>
                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                          <input type="radio" name="applyTo" value="category" checked={applyTo === "category"} onChange={() => setApplyTo("category")} className="accent-primary" /> Specific Category
                        </label>
                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                          <input type="radio" name="applyTo" value="product" checked={applyTo === "product"} onChange={() => setApplyTo("product")} className="accent-primary" /> Specific Product
                        </label>
                      </div>
                    </div>
                    
                    {applyTo === "category" && (
                      <div className="mt-2 flex flex-col gap-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                        <h4 className="text-xs font-semibold text-secondary/70">Select Categories:</h4>
                        {categoriesList.map(cat => (
                          <label key={cat._id} className="flex items-center gap-2 text-sm cursor-pointer bg-white p-2 rounded-lg border border-black/5 hover:border-primary/50 transition">
                            <input 
                              type="checkbox" 
                              checked={selectedCategories.includes(cat._id)}
                              onChange={(e) => {
                                if (e.target.checked) setSelectedCategories([...selectedCategories, cat._id]);
                                else setSelectedCategories(selectedCategories.filter(id => id !== cat._id));
                              }}
                              className="accent-primary" 
                            />
                            {cat.name}
                          </label>
                        ))}
                      </div>
                    )}
                    
                    {applyTo === "product" && (
                      <div className="mt-2 flex flex-col gap-2">
                        <h4 className="text-xs font-semibold text-secondary/70">Select Products:</h4>
                        <input
                          type="text"
                          placeholder="Search products..."
                          value={productSearch}
                          onChange={(e) => setProductSearch(e.target.value)}
                          className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm outline-none transition focus:border-primary"
                        />
                        <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar mt-1">
                          {productsList.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase())).map(prod => (
                            <label key={prod._id} className="flex items-start gap-2 text-sm cursor-pointer bg-white p-2 rounded-lg border border-black/5 hover:border-primary/50 transition">
                              <input 
                                type="checkbox" 
                                checked={selectedProducts.includes(prod._id)}
                                onChange={(e) => {
                                  if (e.target.checked) setSelectedProducts([...selectedProducts, prod._id]);
                                  else setSelectedProducts(selectedProducts.filter(id => id !== prod._id));
                                }}
                                className="accent-primary mt-1" 
                              />
                              <div className="flex flex-col">
                                <span className="font-medium line-clamp-1">{prod.name}</span>
                                <span className="text-xs text-secondary/50">${prod.basePrice}</span>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="rounded-xl border border-red-100 bg-red-50 p-5">
                    <h3 className="mb-4 text-sm font-bold text-red-700">Exclusions (Mandatory)</h3>
                    <div className="space-y-3">
                      <label className="flex items-center gap-2 text-sm text-red-800 cursor-pointer font-medium">
                        <input type="checkbox" checked={excludeFlashSale} onChange={e => setExcludeFlashSale(e.target.checked)} className="accent-red-600" /> Exclude Flash Sale items
                      </label>
                      <label className="flex items-center gap-2 text-sm text-red-800 cursor-pointer font-medium">
                        <input type="checkbox" checked={excludeShuttlecocks} onChange={e => setExcludeShuttlecocks(e.target.checked)} className="accent-red-600" /> Exclude Badminton Shuttlecocks
                      </label>
                      <div className="pt-2">
                        <button className="text-xs font-semibold text-red-600 underline hover:text-red-800">
                          + Add custom exclusion
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t border-black/5 pt-6">
                  <h3 className="mb-4 text-sm font-bold text-secondary flex items-center gap-2">
                    <Users size={16} /> Customer Conditions
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="flex flex-col gap-2">
                      <select value={customerTarget} onChange={e => setCustomerTarget(e.target.value)} className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm font-medium outline-none transition focus:border-primary">
                        <option value="all">All Customers</option>
                        <option value="new">New Customers Only (First Purchase)</option>
                        <option value="specific">Specific Phone/Email</option>
                      </select>
                      {customerTarget === "specific" && (
                        <textarea
                          value={specificCustomersData}
                          onChange={e => setSpecificCustomersData(e.target.value)}
                          placeholder="Enter emails or phones separated by commas (e.g. user1@gmail.com, 0901234567)"
                          className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm font-medium outline-none transition focus:border-primary min-h-[80px]"
                        />
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <select value={membershipTarget} onChange={e => setMembershipTarget(e.target.value)} className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm font-medium outline-none transition focus:border-primary">
                        <option value="all">All Membership Tiers</option>
                        <option value="bronze">Bronze & Above</option>
                        <option value="silver">Silver & Above</option>
                        <option value="gold">Gold & Diamond Only</option>
                        <option value="diamond">Diamond Only</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Block D: Usage Limits */}
            <section className="rounded-2xl border border-black/5 bg-white p-6 shadow-card sm:p-8 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
              <div className="mb-6 flex items-center gap-3 border-b border-black/5 pb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10 text-blue-600">
                  <Calendar size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-secondary">D. Usage & Limits</h2>
                  <p className="text-xs text-secondary/60">Timeframes and caps</p>
                </div>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-secondary">Total Quantity Available</label>
                  <input
                    type="number"
                    value={usageLimit}
                    onChange={e => setUsageLimit(Number(e.target.value))}
                    placeholder="e.g. 100"
                    className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                  <p className="mt-1 text-xs text-secondary/50">Auto-expires when limit is reached.</p>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-secondary">Usage Limit Per Customer</label>
                  <select value={limitPerCustomer} onChange={e => setLimitPerCustomer(Number(e.target.value))} className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-primary focus:ring-1 focus:ring-primary">
                    <option value={1}>1 time per customer</option>
                    <option value={2}>2 times per customer</option>
                    <option value={999}>Unlimited</option>
                  </select>
                  <p className="mt-1 text-xs text-secondary/50">Prevents splitting orders.</p>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-secondary">Start Date & Time</label>
                  <input
                    type="datetime-local"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-secondary">End Date & Time</label>
                  <input
                    type="datetime-local"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
            </section>
          </div>

          <div className="mt-8 flex items-center justify-end gap-4 pb-12">
            <button
              onClick={() => setView("list")}
              className="rounded-full px-6 py-3 text-sm font-bold text-secondary/70 transition hover:text-secondary hover:bg-black/5"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="rounded-full bg-primary px-8 py-3 text-sm font-bold text-white shadow-lg shadow-primary/20 transition hover:bg-primary/90 hover:shadow-xl hover:shadow-primary/30 disabled:opacity-50"
            >
              {isSubmitting ? "Processing..." : editingId ? "Update Campaign" : "Create Campaign"}
            </button>
          </div>

        </div>
      ) : null}

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
