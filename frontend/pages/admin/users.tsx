import { confirmAction } from "../../components/ConfirmModal";
import Head from "next/head";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import { AdminShell, AdminSection } from "../../components/admin/AdminShell";
import {
  createAdminProduct,
  deleteAdminProduct,
  fetchAdminDashboard,
  fetchAdminOrders,
  fetchAdminProducts,
  fetchAdminRevenue,
  fetchBrands,
  fetchCategories,
  updateAdminProduct,
  createAdminBrand,
  updateAdminBrand,
  deleteAdminBrand,
  createAdminCategory,
  updateAdminCategory,
  deleteAdminCategory,
  uploadImage,
  fetchAdminUsers,
  updateOrderStatus,
  updateUserRole,
  updateAdminUser,
  deleteAdminUser,
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  fetchUnreadNotificationCount,
  updateOrderTracking,
  updateStringingStatus,
  giveVoucher,
  addUserPoints,
} from "../../lib/api";
import { brands as mockBrands, categories as mockCategories, products as mockProducts, users as mockUsers } from "../../data/mockData";
import { Brand, Category, Product } from "../../types";

type Dashboard = {
  totalUsers: number;
  totalProducts: number;
  totalOrders: number;
  revenue: number;
  revenueThisMonth: number;
  ordersThisMonth: number;
  profitThisMonth: number;
  revenueTrend: string;
  ordersTrend: string;
  profitTrend: string;
  returnRate: number;
  salesData: { day: string; orders: number }[];
  revenueByMonth: { month: string; revenue: number }[];
  salesByCategory: { name: string; value: number; color: string }[];
  topProducts: Array<{ name: string; sold: number; price: number; image?: string; revenue: number }>;
  recentActivity: Array<{ id: string; text: string; type: string; time: string }>;
  customerSegments: { new: number; returning: number; active: number; inactive: number };
  consumableTracking: Array<{ day: string; shuttlecocks: number; grips: number }>;
  vipCustomers: Array<{ name: string; email: string; spent: number; orders: number; avatar: string }>;
  lowStockVariants: Array<{ product: string; variant: string; stock: number; color: string; size: string }>;
};

type AdminOrder = {
  _id: string;
  status: string;
  total: number;
  subtotal?: number;
  shippingFee?: number;
  createdAt: string;
  user?: { name?: string; email?: string; phone?: string };
  shippingAddress?: string;
  recipientName?: string;
  recipientPhone?: string;
  payment?: string;
  discountCode?: string;
  items?: any[];
  trackingNumber?: string;
  carrier?: string;
  needsStringing?: boolean;
  stringingStatus?: string;
  returnReason?: string;
};

type AdminUser = {
  _id: string;
  id?: string;
  name: string;
  email: string;
  role: string;
  phone?: string;
  totalSpending?: number;
  status?: string;
  points?: number;
  membershipTier?: string;
  internalNotes?: string;
  badmintonProfile?: {
    shoeSize?: string;
    stringTension?: string;
    playingStyle?: string;
    racketBrand?: string;
  };
  behavior?: any;
  createdAt: string;
};

type ProductForm = {
  id?: string;
  name: string;
  slug: string;
  description: string;
  image: string;
  category: string;
  brand: string;
  basePrice: string;
  stock: string;
  status: string;
  isTrending: boolean;
  isBestSeller: boolean;
  specs: { key: string; value: string }[];
  badges: string;
};

type BrandForm = {
  id?: string;
  name: string;
  slug: string;
  description: string;
  image: string;
};

type CategoryForm = {
  id?: string;
  name: string;
  slug: string;
  description: string;
  image: string;
};

const PROFILE_DISPLAY: Record<string, { label: string; emoji: string; bgClass: string; textClass: string; borderClass: string }> = {
  ghost_shopper:  { label: 'Ghost Shopper',  emoji: '👻', bgClass: 'bg-violet-50',  textClass: 'text-violet-700',  borderClass: 'border-violet-200' },
  gear_geek:      { label: 'Gear Geek',      emoji: '🔬', bgClass: 'bg-sky-50',     textClass: 'text-sky-700',     borderClass: 'border-sky-200' },
  brand_loyalist: { label: 'Brand Loyalist',  emoji: '💎', bgClass: 'bg-amber-50',   textClass: 'text-amber-700',   borderClass: 'border-amber-200' },
  beginner:       { label: 'Beginner',        emoji: '🌱', bgClass: 'bg-emerald-50', textClass: 'text-emerald-700', borderClass: 'border-emerald-200' },
  unclassified:   { label: 'New Visitor',     emoji: '👤', bgClass: 'bg-gray-50',    textClass: 'text-gray-600',    borderClass: 'border-gray-200' },
};

export default function AdminUsersPage() {
  const router = useRouter();

  const [authChecked, setAuthChecked] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [section, setSection] = useState<AdminSection>("users");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [usingMockData, setUsingMockData] = useState(false);

  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);

  // Notifications state
  const [notifications, setNotifications] = useState<any[]>([]);
  const [notifUnreadCount, setNotifUnreadCount] = useState(0);

  // Users Management state
  const [userQuery, setUserQuery] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("all");
  const [userStatusFilter, setUserStatusFilter] = useState("all");
  const [userTierFilter, setUserTierFilter] = useState("all");
  const [userPage, setUserPage] = useState(1);
  const userPageSize = 10;

  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [isUserDrawerOpen, setIsUserDrawerOpen] = useState(false);
  const [userDrawerTab, setUserDrawerTab] = useState<"general" | "history" | "settings" | "behavior">("general");
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [editProfileForm, setEditProfileForm] = useState({ shoeSize: "", stringTension: "", playingStyle: "", racketBrand: "" });
  const [manualPoints, setManualPoints] = useState<number | "">("");

  // Orders Management state
  const [orderQuery, setOrderQuery] = useState("");
  const [orderStatus, setOrderStatus] = useState("all");
  const [orderPage, setOrderPage] = useState(1);
  const orderPageSize = 10;
  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null);
  const [trackingNumberInput, setTrackingNumberInput] = useState("");
  const [carrierInput, setCarrierInput] = useState("");
  const [stringingStatusInput, setStringingStatusInput] = useState("");

  // Product management state
  const [productQuery, setProductQuery] = useState("");
  const [productCategory, setProductCategory] = useState("all");
  const [productBrand, setProductBrand] = useState("all");
  const [page, setPage] = useState(1);
  const pageSize = 8;

  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [productForm, setProductForm] = useState<ProductForm>({
    name: "",
    slug: "",
    description: "",
    image: "",
    category: "",
    brand: "",
    basePrice: "",
    stock: "0",
    status: "active",
    isTrending: false,
    isBestSeller: false,
    specs: [],
    badges: "",
  });
  const [productFormError, setProductFormError] = useState("");

  // Brand management state
  const [brandQuery, setBrandQuery] = useState("");
  const [brandPage, setBrandPage] = useState(1);
  const brandPageSize = 8;
  const [brandFormOpen, setBrandFormOpen] = useState(false);
  const [brandSaving, setBrandSaving] = useState(false);
  const [brandForm, setBrandForm] = useState<BrandForm>({
    name: "",
    slug: "",
    description: "",
    image: "",
  });

  // Category management state
  const [categoryQuery, setCategoryQuery] = useState("");
  const [categoryPage, setCategoryPage] = useState(1);
  const categoryPageSize = 8;
  const [categoryFormOpen, setCategoryFormOpen] = useState(false);
  const [categorySaving, setCategorySaving] = useState(false);
  const [categoryForm, setCategoryForm] = useState<CategoryForm>({
    name: "",
    slug: "",
    description: "",
    image: "",
  });

  useEffect(() => {
    const t = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
    setToken(t);
    let user: any = null;
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem("user") : null;
      user = raw ? JSON.parse(raw) : null;
    } catch {
      user = null;
    }

    if (!t || !user) {
      setAuthChecked(true);
      router.replace("/login?next=/admin");
      return;
    }
    if (!["admin", "warehouse_staff", "knitter"].includes(user.role)) {
      setAuthChecked(true);
      router.replace("/");
      return;
    }
    setAuthChecked(true);
  }, []);

  useEffect(() => {
    if (!authChecked || !token) return;
    const load = async () => {
      setLoading(true);
      setError("");
      setUsingMockData(false);
      try {
        let userRole = "";
        try {
          const raw = typeof window !== "undefined" ? localStorage.getItem("user") : null;
          const u = raw ? JSON.parse(raw) : null;
          userRole = u?.role || "";
        } catch { }
        const isAdmin = userRole === "admin";
        const isWarehouse = userRole === "warehouse_staff";

        const [dashCounts, revenueRes, ordersRes, productsRes, categoriesRes, brandsRes, usersRes] = await Promise.all([
          isAdmin ? fetchAdminDashboard(token).catch(() => null) : Promise.resolve({ users: 0, orders: 0, products: 0 }),
          isAdmin ? fetchAdminRevenue(token).catch(() => ({ revenue: 0 })) : Promise.resolve({ revenue: 0 }),
          fetchAdminOrders(token).catch(() => []),
          (isAdmin || isWarehouse) ? fetchAdminProducts(token).catch(() => []) : Promise.resolve([]),
          fetchCategories().catch(() => []),
          fetchBrands().catch(() => []),
          isAdmin ? fetchAdminUsers(token).catch(() => []) : Promise.resolve([]),
        ]);

        const normalizedBrands: Brand[] = (brandsRes || []).map((b: any) => ({
          id: b.id || b._id,
          _id: b._id,
          slug: b.slug || String(b.name || "").toLowerCase().replace(/\s+/g, "-"),
          name: b.name,
          description: b.description || "",
          image: b.image || "",
        }));

        const normalizedCategories: Category[] = (categoriesRes || []).map((c: any) => ({
          id: c.id || c._id,
          _id: c._id,
          slug: c.slug || String(c.name || "").toLowerCase().replace(/\s+/g, "-"),
          name: c.name,
          description: c.description || "",
          image: c.image || "",
        }));

        setOrders((ordersRes || []) as AdminOrder[]);
        setProducts(productsRes || []);
        setCategories(normalizedCategories);
        setBrands(normalizedBrands);
        setUsers((usersRes || []) as AdminUser[]);
        setDashboard(buildDashboard({ dash: dashCounts || { users: 0, orders: 0, products: 0 }, revenue: revenueRes?.revenue || 0, orders: ordersRes || [], products: productsRes || [] }));
      } catch (err: any) {
        setUsingMockData(true);
        setError(err?.response?.data?.error || "Live admin API unavailable. Loaded demo data instead.");
        hydrateDemo();
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [authChecked, token]);

  // Fetch notifications & poll every 30s
  useEffect(() => {
    if (!authChecked || !token) return;
    const fetchNotifs = () => {
      fetchNotifications(token)
        .then((data) => {
          const list = Array.isArray(data) ? data : [];
          setNotifications(list);
          setNotifUnreadCount(list.filter((n: any) => !n.isRead).length);
        })
        .catch(() => { });
    };
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 30000);
    return () => clearInterval(interval);
  }, [authChecked, token]);

  const handleMarkNotifRead = async (id: string) => {
    if (!token) return;
    try {
      await markNotificationRead(id, token);
      setNotifications(prev => prev.map(n => (n._id || n.id) === id ? { ...n, isRead: true } : n));
      setNotifUnreadCount(prev => Math.max(0, prev - 1));
    } catch { }
  };

  const handleMarkAllNotifsRead = async () => {
    if (!token) return;
    try {
      await markAllNotificationsRead(token);
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setNotifUnreadCount(0);
    } catch { }
  };

  const hydrateDemo = () => {
    const demoOrders: AdminOrder[] = [
      { _id: "ord_demo_001", status: "paid", total: 248, createdAt: "2026-03-20", user: { name: "Jordan" } },
      { _id: "ord_demo_002", status: "processing", total: 140, createdAt: "2026-03-22", user: { name: "Taylor" } },
      { _id: "ord_demo_003", status: "shipped", total: 190, createdAt: "2026-03-24", user: { name: "Riley" } },
      { _id: "ord_demo_004", status: "delivered", total: 58, createdAt: "2026-03-25", user: { name: "Alex" } },
      { _id: "ord_demo_005", status: "cancelled", total: 48, createdAt: "2026-03-26", user: { name: "Sam" } },
    ];
    setOrders(demoOrders);
    setProducts(mockProducts as any);
    setCategories(mockCategories);
    setBrands(mockBrands);
    setUsers(mockUsers.map((u: any) => ({ ...u, _id: u.id, createdAt: "2026-03-01T00:00:00.000Z" })));
    setDashboard(
      buildDashboard({
        dash: { users: mockUsers.length, orders: demoOrders.length, products: mockProducts.length },
        revenue: 684,
        orders: demoOrders as any,
        products: mockProducts as any,
      })
    );
  };

  // ─── Product helpers ─────────────────────────────────────────────
  const filteredProducts = useMemo(() => {
    const q = productQuery.trim().toLowerCase();
    return products.filter((p: any) => {
      const cat = String(p.category?.slug || p.category?.name || p.category || "").toLowerCase();
      const brand = String(p.brand?.name || p.brand || "").toLowerCase();
      const matchesQ = !q || p.name.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q);
      const matchesCat = productCategory === "all" || cat === productCategory;
      const matchesBrand = productBrand === "all" || brand === productBrand;
      return matchesQ && matchesCat && matchesBrand;
    });
  }, [products, productBrand, productCategory, productQuery]);

  const pagedProducts = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredProducts.slice(start, start + pageSize);
  }, [filteredProducts, page]);

  const filteredUsers = useMemo(() => {
    const q = userQuery.trim().toLowerCase();
    return users.filter((u) => {
      const matchQ = !q || u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || u.phone?.toLowerCase().includes(q);
      const matchRole = userRoleFilter === "all" || u.role === userRoleFilter;
      const matchStatus = userStatusFilter === "all" || (u.status || "active") === userStatusFilter;
      const matchTier = userTierFilter === "all" || (u.membershipTier || "Member") === userTierFilter;
      return matchQ && matchRole && matchStatus && matchTier;
    });
  }, [users, userQuery, userRoleFilter, userStatusFilter, userTierFilter]);

  const pagedUsers = useMemo(() => {
    const start = (userPage - 1) * userPageSize;
    return filteredUsers.slice(start, start + userPageSize);
  }, [filteredUsers, userPage]);

  const filteredOrders = useMemo(() => {
    const q = orderQuery.trim().toLowerCase();
    return orders.filter((o) => {
      const matchesQ = !q || o._id.toLowerCase().includes(q) || o.user?.name?.toLowerCase().includes(q) || o.user?.email?.toLowerCase().includes(q);
      let matchesS = false;
      if (orderStatus === "all") matchesS = true;
      else if (orderStatus === "strung") matchesS = Boolean(o.needsStringing);
      else matchesS = o.status === orderStatus;
      return matchesQ && matchesS;
    });
  }, [orders, orderQuery, orderStatus]);

  const pagedOrders = useMemo(() => {
    const start = (orderPage - 1) * orderPageSize;
    return filteredOrders.slice(start, start + orderPageSize);
  }, [filteredOrders, orderPage]);

  const handleUpdateOrderStatus = async (id: string, status: string) => {
    if (usingMockData || !token) {
      setOrders(orders.map(o => o._id === id ? { ...o, status } : o));
      return;
    }
    try {
      await updateOrderStatus(id, status, token);
      setOrders(orders.map(o => o._id === id ? { ...o, status } : o));
    } catch (e: any) {
      alert(e?.response?.data?.error || "Failed to update order status");
    }
  };

  const handleUpdateTracking = async (id: string, trackingNumber: string, carrier: string) => {
    if (!token) return;
    try {
      await updateOrderTracking(id, trackingNumber, carrier, token);
      setOrders(orders.map(o => o._id === id ? { ...o, trackingNumber, carrier } : o));
      if (selectedOrder?._id === id) {
        setSelectedOrder({ ...selectedOrder, trackingNumber, carrier });
      }
      alert("Tracking info updated successfully.");
    } catch (e: any) {
      alert(e?.response?.data?.error || "Failed to update tracking");
    }
  };

  const handleUpdateStringingStatus = async (id: string, stringingStatus: string) => {
    if (!token) return;
    try {
      await updateStringingStatus(id, stringingStatus, token);
      setOrders(orders.map(o => o._id === id ? { ...o, stringingStatus } : o));
      if (selectedOrder?._id === id) {
        setSelectedOrder({ ...selectedOrder, stringingStatus });
      }
    } catch (e: any) {
      alert(e?.response?.data?.error || "Failed to update stringing status");
    }
  };

  const handleUpdateUserRole = async (id: string, role: string) => {
    if (usingMockData || !token) {
      setUsers(users.map(u => (u._id === id || u.id === id) ? { ...u, role } : u));
      return;
    }
    try {
      await updateUserRole(id, role, token);
      setUsers(users.map(u => (u._id === id || u.id === id) ? { ...u, role } : u));
    } catch (e: any) {
      alert(e?.response?.data?.error || "Failed to update user role");
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!(await confirmAction("Are you sure you want to delete this?"))) return;
    if (!confirm("Are you sure you want to delete this user?")) return;
    if (usingMockData || !token) {
      setUsers(users.filter((u) => (u._id !== id && u.id !== id)));
      return;
    }
    try {
      await deleteAdminUser(id, token);
      setUsers(users.filter((u) => u._id !== id));
    } catch (e: any) {
      alert(e?.response?.data?.error || "Failed to delete user");
    }
  };

  const specTemplatesByCategory: Record<string, string[]> = {
    racket: [
      "Weight (U)",
      "Grip Circumference (G)",
      "Stick Stiffness (Flex)",
      "Balance Point",
      "Maximum Tension",
    ],
    footwear: ["Size (EU)", "Gender", "Key Features", "Color"],
    shuttlecock: ["Type", "Speed", "Packaging"],
    bag: ["Bag Type", "Capacity", "Features"],
    accessories: ["Color", "Accerssory Type", "Thinkness", "Feel"]
  };

  const activeProductCategorySlug = useMemo(() => {
    const category = categories.find((c) => (c._id || c.id) === productForm.category);
    return String(category?.slug || category?.name || "").toLowerCase();
  }, [categories, productForm.category]);

  const availableSpecKeys = useMemo(() => {
    if (activeProductCategorySlug.includes("racket")) return specTemplatesByCategory.racket;
    if (activeProductCategorySlug.includes("accessories")) return specTemplatesByCategory.accessories;
    if (activeProductCategorySlug.includes("bag")) return specTemplatesByCategory.bag;
    if (activeProductCategorySlug.includes("shuttlecock")) return specTemplatesByCategory.shuttlecock;
    if (activeProductCategorySlug.includes("shoe") || activeProductCategorySlug.includes("footwear")) return specTemplatesByCategory.footwear;
    return [];
  }, [activeProductCategorySlug]);

  const lowStockProducts = useMemo(() => {
    return [];
  }, [products]);

  const logout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");
      window.dispatchEvent(new Event("auth:user-updated"));
    }
    router.push("/login");
  };

  const openCreate = () => {
    setProductForm({
      name: "",
      slug: "",
      description: "",
      image: "",
      category: "",
      brand: "",
      basePrice: "",
      stock: "0",
      status: "active",
      isTrending: false,
      isBestSeller: false,
      specs: [],
      badges: "",
    });
    setProductFormError("");
    setFormOpen(true);
  };

  const openEdit = (p: any) => {
    const id = p._id || p.id;
    setProductForm({
      id,
      name: p.name || "",
      slug: p.slug || "",
      description: p.description || "",
      image: p.image || "",
      category: String(p.category?._id || p.category || ""),
      brand: String(p.brand?._id || p.brand || ""),
      basePrice: String(p.basePrice ?? p.price ?? ""),
      stock: String(p.stock ?? 0),
      status: p.status || "active",
      isTrending: Boolean(p.isTrending),
      isBestSeller: Boolean(p.isBestSeller),
      specs: Object.entries(p.specs || {}).map(([key, value]) => ({ key, value: String(value) })),
      badges: (p.badges || []).join(", "),
    });
    setProductFormError("");
    setFormOpen(true);
  };

  const saveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setProductFormError("");
    setSaving(true);
    try {
      const payload: any = {
        name: productForm.name.trim(),
        slug: productForm.slug.trim() || autoSlug(productForm.name.trim()),
        description: productForm.description.trim(),
        image: productForm.image.trim() || undefined,
        basePrice: Number(productForm.basePrice || 0),
        stock: Number(productForm.stock || 0),
        status: productForm.status || "active",
        category: productForm.category,
        brand: productForm.brand,
        isTrending: productForm.isTrending,
        isBestSeller: productForm.isBestSeller,
      };

      const specRecord: Record<string, string> = {};
      productForm.specs.forEach(s => {
        if (s.key.trim()) specRecord[s.key.trim()] = s.value.trim();
      });
      payload.specs = specRecord;
      payload.badges = productForm.badges.split(',').map(s => s.trim()).filter(Boolean);

      if (usingMockData || !token) {
        const id = productForm.id || `mock_${Date.now()}`;
        const catObj = categories.find((c) => (c._id || c.id) === payload.category);
        const brandObj = brands.find((b) => (b._id || b.id) === payload.brand);
        const next = {
          ...(payload as any),
          _id: id,
          id,
          price: payload.basePrice,
          category: catObj || payload.category,
          brand: brandObj || payload.brand,
        };
        setProducts((prev: any) => {
          const exists = prev.some((x: any) => ((x as any)._id || x.id) === id);
          return exists
            ? prev.map((x: any) => (((x as any)._id || x.id) === id ? { ...x, ...next } : x))
            : [next, ...prev];
        });
      } else if (productForm.id) {
        const updated = await updateAdminProduct(productForm.id, payload, token);
        setProducts((prev: any) => prev.map((x: any) => (((x as any)._id || x.id) === productForm.id ? updated : x)));
      } else {
        const created = await createAdminProduct(payload, token);
        setProducts((prev: any) => [created, ...prev]);
      }

      setFormOpen(false);
    } catch (err: any) {
      setProductFormError(err?.response?.data?.error || err?.message || "Save product failed");
    } finally {
      setSaving(false);
    }
  };

  const removeProduct = async (id: string) => {
    if (!(await confirmAction("Are you sure you want to delete this?"))) return;
    if (!confirm("Delete this product?")) return;
    const prev = products;
    setProducts((p: any) => p.filter((x: any) => ((x as any)._id || x.id) !== id));
    if (usingMockData || !token) return;
    try {
      await deleteAdminProduct(id, token);
    } catch {
      setProducts(prev);
      setError("Failed to delete product. Changes were reverted.");
    }
  };

  // ─── Brand helpers ───────────────────────────────────────────────
  const filteredBrands = useMemo(() => {
    const q = brandQuery.trim().toLowerCase();
    return brands.filter((b) => {
      return !q || b.name.toLowerCase().includes(q) || b.slug.toLowerCase().includes(q);
    });
  }, [brands, brandQuery]);

  const pagedBrands = useMemo(() => {
    const start = (brandPage - 1) * brandPageSize;
    return filteredBrands.slice(start, start + brandPageSize);
  }, [filteredBrands, brandPage]);

  const openCreateBrand = () => {
    setBrandForm({ name: "", slug: "", description: "", image: "" });
    setBrandFormOpen(true);
  };

  const openEditBrand = (b: any) => {
    const id = b._id || b.id;
    setBrandForm({
      id,
      name: b.name || "",
      slug: b.slug || "",
      description: b.description || "",
      image: b.image || "",
    });
    setBrandFormOpen(true);
  };

  const saveBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBrandSaving(true);
    try {
      const payload = {
        name: brandForm.name.trim(),
        slug: brandForm.slug.trim() || brandForm.name.trim().toLowerCase().replace(/\s+/g, "-"),
        description: brandForm.description.trim() || undefined,
        image: brandForm.image.trim() || undefined,
      };

      if (usingMockData || !token) {
        const id = brandForm.id || `mock_brand_${Date.now()}`;
        const next: Brand = { ...payload, id, description: payload.description || "", image: payload.image || "" };
        setBrands((prev) => {
          const exists = prev.some((x) => (x._id || x.id) === id);
          return exists
            ? prev.map((x) => ((x._id || x.id) === id ? { ...x, ...next } : x))
            : [next, ...prev];
        });
      } else if (brandForm.id) {
        const updated = await updateAdminBrand(brandForm.id, payload, token);
        setBrands((prev) =>
          prev.map((x) =>
            (x._id || x.id) === brandForm.id
              ? { ...x, ...updated, id: updated._id || updated.id || brandForm.id }
              : x
          )
        );
      } else {
        const created = await createAdminBrand(payload, token);
        setBrands((prev) => [{ ...created, id: created._id || created.id }, ...prev]);
      }

      setBrandFormOpen(false);
    } catch (err: any) {
      setError(err?.response?.data?.error || "Save brand failed");
    } finally {
      setBrandSaving(false);
    }
  };

  const removeBrand = async (id: string) => {
    if (!(await confirmAction("Are you sure you want to delete this?"))) return;
    if (!confirm("Delete this brand?")) return;
    const prev = brands;
    setBrands((b) => b.filter((x) => (x._id || x.id) !== id));
    if (usingMockData || !token) return;
    try {
      await deleteAdminBrand(id, token);
    } catch {
      setBrands(prev);
      setError("Failed to delete brand. Changes were reverted.");
    }
  };

  // ─── Category helpers ────────────────────────────────────────────
  const filteredCategories = useMemo(() => {
    const q = categoryQuery.trim().toLowerCase();
    return categories.filter((c) => {
      return !q || c.name.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q);
    });
  }, [categories, categoryQuery]);

  const pagedCategories = useMemo(() => {
    const start = (categoryPage - 1) * categoryPageSize;
    return filteredCategories.slice(start, start + categoryPageSize);
  }, [filteredCategories, categoryPage]);

  const openCreateCategory = () => {
    setCategoryForm({ name: "", slug: "", description: "", image: "" });
    setCategoryFormOpen(true);
  };

  const openEditCategory = (c: any) => {
    const id = c._id || c.id;
    setCategoryForm({
      id,
      name: c.name || "",
      slug: c.slug || "",
      description: c.description || "",
      image: c.image || "",
    });
    setCategoryFormOpen(true);
  };

  const saveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setCategorySaving(true);
    try {
      const payload = {
        name: categoryForm.name.trim(),
        slug: categoryForm.slug.trim() || categoryForm.name.trim().toLowerCase().replace(/\s+/g, "-"),
        description: categoryForm.description.trim() || undefined,
        image: categoryForm.image.trim() || undefined,
      };

      if (usingMockData || !token) {
        const id = categoryForm.id || `mock_cat_${Date.now()}`;
        const next: Category = { ...payload, id, description: payload.description || "", image: payload.image || "" };
        setCategories((prev) => {
          const exists = prev.some((x) => (x._id || x.id) === id);
          return exists
            ? prev.map((x) => ((x._id || x.id) === id ? { ...x, ...next } : x))
            : [next, ...prev];
        });
      } else if (categoryForm.id) {
        const updated = await updateAdminCategory(categoryForm.id, payload, token);
        setCategories((prev) =>
          prev.map((x) =>
            (x._id || x.id) === categoryForm.id
              ? { ...x, ...updated, id: updated._id || updated.id || categoryForm.id }
              : x
          )
        );
      } else {
        const created = await createAdminCategory(payload, token);
        setCategories((prev) => [{ ...created, id: created._id || created.id }, ...prev]);
      }

      setCategoryFormOpen(false);
    } catch (err: any) {
      setError(err?.response?.data?.error || "Save category failed");
    } finally {
      setCategorySaving(false);
    }
  };

  const removeCategory = async (id: string) => {
    if (!(await confirmAction("Are you sure you want to delete this?"))) return;
    if (!confirm("Delete this category?")) return;
    const prev = categories;
    setCategories((c) => c.filter((x) => (x._id || x.id) !== id));
    if (usingMockData || !token) return;
    try {
      await deleteAdminCategory(id, token);
    } catch {
      setCategories(prev);
      setError("Failed to delete category. Changes were reverted.");
    }
  };

  // ─── Auto-generate slug helper ──────────────────────────────────
  const autoSlug = (name: string) =>
    name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();

  const handleAutoAnalyzeProfile = async () => {
    if (!selectedUser || !token) return;

    const userOrders = orders.filter(
      (o) => o.user?.email === selectedUser.email && o.status === "received"
    );

    if (userOrders.length === 0) {
      alert("This user has no 'received' orders to analyze.");
      return;
    }

    let allItems: any[] = [];
    userOrders.forEach((o) => {
      if (o.items && Array.isArray(o.items)) {
        allItems = allItems.concat(o.items);
      }
    });

    const shoeSizes: Record<string, number> = {};
    const stringTensions: Record<string, number> = {};
    const playingStyles: Record<string, number> = {};
    const racketBrands: Record<string, number> = {};

    allItems.forEach((item) => {
      if (item.selectedSize) {
        shoeSizes[item.selectedSize] = (shoeSizes[item.selectedSize] || 0) + 1;
      }
      if (item.stringTension) {
        const t = String(item.stringTension);
        stringTensions[t] = (stringTensions[t] || 0) + 1;
      }

      let prod = item.product;
      if (typeof prod === "string") {
        prod = products.find((p) => p._id === prod || p.id === prod);
      } else if (prod && (prod._id || prod.id)) {
        const found = products.find((p) => p._id === prod._id || p.id === prod._id);
        if (found) prod = found;
      }

      if (prod) {
        let bName = "";
        if (prod.brand?.name) bName = prod.brand.name;
        else if (typeof prod.brand === "string") {
          const b = brands.find((br) => br._id === prod.brand || br.id === prod.brand);
          if (b) bName = b.name;
        }

        if (bName) {
          racketBrands[bName] = (racketBrands[bName] || 0) + 1;
        }

        if (prod.specs) {
          let pStyle = "";
          if (prod.specs["Weight (U)"] === "3U" && prod.specs["Balance Point"] === "Head Heavy" && prod.specs["Stick Stiffness (Flex)"] === "Stiff") {
            pStyle = "Attack";
          } else if (prod.specs["Weight (U)"] === "4U" && prod.specs["Balance Point"] === "Even Balance" && prod.specs["Stick Stiffness (Flex)"] === "Medium") {
            pStyle = "All-Around";
          } else if (prod.specs["Stick Stiffness (Flex)"] === "Flexible") {
            pStyle = "Defensive";
          }
          if (pStyle) {
            playingStyles[pStyle] = (playingStyles[pStyle] || 0) + 1;
          }
        }
      }
    });

    const getMax = (obj: Record<string, number>) =>
      Object.keys(obj).reduce((a, b) => (obj[a] > obj[b] ? a : b), "");

    const newProfile = {
      shoeSize: getMax(shoeSizes) || selectedUser.badmintonProfile?.shoeSize || "",
      stringTension: getMax(stringTensions) || selectedUser.badmintonProfile?.stringTension || "",
      playingStyle: getMax(playingStyles) || selectedUser.badmintonProfile?.playingStyle || "",
      racketBrand: getMax(racketBrands) || selectedUser.badmintonProfile?.racketBrand || "",
    };

    try {
      if (usingMockData) {
        setUsers(users.map((u) => (u._id === selectedUser._id || u.id === selectedUser.id) ? { ...u, badmintonProfile: newProfile } : u));
        setSelectedUser({ ...selectedUser, badmintonProfile: newProfile });
      } else {
        await updateAdminUser(selectedUser._id || selectedUser.id!, { badmintonProfile: newProfile }, token);
        setUsers(users.map((u) => (u._id === selectedUser._id || u.id === selectedUser.id) ? { ...u, badmintonProfile: newProfile } : u));
        setSelectedUser({ ...selectedUser, badmintonProfile: newProfile });
      }
      alert("Badminton profile automatically updated based on purchase history!");
    } catch (err: any) {
      alert("Failed to update profile: " + (err?.response?.data?.error || err.message));
    }
  };

  const calculateLtv = (email?: string) => {
    if (!email) return 0;
    return orders
      .filter((o) => o.user?.email === email && ['received', 'completed'].includes((o.status || '').toLowerCase()))
      .reduce((acc, curr) => acc + (curr.total || 0), 0);
  };

  return (
    <AdminShell
      title={
        section === "dashboard"
          ? "Dashboard"
          : section === "products"
            ? "Products"
            : section === "brands"
              ? "Brands"
              : section === "categories"
                ? "Categories"
                : section === "notifications"
                  ? "Notifications"
                  : section.charAt(0).toUpperCase() + section.slice(1)
      }
      section={section}
      onSectionChange={(s) => {
        setSection(s);
        setPage(1);
        setBrandPage(1);
        setCategoryPage(1);
      }}
      onLogout={logout}
      notificationCount={notifUnreadCount}
    >
      <Head>
        <title>Admin | Badminton Hub</title>
      </Head>

      {!authChecked && <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm">Checking access...</div>}
      {usingMockData && <div className="pill w-fit bg-yellow-100 text-yellow-700">Demo Mode</div>}
      {error && <div className="rounded-2xl border border-primary/30 bg-primary/10 p-4 text-primary">{error}</div>}
      {loading && <div className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm">Loading...</div>}











      {/* ═══════════════════════ USERS SECTION ═══════════════════════ */}
      {section === "users" && (
        <div className="space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="font-heading text-2xl font-bold text-secondary">CRM & Users</h2>
            <button className="btn-primary" onClick={() => {/* Handle add user */ }}>
              + Add New User
            </button>
          </div>

          {/* Action Bar */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center bg-white p-4 rounded-2xl shadow-sm border border-black/5">
            <div className="flex-1 relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary/40" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input
                className="w-full rounded-xl bg-gray-50 py-2 pl-10 pr-4 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 border border-transparent focus:border-primary transition-all"
                placeholder="Search by name, phone, or email..."
                value={userQuery}
                onChange={(e) => { setUserQuery(e.target.value); setUserPage(1); }}
              />
            </div>
            <div className="flex gap-2 relative z-20">
              <select className="rounded-xl border border-black/5 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" value={userRoleFilter} onChange={e => { setUserRoleFilter(e.target.value); setUserPage(1); }}>
                <option value="all">All Roles</option>
                <option value="user">Customer</option>
                <option value="warehouse_staff">Warehouse Staff</option>
                <option value="knitter">Knitter</option>
                <option value="admin">Admin</option>
              </select>
              <select className="rounded-xl border border-black/5 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" value={userTierFilter} onChange={e => { setUserTierFilter(e.target.value); setUserPage(1); }}>
                <option value="all">All Tiers</option>
                <option value="Member">Member</option>
                <option value="VIP">VIP</option>
                <option value="VVIP">VVIP</option>
              </select>
              <select className="rounded-xl border border-black/5 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" value={userStatusFilter} onChange={e => { setUserStatusFilter(e.target.value); setUserPage(1); }}>
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="locked">Locked</option>
              </select>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm relative z-0">
            <div className="overflow-x-auto relative">
              <table className="w-full text-left text-sm text-secondary/80">
                <thead className="bg-gray-50/80 text-xs font-semibold text-secondary/60 uppercase tracking-wider relative z-10">
                  <tr>
                    <th className="px-6 py-4">User</th>
                    <th className="px-6 py-4">Contact</th>
                    <th className="px-6 py-4">Role & Tier</th>
                    <th className="px-6 py-4">LTV (Spent)</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5 relative z-0">
                  {pagedUsers.map((u) => {
                    const id = u._id || u.id;
                    const tierColors: Record<string, string> = { "Member": "bg-gray-100 text-gray-700", "VIP": "bg-blue-100 text-blue-700", "VVIP": "bg-purple-100 text-purple-700" };
                    return (
                      <tr key={id} className="transition hover:bg-gray-50/50 group cursor-pointer" onClick={() => { setSelectedUser(u); setUserDrawerTab("general"); setIsUserDrawerOpen(true); setEditingUser(null); setEditingProfile(false); }}>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary/80 to-primary text-sm font-bold text-white shadow-sm">
                              {u.name?.charAt(0).toUpperCase() || "U"}
                            </div>
                            <div>
                              <p className="font-semibold text-secondary group-hover:text-primary transition-colors">{u.name}</p>
                              <p className="text-xs text-secondary/50">{new Date(u.createdAt || "").toLocaleDateString()}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-medium">{u.phone || "N/A"}</p>
                          <p className="text-xs text-secondary/50">{u.email}</p>
                        </td>
                        <td className="px-6 py-4 line-clamp-2">
                          <div className="flex flex-col gap-1 items-start">
                            <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${u.role === "admin" ? "bg-red-100 text-red-700" : u.role === "warehouse_staff" ? "bg-orange-100 text-orange-700" : u.role === "knitter" ? "bg-yellow-100 text-yellow-700" : "bg-gray-100 text-gray-700"}`}>{u.role || "user"}</span>
                            <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wider ${tierColors[u.membershipTier || "Member"]}`}>{u.membershipTier || "Member"}</span>
                            {u.behavior?.behavioralProfile && u.behavior.behavioralProfile !== 'unclassified' && (() => {
                              const pd = PROFILE_DISPLAY[u.behavior.behavioralProfile] || PROFILE_DISPLAY.unclassified;
                              return (
                                <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wider ${pd.bgClass} ${pd.textClass} border ${pd.borderClass} mt-0.5`}>
                                  {pd.emoji} {pd.label}
                                </span>
                              );
                            })()}
                          </div>
                        </td>
                        <td className="px-6 py-4 font-semibold">${calculateLtv(u.email).toLocaleString("en-US")}</td>
                        <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                          <button
                            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-primary/20 ${u.status === "locked" ? "bg-gray-300" : "bg-emerald-500"} transition-colors`}
                            onClick={async () => {
                              const newStatus = u.status === "locked" ? "active" : "locked";
                              try {
                                await updateAdminUser(id!, { status: newStatus }, token!);
                                setUsers(users.map(x => (x._id || x.id) === id ? { ...x, status: newStatus } : x));
                              } catch (e: any) { alert("Failed to change status: " + e.message); }
                            }}
                          >
                            <span className="sr-only">Toggle Status</span>
                            <span
                              aria-hidden="true"
                              className={`pointer-events-none absolute left-[2px] inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition-transform duration-200 ease-in-out ${u.status === "locked" ? "translate-x-0" : "translate-x-4"}`}
                            />
                          </button>
                        </td>
                        <td className="px-6 py-4 text-right relative" onClick={(e) => e.stopPropagation()}>
                          <div className="relative group/menu inline-block text-left relative z-20">
                            <button className="flex items-center text-secondary/40 hover:text-secondary p-1 rounded-full hover:bg-gray-100 transition-colors">
                              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" /></svg>
                            </button>
                            <div className="absolute right-0 bottom-full mb-1 w-48 origin-bottom-right rounded-xl bg-white shadow-xl ring-1 ring-black/5 focus:outline-none opacity-0 invisible group-hover/menu:opacity-100 group-hover/menu:visible transition-all z-50">
                              <div className="py-1">
                                <button className="block w-full px-4 py-2 text-left text-sm text-secondary hover:bg-primary/10" onClick={() => { setSelectedUser(u); setUserDrawerTab("general"); setIsUserDrawerOpen(true); setEditingUser(null); setEditingProfile(false); }}>View Details</button>
                                <button className="block w-full px-4 py-2 text-left text-sm text-secondary hover:bg-primary/10">Reset Password</button>

                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {pagedUsers.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-secondary/40 mb-3">
                          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                        </div>
                        <p className="text-secondary/60">No users found.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {filteredUsers.length > userPageSize && (
              <div className="border-t border-black/5 px-6 py-4">
                <Pagination current={userPage} total={filteredUsers.length} pageSize={userPageSize} onChange={setUserPage} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* User Details Drawer */}
      <div className={`fixed inset-y-0 right-0 z-[100] w-full sm:w-[500px] md:w-[40vw] max-w-2xl transform bg-white shadow-2xl transition-transform duration-300 ease-in-out ${isUserDrawerOpen ? "translate-x-0" : "translate-x-full"}`}>
        {selectedUser && (
          <div className="flex h-full flex-col">
            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b border-black/5 px-6 py-4 bg-gray-50/50">
              <h3 className="font-heading text-lg font-bold text-secondary">User Profile</h3>
              <button
                onClick={() => setIsUserDrawerOpen(false)}
                className="rounded-full p-2 text-secondary/50 hover:bg-black/5 transition-colors focus:outline-none"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Quick Profile Summary */}
            <div className="px-6 py-6 border-b border-black/5 flex flex-col sm:flex-row items-start sm:items-center gap-5">
              <div className="grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br from-primary to-primary/80 text-2xl font-bold text-white shadow-md">
                {selectedUser.name?.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-secondary">{selectedUser.name}</h2>
                <p className="text-sm text-secondary/60">{selectedUser.email}</p>
                <div className="mt-3 flex gap-2">
                  <span className="inline-block rounded bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">{selectedUser.points || 0} pts</span>
                  <span className="inline-block rounded bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700 uppercase">{selectedUser.membershipTier || "Member"}</span>
                </div>
              </div>
              <div className="flex flex-row sm:flex-col gap-2 w-full sm:w-auto mt-4 sm:mt-0">
                <button
                  className="btn-primary py-2 px-4 shadow-sm text-xs w-full whitespace-nowrap"
                  onClick={async () => {
                    if (!token) return;
                    try {
                      const res = await giveVoucher(selectedUser._id || selectedUser.id!, token);
                      alert("Voucher granted and notification sent to user!");
                    } catch (err: any) { alert(err?.response?.data?.error || "Failed to give voucher"); }
                  }}
                >
                  🎁 Give Voucher
                </button>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="+Pts"
                    className="w-16 rounded border border-black/5 px-2 py-1 text-xs outline-none"
                    value={manualPoints}
                    onChange={(e) => setManualPoints(Number(e.target.value) || "")}
                  />
                  <button
                    className="btn-outline py-2 px-4 bg-white text-xs w-full whitespace-nowrap flex-1"
                    onClick={async () => {
                      if (!token || !manualPoints) return;
                      try {
                        const updatedUser = await addUserPoints(selectedUser._id || selectedUser.id!, Number(manualPoints), token);
                        setUsers(users.map(u => (u._id || u.id) === (selectedUser._id || selectedUser.id) ? { ...u, points: updatedUser.points, membershipTier: updatedUser.membershipTier } : u));
                        setSelectedUser({ ...selectedUser, points: updatedUser.points, membershipTier: updatedUser.membershipTier });
                        setManualPoints("");
                        alert(`Successfully added ${manualPoints} points! New Tier: ${updatedUser.membershipTier}`);
                      } catch (err: any) { alert(err?.response?.data?.error || "Failed to add points"); }
                    }}
                  >
                    ⭐ Add Points
                  </button>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-black/5 px-4 font-semibold text-sm bg-gray-50/30 overflow-x-auto">
              <button className={`px-4 py-3 border-b-2 transition-colors whitespace-nowrap ${userDrawerTab === "general" ? "border-primary text-primary" : "border-transparent text-secondary/50 hover:text-secondary"}`} onClick={() => setUserDrawerTab("general")}>Profile & CRM</button>
              <button className={`px-4 py-3 border-b-2 transition-colors whitespace-nowrap ${userDrawerTab === "behavior" ? "border-primary text-primary" : "border-transparent text-secondary/50 hover:text-secondary"}`} onClick={() => setUserDrawerTab("behavior")}>Behavior</button>
              <button className={`px-4 py-3 border-b-2 transition-colors whitespace-nowrap ${userDrawerTab === "history" ? "border-primary text-primary" : "border-transparent text-secondary/50 hover:text-secondary"}`} onClick={() => setUserDrawerTab("history")}>History</button>
              <button className={`px-4 py-3 border-b-2 transition-colors whitespace-nowrap ${userDrawerTab === "settings" ? "border-primary text-primary" : "border-transparent text-secondary/50 hover:text-secondary"}`} onClick={() => setUserDrawerTab("settings")}>Permissions</button>
            </div>

            {/* Tab Contents */}
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
              {userDrawerTab === "general" && (
                <div className="space-y-6">
                  {editingUser ? (
                    <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 shadow-sm space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-secondary">Edit Contact Info</h4>
                        <button className="text-xs text-secondary/50 font-bold hover:text-secondary" onClick={() => setEditingUser(null)}>Cancel</button>
                      </div>
                      <div className="space-y-3 text-sm">
                        <div>
                          <label className="block text-xs text-secondary/60 font-semibold mb-1">Full Name</label>
                          <input className="w-full rounded border border-black/10 px-3 py-2 focus:outline-none focus:border-primary" value={editingUser.name || ""} onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })} />
                        </div>
                        <div>
                          <label className="block text-xs text-secondary/60 font-semibold mb-1">Phone Number</label>
                          <input className="w-full rounded border border-black/10 px-3 py-2 focus:outline-none focus:border-primary" value={editingUser.phone || ""} onChange={(e) => setEditingUser({ ...editingUser, phone: e.target.value })} />
                        </div>
                      </div>
                      <button className="btn-primary w-full py-2 text-sm mt-2" onClick={async () => {
                        if (!token) return;
                        try {
                          if (usingMockData) {
                            setUsers(users.map(u => (u._id || u.id) === (editingUser._id || editingUser.id) ? { ...u, name: editingUser.name, phone: editingUser.phone } : u));
                            setSelectedUser({ ...selectedUser, name: editingUser.name, phone: editingUser.phone });
                          } else {
                            await updateAdminUser(editingUser._id || editingUser.id!, { name: editingUser.name, phone: editingUser.phone }, token);
                            setUsers(users.map(u => (u._id || u.id) === (editingUser._id || editingUser.id) ? { ...u, name: editingUser.name, phone: editingUser.phone } : u));
                            setSelectedUser({ ...selectedUser, name: editingUser.name, phone: editingUser.phone });
                          }
                          setEditingUser(null);
                        } catch (err: any) { alert("Failed to save: " + err.message); }
                      }}>Save Changes</button>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-semibold text-secondary flex items-center gap-2">
                          <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                          Contact Info
                        </h4>
                        <button className="text-xs text-primary font-bold hover:underline" onClick={() => setEditingUser({ ...selectedUser })}>Edit</button>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-secondary/50 mb-1">Phone Number</p>
                          <p className="font-medium text-secondary">{selectedUser.phone || "Not provided"}</p>
                        </div>
                        <div>
                          <p className="text-secondary/50 mb-1">Joined Date</p>
                          <p className="font-medium text-secondary">{new Date(selectedUser.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {editingProfile ? (
                    <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 shadow-sm relative overflow-hidden space-y-4">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/5 to-primary/10 rounded-bl-[100px] pointer-events-none"></div>
                      <div className="flex items-center justify-between mb-2 relative z-10">
                        <h4 className="font-semibold text-secondary flex items-center gap-2">
                          <svg className="w-5 h-5 fill-primary" viewBox="0 0 24 24"><path d="M12 2L9 9H2L7 14L5 22L12 17L19 22L17 14L22 9H15L12 2Z" /></svg>
                          Edit Badminton Profile
                        </h4>
                        <button className="text-xs text-secondary/50 font-bold hover:text-secondary" onClick={() => setEditingProfile(false)}>Cancel</button>
                      </div>
                      <div className="space-y-3 relative z-10 text-sm">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs text-secondary/60 font-semibold mb-1">Shoe Size (EU)</label>
                            <input className="w-full rounded border border-black/10 px-3 py-2 focus:outline-none focus:border-primary" placeholder="e.g. 42" value={editProfileForm.shoeSize} onChange={(e) => setEditProfileForm({ ...editProfileForm, shoeSize: e.target.value })} />
                          </div>
                          <div>
                            <label className="block text-xs text-secondary/60 font-semibold mb-1">String Tension (lbs)</label>
                            <input className="w-full rounded border border-black/10 px-3 py-2 focus:outline-none focus:border-primary" placeholder="e.g. 26" value={editProfileForm.stringTension} onChange={(e) => setEditProfileForm({ ...editProfileForm, stringTension: e.target.value })} />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs text-secondary/60 font-semibold mb-1">Playing Style</label>
                            <input className="w-full rounded border border-black/10 px-3 py-2 focus:outline-none focus:border-primary" placeholder="e.g. Attack, Control" value={editProfileForm.playingStyle} onChange={(e) => setEditProfileForm({ ...editProfileForm, playingStyle: e.target.value })} />
                          </div>
                          <div>
                            <label className="block text-xs text-secondary/60 font-semibold mb-1">Favorite Brand</label>
                            <input className="w-full rounded border border-black/10 px-3 py-2 focus:outline-none focus:border-primary" placeholder="e.g. Yonex" value={editProfileForm.racketBrand} onChange={(e) => setEditProfileForm({ ...editProfileForm, racketBrand: e.target.value })} />
                          </div>
                        </div>
                      </div>
                      <button className="btn-primary w-full py-2 text-sm mt-2 relative z-10" onClick={async () => {
                        if (!token) return;
                        try {
                          const bp = { ...editProfileForm };
                          if (usingMockData) {
                            setUsers(users.map(u => (u._id || u.id) === (selectedUser._id || selectedUser.id) ? { ...u, badmintonProfile: bp } : u));
                            setSelectedUser({ ...selectedUser, badmintonProfile: bp });
                          } else {
                            await updateAdminUser(selectedUser._id || selectedUser.id!, { badmintonProfile: bp }, token);
                            setUsers(users.map(u => (u._id || u.id) === (selectedUser._id || selectedUser.id) ? { ...u, badmintonProfile: bp } : u));
                            setSelectedUser({ ...selectedUser, badmintonProfile: bp });
                          }
                          setEditingProfile(false);
                        } catch (err: any) { alert("Failed to save: " + err.message); }
                      }}>Save Profile</button>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/5 to-primary/10 rounded-bl-[100px] pointer-events-none"></div>
                      <div className="flex items-center justify-between mb-5 relative z-10">
                        <h4 className="font-semibold text-secondary flex items-center gap-2">
                          <svg className="w-5 h-5 fill-primary" viewBox="0 0 24 24"><path d="M12 2L9 9H2L7 14L5 22L12 17L19 22L17 14L22 9H15L12 2Z" /></svg>
                          Badminton Profile
                        </h4>
                        <div className="flex gap-4">
                          <button className="text-xs text-primary font-bold hover:underline" onClick={handleAutoAnalyzeProfile} title="Analyze received orders to predict profile">
                            <span className="flex items-center gap-1">
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                              Auto-Analyze
                            </span>
                          </button>
                          <button className="text-xs text-primary font-bold hover:underline" onClick={() => {
                            setEditProfileForm({
                              shoeSize: selectedUser.badmintonProfile?.shoeSize || "",
                              stringTension: selectedUser.badmintonProfile?.stringTension || "",
                              playingStyle: selectedUser.badmintonProfile?.playingStyle || "",
                              racketBrand: selectedUser.badmintonProfile?.racketBrand || "",
                            });
                            setEditingProfile(true);
                          }}>Edit Mode</button>
                        </div>
                      </div>
                      <div className="grid gap-3 relative z-10">
                        <div className="flex justify-between items-center bg-gray-50/80 rounded-xl p-3 border border-black/5">
                          <span className="text-xs text-secondary/60 uppercase font-semibold">Standard Shoe Size</span>
                          <span className="font-bold text-secondary bg-white px-2 py-1 rounded shadow-sm min-w-[40px] text-center border border-black/5">{selectedUser.badmintonProfile?.shoeSize || "--"}</span>
                        </div>
                        <div className="flex justify-between items-center bg-gray-50/80 rounded-xl p-3 border border-black/5">
                          <span className="text-xs text-secondary/60 uppercase font-semibold">String Tension</span>
                          <span className="font-bold text-secondary bg-white px-2 py-1 rounded shadow-sm min-w-[40px] text-center border border-black/5">{selectedUser.badmintonProfile?.stringTension || "--"}</span>
                        </div>
                        <div className="flex justify-between items-center bg-gray-50/80 rounded-xl p-3 border border-black/5">
                          <span className="text-xs text-secondary/60 uppercase font-semibold">Playing Style</span>
                          <span className="font-bold text-secondary bg-white px-2 py-1 rounded shadow-sm min-w-[70px] text-center border border-black/5">{selectedUser.badmintonProfile?.playingStyle || "Unknown"}</span>
                        </div>
                        <div className="flex justify-between items-center bg-gray-50/80 rounded-xl p-3 border border-black/5">
                          <span className="text-xs text-secondary/60 uppercase font-semibold">Favorite Brand</span>
                          <span className="font-bold text-secondary bg-white px-2 py-1 rounded shadow-sm min-w-[70px] text-center border border-black/5">{selectedUser.badmintonProfile?.racketBrand || "Unknown"}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {userDrawerTab === "behavior" && (
                <div className="space-y-6">
                  {selectedUser.behavior ? (() => {
                    const bp = selectedUser.behavior.behavioralProfile || 'unclassified';
                    const pd = PROFILE_DISPLAY[bp] || PROFILE_DISPLAY.unclassified;
                    return (
                    <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm space-y-4">
                      {/* ── Behavioral Profile Hero ── */}
                      <div className={`flex items-center gap-3 p-4 rounded-xl border ${pd.borderClass} ${pd.bgClass}`}>
                        <span className="text-3xl">{pd.emoji}</span>
                        <div className="flex-1">
                          <h4 className={`font-bold text-lg ${pd.textClass}`}>{pd.label}</h4>
                          <p className="text-xs text-secondary/60 mt-0.5">
                            {bp === 'ghost_shopper' && 'Browses many products quickly without detailed engagement'}
                            {bp === 'gear_geek' && 'Spends time examining specs, reviews, and product details'}
                            {bp === 'brand_loyalist' && 'Strong preference for specific brands'}
                            {bp === 'beginner' && 'Exploring multiple categories with budget-oriented browsing'}
                            {bp === 'unclassified' && 'Not enough behavioral data to classify yet'}
                          </p>
                        </div>
                      </div>

                      {/* ── Key Metrics Grid ── */}
                      <div className="grid grid-cols-3 gap-3">
                        <div className="p-3 bg-gray-50 border border-gray-100 rounded-xl text-center">
                          <span className="block text-[10px] text-secondary/50 font-semibold mb-1 uppercase">Behavior</span>
                          <span className="text-lg font-black text-secondary">{Math.round(selectedUser.behavior.behaviorScore || 0)}</span>
                        </div>
                        <div className="p-3 bg-gray-50 border border-gray-100 rounded-xl text-center">
                          <span className="block text-[10px] text-secondary/50 font-semibold mb-1 uppercase">Engagement</span>
                          <span className="text-lg font-black text-secondary">{Math.round(selectedUser.behavior.engagementScore || 0)}</span>
                        </div>
                        <div className="p-3 bg-gray-50 border border-gray-100 rounded-xl text-center">
                          <span className="block text-[10px] text-secondary/50 font-semibold mb-1 uppercase">Orders</span>
                          <span className="text-lg font-black text-secondary">{selectedUser.behavior.rfmScore?.frequency || 0}</span>
                        </div>
                      </div>

                      {/* ── Legacy Segment + RFM ── */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex justify-between items-center p-3 bg-indigo-50 border border-indigo-100 rounded-xl">
                          <span className="text-indigo-800 font-semibold text-xs">Segment</span>
                          <span className="font-bold text-indigo-900 bg-white px-2 py-1 rounded shadow-sm border border-indigo-100 text-xs">
                            {selectedUser.behavior.segment}
                          </span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-gray-50 border border-gray-100 rounded-xl">
                          <span className="text-secondary/70 font-semibold text-xs">RFM Monetary</span>
                          <span className="font-bold text-secondary bg-white px-2 py-1 rounded shadow-sm border border-gray-100 text-xs">
                            ${selectedUser.behavior.rfmScore?.monetary ? (selectedUser.behavior.rfmScore.monetary / 25000).toLocaleString("en-US") : 0}
                          </span>
                        </div>
                      </div>

                      {/* ── Cart Abandonment Alert ── */}
                      {selectedUser.behavior.cartAbandonment?.isAbandoned && (
                        <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-center justify-between">
                          <span className="text-red-800 font-semibold text-xs flex items-center gap-1.5">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                            Cart Abandoned
                          </span>
                          <span className="text-xs text-red-600 font-medium bg-white px-2 py-0.5 rounded border border-red-100">Found pending items</span>
                        </div>
                      )}

                      {/* ── Top Affinities ── */}
                      <div className="border-t border-black/5 pt-4">
                        <h5 className="text-xs font-bold text-secondary/70 uppercase mb-3">Top Affinities</h5>
                        {Object.keys(selectedUser.behavior.brandAffinities || {}).length > 0 || Object.keys(selectedUser.behavior.categoryAffinities || {}).length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(selectedUser.behavior.brandAffinities || {})
                              .sort((a: any, b: any) => b[1] - a[1])
                              .map(([brand, score]: any) => (
                                <span key={brand} className="text-xs font-medium bg-primary/10 text-primary px-2.5 py-1.5 rounded-lg border border-primary/20 flex flex-col">
                                  <span className="opacity-70 text-[10px] uppercase leading-none mb-0.5">Brand</span>
                                  <span>{brand} <span className="opacity-60 ml-0.5">({score.toFixed(1)})</span></span>
                                </span>
                              ))}
                            {Object.entries(selectedUser.behavior.categoryAffinities || {})
                              .sort((a: any, b: any) => b[1] - a[1])
                              .map(([cat, score]: any) => (
                                <span key={cat} className="text-xs font-medium bg-emerald-50 text-emerald-700 px-2.5 py-1.5 rounded-lg border border-emerald-200 flex flex-col">
                                  <span className="opacity-70 text-[10px] uppercase leading-none mb-0.5">Category</span>
                                  <span>{cat} <span className="opacity-60 ml-0.5">({score.toFixed(1)})</span></span>
                                </span>
                              ))}
                          </div>
                        ) : <span className="text-xs text-secondary/50 italic">No deep affinities tracked yet.</span>}
                      </div>
                    </div>
                    );
                  })() : (
                    <div className="p-8 text-center bg-gray-50 rounded-2xl border border-gray-100 flex flex-col items-center justify-center">
                      <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-3xl shadow-sm border border-black/5 mb-3 opacity-50">🕵️</div>
                      <h4 className="font-bold text-secondary">No Behavior Data</h4>
                      <p className="text-sm text-secondary/50 mt-1 max-w-xs">This user hasn&#39;t generated enough events or tracked actions to be segmented yet.</p>
                      <button className="btn-outline text-xs py-1.5 px-3 bg-white mt-4">Refresh Profile</button>
                    </div>
                  )}
                </div>
              )}

              {userDrawerTab === "history" && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-secondary">Purchase History</h4>
                    <button className="btn-outline py-1.5 px-3 text-xs bg-white">View All</button>
                  </div>

                  {/* Purchase History Summary Card */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="p-4 bg-primary/5 rounded-xl border border-primary/10">
                      <p className="text-xs text-primary font-bold uppercase tracking-wider mb-1">Total LTV Amount</p>
                      <p className="text-2xl font-bold text-secondary">
                        ${calculateLtv(selectedUser.email).toLocaleString("en-US")}
                      </p>
                    </div>
                    <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 flex items-center justify-between">
                      <div>
                        <p className="text-xs text-amber-700 font-bold uppercase tracking-wider mb-1">Expected Points</p>
                        <p className="text-2xl font-bold text-secondary">
                          {Math.floor(calculateLtv(selectedUser.email) * 2)} pts
                        </p>
                      </div>
                      <button
                        className="btn-primary py-1.5 px-3 text-xs bg-amber-500 hover:bg-amber-600 border-none whitespace-nowrap shadow-sm"
                        onClick={async () => {
                          const ltv = calculateLtv(selectedUser.email);
                          const expectedPoints = Math.floor(ltv * 2);
                          const currentPoints = selectedUser.points || 0;
                          const diff = expectedPoints - currentPoints;
                          if (diff <= 0) {
                            alert("Points are already synced or higher than expected.");
                            return;
                          }
                          try {
                            const updatedUser = await addUserPoints(selectedUser._id || selectedUser.id!, diff, token!);
                            setUsers(users.map(u => (u._id || u.id) === (selectedUser._id || selectedUser.id) ? { ...u, points: updatedUser.points, membershipTier: updatedUser.membershipTier } : u));
                            setSelectedUser({ ...selectedUser, points: updatedUser.points, membershipTier: updatedUser.membershipTier });
                            alert(`Automatically added ${diff} points! Total is now ${updatedUser.points}. New Tier: ${updatedUser.membershipTier}`);
                          } catch (err: any) { alert(err?.response?.data?.error || "Failed to auto-sync points"); }
                        }}
                      >
                        Auto-Sync
                      </button>
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-black/5 bg-white shadow-sm">
                    <table className="w-full text-left text-sm text-secondary/80">
                      <thead className="bg-gray-50/80 text-xs font-semibold text-secondary/60 uppercase tracking-wider">
                        <tr>
                          <th className="px-4 py-3">Order Code</th>
                          <th className="px-4 py-3">Purchase Date</th>
                          <th className="px-4 py-3">Main Product</th>
                          <th className="px-4 py-3">Total Amount</th>
                          <th className="px-4 py-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-black/5">
                        {orders.filter(o => o.user?.email === selectedUser.email).map(o => (
                          <tr key={o._id} className="transition hover:bg-gray-50/50 cursor-pointer">
                            <td className="px-4 py-3 font-semibold font-mono">#{o._id.slice(-8).toUpperCase()}</td>
                            <td className="px-4 py-3 text-secondary/60">{new Date(o.createdAt).toLocaleDateString()}</td>
                            <td className="px-4 py-3 truncate max-w-[150px] font-medium" title={o.items?.[0]?.product?.name || "Various Items"}>
                              {o.items?.[0]?.product?.name || "Various Items"}
                            </td>
                            <td className="px-4 py-3 font-bold text-primary">${o.total}</td>
                            <td className="px-4 py-3">
                              <span className={`inline-block uppercase text-[10px] font-bold px-2 py-0.5 rounded-full ${o.status === 'received' ? 'bg-green-200 text-green-700' : o.status === 'cancelled' ? 'bg-red-100 text-red-700' : o.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : o.status === 'delivered' ? 'bg-violet-100 text-violet-700' : 'bg-blue-100 text-blue-700'}`}>
                                {o.status === 'confirmed' ? 'delivery' : o.status === 'received' ? 'completed' : o.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                        {orders.filter(o => o.user?.email === selectedUser.email).length === 0 && (
                          <tr>
                            <td colSpan={5} className="text-center py-8 text-secondary/50 text-sm">
                              No orders yet. This user hasn't made any purchases.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {userDrawerTab === "settings" && (
                <div className="space-y-6">
                  <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
                    <h4 className="font-semibold text-secondary mb-4">Account Role</h4>
                    <select
                      className="w-full rounded-xl border border-black/10 bg-gray-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 font-medium text-secondary"
                      value={selectedUser.role || "user"}
                      onChange={async (e) => {
                        try {
                          await updateAdminUser(selectedUser._id || selectedUser.id!, { role: e.target.value }, token!);
                          setUsers(users.map(u => (u._id || u.id) === (selectedUser._id || selectedUser.id) ? { ...u, role: e.target.value } : u));
                          setSelectedUser({ ...selectedUser, role: e.target.value });
                        } catch (err) { }
                      }}
                    >
                      <option value="user">Customer</option>
                      <option value="warehouse_staff">Warehouse Staff</option>
                      <option value="knitter">Knitter</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>

                  <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm space-y-4">
                    <h4 className="font-semibold text-secondary">Security</h4>
                    <button className="w-full text-left p-3.5 rounded-xl border border-black/5 hover:bg-gray-50 transition-colors flex justify-between items-center group">
                      <span className="text-sm font-semibold text-secondary group-hover:text-primary transition-colors">Send Password Reset Link</span>
                      <svg className="w-5 h-5 text-secondary/40 group-hover:text-primary transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                    </button>
                    <button
                      className="w-full text-left p-3.5 rounded-xl border border-red-100 hover:bg-red-50 transition-colors flex justify-between items-center group"
                      onClick={() => {
                        handleDeleteUser(selectedUser._id || selectedUser.id!);
                        setIsUserDrawerOpen(false);
                      }}
                    >
                      <span className="text-sm font-semibold text-red-600">Delete Account</span>
                      <svg className="w-5 h-5 text-red-500/50 group-hover:text-red-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>

                  <div className="rounded-2xl border border-amber-500/30 bg-amber-50/40 p-5 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                      <svg className="w-16 h-16 text-amber-900" fill="currentColor" viewBox="0 0 24 24"><path d="M11 20H6C4.89543 20 4 19.1046 4 18V6C4 4.89543 4.89543 4 6 4H14C15.1046 4 16 4.89543 16 6V11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M18 14L22 18M22 14L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </div>
                    <h4 className="font-semibold text-amber-900 mb-3 relative z-10">Internal Staff Notes</h4>
                    <textarea
                      className="w-full rounded-xl border border-amber-500/20 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 min-h-[140px] resize-none text-secondary relative z-10 shadow-inner"
                      placeholder="e.g., 'This customer often cancels orders', or 'Friend of the owner, give 10% discount...'"
                      value={selectedUser.internalNotes || ""}
                      onChange={(e) => setSelectedUser({ ...selectedUser, internalNotes: e.target.value })}
                      onBlur={async (e) => {
                        try {
                          await updateAdminUser(selectedUser._id || selectedUser.id!, { internalNotes: e.target.value }, token!);
                          setUsers(users.map(u => (u._id || u.id) === (selectedUser._id || selectedUser.id) ? { ...u, internalNotes: e.target.value } : u));
                        } catch (err) { }
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {isUserDrawerOpen && (
        <div className="fixed inset-0 z-[90] bg-black/30 backdrop-blur-sm transition-opacity" onClick={() => setIsUserDrawerOpen(false)} />
      )}

    </AdminShell>
  );
}

// ─── Shared Components ─────────────────────────────────────────────

function buildDashboard(args: { dash: { users: number; orders: number; products: number }; revenue: number; orders: any[]; products: any[] }): Dashboard {
  const now = new Date();
  const days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(now);
    d.setDate(now.getDate() - (6 - i));
    return d.toISOString().slice(0, 10);
  });
  const salesData = days.map((day) => ({
    day: day.slice(5),
    orders: args.orders.filter((o) => String(o.createdAt || "").slice(0, 10) === day).length || 0,
  }));

  const months = Array.from({ length: 6 }).map((_, i) => {
    const d = new Date(now);
    d.setMonth(now.getMonth() - (5 - i));
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    return key;
  });
  const revenueByMonth = months.map((m) => ({
    month: m.slice(5),
    revenue: args.orders
      .filter((o) => String(o.createdAt || "").slice(0, 7) === m)
      .reduce((sum, o) => sum + Number(o.total || 0), 0),
  }));

  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const ordersThisMonth = args.orders.filter(o => String(o.createdAt) >= thisMonthStart);
  const revenueThisMonth = ordersThisMonth.reduce((sum, o) => sum + Number(o.total || 0), 0);
  const profitThisMonth = revenueThisMonth * 0.32; // Mock profit margin

  const cancelledOrders = args.orders.filter(o => o.status === "cancelled").length;
  const returnRate = args.orders.length ? (cancelledOrders / args.orders.length) * 100 : 0;

  const topProducts = args.products
    .slice(0, 10) // Updated to top 10 as requested
    .map((p) => {
      const sold = Math.max(1, Math.round((p.reviews || 10) / 5) * 3);
      const price = Number(p.price || p.basePrice || 0);
      return {
        name: p.name,
        sold,
        price,
        image: p.image,
        revenue: price * sold
      };
    })
    .sort((a, b) => b.revenue - a.revenue);

  const recentActivity = args.orders.slice(0, 5).map(o => ({
    id: o._id,
    type: o.status === "delivered" ? "success" : "info",
    text: `Order #${String(o._id).slice(-8).toUpperCase()} placed by ${o.user?.name || "Customer"}`,
    time: new Date(o.createdAt).toLocaleString()
  }));

  const customerSegments = {
    new: 32,
    returning: 68,
    active: 85,
    inactive: 15
  };

  const salesByCategory = [
    { name: "Rackets (Volume)", value: 55, color: "#EF4444" },
    { name: "Shuttlecocks (Margin)", value: 20, color: "#10B981" },
    { name: "Accessories (Margin)", value: 15, color: "#3B82F6" },
    { name: "Shoes & Bags", value: 10, color: "#F59E0B" },
  ];

  const consumableTracking = Array.from({ length: 14 }).map((_, i) => ({
    day: `Day ${i + 1}`,
    shuttlecocks: 20 + Math.floor(Math.random() * 30) + i * 2,
    grips: 10 + Math.floor(Math.random() * 15) + i,
  }));

  const vipCustomers = [
    { name: "Alex Chen", email: "alex@example.com", spent: 3450.00, orders: 24, avatar: "" },
    { name: "Jordan Smith", email: "jordan@example.com", spent: 2890.50, orders: 18, avatar: "" },
    { name: "Taylor Swift", email: "taylor@example.com", spent: 2100.00, orders: 15, avatar: "" },
    { name: "Morgan Lee", email: "morgan@example.com", spent: 1850.75, orders: 12, avatar: "" },
    { name: "Casey Jones", email: "casey@example.com", spent: 1540.00, orders: 9, avatar: "" },
  ];

  const lowStockVariants = [
    { product: "Yonex 65Z3 Shoes", variant: "White - Size 40", stock: 2, color: "White", size: "40" },
    { product: "Astrox 88D Pro", variant: "4U - G5", stock: 1, color: "Camel Gold", size: "4U G5" },
    { product: "Aerobite String", variant: "Red/White", stock: 3, color: "Red/White", size: "Standard" },
    { product: "Super Grap Tape", variant: "Black - 3 Pack", stock: 4, color: "Black", size: "3-Pack" },
  ];

  return {
    totalUsers: args.dash.users,
    totalProducts: args.dash.products,
    totalOrders: args.dash.orders,
    revenue: Number(args.revenue || 0),
    revenueThisMonth,
    ordersThisMonth: ordersThisMonth.length,
    profitThisMonth,
    revenueTrend: "+14.2%",
    ordersTrend: "+8.5%",
    profitTrend: "+18.4%",
    returnRate,
    salesData,
    revenueByMonth,
    salesByCategory,
    topProducts,
    recentActivity,
    customerSegments,
    consumableTracking,
    vipCustomers,
    lowStockVariants
  };
}

function ModalOverlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      {children}
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-heading text-lg font-semibold text-secondary">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function StatCard({ label, value, trend, negativeTrend = false }: { label: string; value: number | string; trend?: string; negativeTrend?: boolean }) {
  return (
    <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm hover:shadow-md transition-shadow duration-300">
      <p className="text-sm font-semibold text-secondary/60 mb-3">{label}</p>
      <div className="flex items-end justify-between">
        <p className="text-3xl font-bold text-secondary">{value}</p>
        {trend && (
          <span className={`text-xs font-semibold px-2 py-1 rounded-md mb-1 ${negativeTrend ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
            {trend}
          </span>
        )}
      </div>
    </div>
  );
}

function Pagination({ current, total, pageSize, onChange }: { current: number; total: number; pageSize: number; onChange: (p: number) => void }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const showing = Math.min(pageSize, total - (current - 1) * pageSize);
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-secondary/70">
      <span>
        Showing {Math.max(0, showing)} of {total}
      </span>
      <div className="flex items-center gap-2">
        <button
          className="btn-outline px-3 py-2 text-sm"
          disabled={current <= 1}
          onClick={() => onChange(current - 1)}
        >
          Prev
        </button>
        <span className="pill">
          Page {current} / {totalPages}
        </span>
        <button
          className="btn-outline px-3 py-2 text-sm"
          disabled={current >= totalPages}
          onClick={() => onChange(current + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}

function MiniLineChart({ data }: { data: number[] }) {
  const max = Math.max(1, ...data);
  const pts = data
    .map((v, i) => {
      const x = (i / Math.max(1, data.length - 1)) * 100;
      const y = 40 - (v / max) * 36;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg viewBox="0 0 100 40" className="h-20 w-full">
      <polyline points={pts} fill="none" stroke="currentColor" strokeWidth="3" className="text-primary" />
    </svg>
  );
}

function DoubleLineChart({ data }: { data: { day: string; shuttlecocks: number; grips: number }[] }) {
  const maxShuttle = Math.max(1, ...data.map(d => d.shuttlecocks));
  const maxGrips = Math.max(1, ...data.map(d => d.grips));
  const max = Math.max(parseFloat(maxShuttle.toString()), parseFloat(maxGrips.toString())) * 1.1;

  const shuttlePts = data.map((d, i) => `${(i / Math.max(1, data.length - 1)) * 100},${40 - (d.shuttlecocks / max) * 36}`).join(" ");
  const gripsPts = data.map((d, i) => `${(i / Math.max(1, data.length - 1)) * 100},${40 - (d.grips / max) * 36}`).join(" ");

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-center gap-6 text-xs font-semibold">
        <div className="flex items-center gap-2"><span className="w-3 h-1 bg-emerald-500 rounded"></span> Shuttlecocks (Tubes)</div>
        <div className="flex items-center gap-2"><span className="w-3 h-1 bg-blue-500 rounded"></span> Grip Tapes</div>
      </div>
      <svg viewBox="0 0 100 40" className="h-32 w-full pt-2">
        <polyline points={shuttlePts} fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <polyline points={gripsPts} fill="none" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {data.map((d, i) => (
          <circle key={`s-${i}`} cx={(i / Math.max(1, data.length - 1)) * 100} cy={40 - (d.shuttlecocks / max) * 36} r="1" fill="#10B981" />
        ))}
        {data.map((d, i) => (
          <circle key={`g-${i}`} cx={(i / Math.max(1, data.length - 1)) * 100} cy={40 - (d.grips / max) * 36} r="1" fill="#3B82F6" />
        ))}
      </svg>
    </div>
  );
}

function MiniBarChart({ data, labels }: { data: number[], labels?: string[] }) {
  const max = Math.max(1, ...data);
  return (
    <div className="flex h-52 items-end pt-4 gap-2 sm:gap-4">
      {data.map((v, idx) => (
        <div key={idx} className="flex flex-col items-center flex-1 h-full justify-end group">
          <div className="w-full relative flex items-end justify-center rounded-t-lg bg-primary/5 group-hover:bg-primary/10 transition-colors" style={{ height: '100%' }}>
            <div className="w-full rounded-t-lg bg-primary transition-all duration-500 relative max-w-[40px]" style={{ height: `${(v / max) * 100}%` }}>
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-secondary text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity font-semibold z-10 whitespace-nowrap">
                ${v.toFixed(0)}
              </div>
            </div>
          </div>
          {labels && <span className="text-xs font-semibold text-secondary/50 mt-3 whitespace-nowrap hidden sm:block">{labels[idx]}</span>}
          {labels && <span className="text-[10px] font-semibold text-secondary/50 mt-2 block sm:hidden">{labels[idx].slice(5)}</span>}
        </div>
      ))}
    </div>
  );
}

function MiniDonutChart({ data }: { data: { name: string; value: number; color: string }[] }) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  let cumulativeValue = 0;

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-10">
      <svg viewBox="0 0 36 36" className="w-32 h-32 md:w-36 md:h-36 transform -rotate-90">
        {data.map((slice, i) => {
          const strokeDasharray = `${(slice.value / total) * 100} 100`;
          const strokeDashoffset = `-${(cumulativeValue / total) * 100}`;
          cumulativeValue += slice.value;
          return (
            <circle
              key={i}
              cx="18"
              cy="18"
              r="15.91549430918954"
              fill="transparent"
              stroke={slice.color}
              strokeWidth="5"
              strokeDasharray={strokeDasharray}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-1000 ease-in-out hover:stroke-6 cursor-pointer"
            />
          );
        })}
      </svg>
      <div className="space-y-3 flex-1">
        {data.map((slice, i) => (
          <div key={i} className="flex items-center justify-between text-sm gap-4">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: slice.color }}></span>
              <span className="text-secondary/70 font-medium">{slice.name}</span>
            </div>
            <span className="font-bold text-secondary">{Math.round((slice.value / total) * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
