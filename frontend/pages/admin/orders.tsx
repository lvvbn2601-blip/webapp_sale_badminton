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
  getPaymentStatus,
  updateUserRole,
  deleteAdminUser,
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  fetchUnreadNotificationCount,
  updateOrderTracking,
  updateStringingStatus,
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
  discountAmount?: number;
  items?: any[];
  trackingNumber?: string;
  carrier?: string;
  needsStringing?: boolean;
  stringingStatus?: string;
  returnReason?: string;
  paymentInfo?: {
    status: string;
    provider: string;
    amount: number;
    transactionId?: string;
    createdAt?: string;
  } | null;
};

type AdminUser = {
  _id: string;
  id?: string;
  name: string;
  email: string;
  role: string;
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

export default function AdminOrdersPage() {
  const router = useRouter();

  const [authChecked, setAuthChecked] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [section, setSection] = useState<AdminSection>("orders");
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
  const [userPage, setUserPage] = useState(1);
  const userPageSize = 10;

  // Orders Management state
  const [orderQuery, setOrderQuery] = useState("");
  const [orderStatus, setOrderStatus] = useState("all");
  const [orderPage, setOrderPage] = useState(1);
  const orderPageSize = 10;
  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null);
  const [trackingNumberInput, setTrackingNumberInput] = useState("");
  const [carrierInput, setCarrierInput] = useState("");
  const [stringingStatusInput, setStringingStatusInput] = useState("");
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelOrderId, setCancelOrderId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelSubmitting, setCancelSubmitting] = useState(false);

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
    return users.filter((u) => !q || u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q));
  }, [users, userQuery]);

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

  const openCancelModal = (orderId: string) => {
    setCancelOrderId(orderId);
    setCancelReason("");
    setCancelModalOpen(true);
  };

  const handleCancelOrder = async () => {
    if (!cancelOrderId || !cancelReason.trim()) return;
    setCancelSubmitting(true);
    try {
      if (usingMockData || !token) {
        setOrders(orders.map(o => o._id === cancelOrderId ? { ...o, status: 'cancelled' } : o));
      } else {
        await updateOrderStatus(cancelOrderId, 'cancelled', token, cancelReason.trim());
        setOrders(orders.map(o => o._id === cancelOrderId ? { ...o, status: 'cancelled' } : o));
      }
      if (selectedOrder?._id === cancelOrderId) {
        setSelectedOrder({ ...selectedOrder, status: 'cancelled' });
      }
      setCancelModalOpen(false);
      setCancelOrderId(null);
      setCancelReason("");
    } catch (e: any) {
      alert(e?.response?.data?.error || "Failed to cancel order");
    } finally {
      setCancelSubmitting(false);
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









      {/* ═══════════════════════ ORDERS SECTION ═══════════════════════ */}
      {section === "orders" && (
        <div className="space-y-6">
          {/* Header Metric Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <StatCard label="Total Orders" value={orders.length || 0} />
            <StatCard label="Monthly Revenue" value={`$${(dashboard?.revenueThisMonth || 0).toLocaleString()}`} />
            <StatCard label="Pending" value={orders.filter(o => o.status === "pending").length} />
            <StatCard label="Paid (Awaiting Confirm)" value={orders.filter(o => o.status === "paid").length} />
            <StatCard label="Delivered" value={orders.filter(o => o.status === "delivered").length} />
          </div>

          <div className="flex flex-col gap-4 rounded-2xl border border-black/5 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="flex w-full overflow-x-auto pb-2 sm:w-auto sm:pb-0 hide-scrollbar gap-2">
              {[
                { id: "all", label: "All Orders" },
                { id: "pending", label: "Pending" },
                { id: "paid", label: "Paid" },
                { id: "confirmed", label: "Delivery" },
                { id: "delivered", label: "Delivered" },
                { id: "received", label: "Received" },
                { id: "cancelled", label: "Cancelled" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setOrderStatus(tab.id);
                    setOrderPage(1);
                    setSelectedOrder(null);
                  }}
                  className={`whitespace-nowrap px-5 py-2 text-sm font-semibold rounded-full transition-all duration-300 ${orderStatus === tab.id
                    ? "bg-primary text-white shadow-md shadow-primary/20 scale-105"
                    : "bg-black/5 text-secondary/70 hover:bg-black/10 hover:text-secondary"
                    }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="w-full sm:w-72 relative">
              <span className="absolute inset-y-0 left-4 top-1/2 -translate-y-1/2 text-lg opacity-50">🔍</span>
              <input
                className="w-full rounded-full border-none bg-black/5 pl-10 pr-4 py-3 text-sm shadow-inner focus:bg-white border focus:border-primary/20 focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all font-medium"
                placeholder="Search order or customer..."
                value={orderQuery}
                onChange={(e) => {
                  setOrderQuery(e.target.value);
                  setOrderPage(1);
                  setSelectedOrder(null);
                }}
              />
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm flex relative min-h-[500px]">
            <div className={`w-full transition-all duration-500 ease-in-out ${selectedOrder ? "hidden lg:block lg:w-1/2 xl:w-7/12 border-r border-black/5" : "w-full"}`}>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-secondary/70 whitespace-nowrap">
                  <thead className="bg-gray-50/80 text-xs font-bold text-secondary/50 uppercase tracking-widest sticky top-0 backdrop-blur-md z-10">
                    <tr>
                      <th className="px-6 py-4">Order Info</th>
                      <th className="px-6 py-4">Customer</th>
                      <th className="px-6 py-4">Items</th>
                      <th className="px-6 py-4">Total</th>
                      <th className="px-6 py-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5">
                    {pagedOrders.map((o) => (
                      <tr
                        key={o._id}
                        onClick={() => setSelectedOrder(o)}
                        className={`transition-colors duration-200 cursor-pointer ${selectedOrder?._id === o._id ? "bg-primary/[0.03]" : "hover:bg-gray-50/50"
                          }`}
                      >
                        <td className="px-6 py-4">
                          <div className={`font-bold transition-colors ${selectedOrder?._id === o._id ? 'text-primary' : 'text-secondary'}`}>#{o._id.slice(-8).toUpperCase()}</div>
                          <div className="text-[11px] font-medium text-secondary/40 mt-1">{new Date(o.createdAt || "").toLocaleString()}</div>
                          <div className={`w-fit px-2 py-1 rounded-full ${o.needsStringing === false ? "" : o.stringingStatus === "completed" ? "bg-green-50 text-green-600 border border-green-200" : "bg-red-50 text-red-600 border border-red-200"} text-xs mt-1`}>{o.needsStringing === false ? "" : o.stringingStatus === "completed" ? "Completed Stringing" : "Stringing Required"}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-semibold text-secondary">{o.recipientName || o.user?.name || "Unknown"}</div>
                          <div className="text-xs text-secondary/50 mt-1 max-w-[150px] truncate">{o.shippingAddress?.split(',').slice(-2).join(', ') || "No Location"}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="inline-flex items-center justify-center bg-black/5 text-secondary font-bold px-3 py-1 rounded-lg text-xs">
                            🛍️ {o.items?.reduce((acc: number, item: any) => acc + (item.quantity || 1), 0) || 0}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-bold text-secondary">${(o.total || 0).toFixed(2)}</div>
                          <div className="text-[10px] text-secondary/50 font-bold uppercase mt-1 tracking-wider bg-black/5 w-fit px-1.5 py-0.5 rounded">{o.payment || "COD"}</div>
                        </td>
                        <td className="px-6 py-4 border-l-4 border-transparent">
                          <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold shadow-sm
                            ${o.status === "pending" ? (o.paymentInfo?.status === "pending" ? "bg-orange-50 text-orange-600 border border-orange-200" : "bg-yellow-50 text-yellow-600 border border-yellow-200") :
                              o.status === "paid" ? "bg-green-50 text-green-600 border border-green-200" :
                                o.status === "confirmed" ? "bg-blue-50 text-blue-600 border border-blue-200" :
                                  o.status === "shipped" ? "bg-indigo-50 text-indigo-600 border border-indigo-200" :
                                    o.status === "delivered" ? "bg-purple-50 text-purple-600 border border-purple-200" :
                                      o.status === "received" ? "bg-emerald-50 text-emerald-600 border border-emerald-200" :
                                        "bg-red-50 text-red-600 border border-red-200"
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full mr-2 
                              ${o.status === "pending" ? (o.paymentInfo?.status === "pending" ? "bg-orange-500" : "bg-yellow-500") :
                                o.status === "paid" ? "bg-green-500" : o.status === "confirmed" ? "bg-blue-500" :
                                  o.status === "shipped" ? "bg-indigo-500" : o.status === "delivered" ? "bg-purple-500" :
                                    o.status === "received" ? "bg-emerald-500" : "bg-red-500"}`}
                            ></span>
                            {o.status === "pending" ? (o.paymentInfo?.status === "pending" ? "⏳ Waiting Payment" : "📝 Pending") :
                              o.status === "paid" ? "💰 Paid" :
                                o.status === "confirmed" ? (o.needsStringing && o.stringingStatus !== 'completed' ? '🧵 Stringing' : '🚚 Delivery') :
                                  o.status === "received" ? "✅ Received" : o.status === "shipped" ? "Shipped" :
                                    o.status === "delivered" ? "📦 Delivered" : "❌ Cancelled"}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {pagedOrders.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-16 text-center text-secondary/40 flex flex-col items-center">
                          <span className="text-5xl mb-4 grayscale opacity-50">🧭</span>
                          <p className="font-medium">No orders found matching your search.</p>
                          <button onClick={() => { setOrderQuery(""); setOrderStatus("all"); }} className="mt-4 text-primary font-bold text-sm bg-primary/10 px-4 py-2 rounded-full hover:bg-primary/20 transition-colors">Clear Filters</button>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {filteredOrders.length > orderPageSize && (
                <div className="border-t border-black/5 px-6 py-4 bg-gray-50/30">
                  <Pagination current={orderPage} total={filteredOrders.length} pageSize={orderPageSize} onChange={setOrderPage} />
                </div>
              )}
            </div>

            {/* Slide-in Detail Panel */}
            {selectedOrder && (
              <div className="w-full lg:w-1/2 xl:w-5/12 bg-gray-50/50 flex flex-col absolute inset-0 lg:relative z-10 border-l border-black/5 shadow-[-10px_0_30px_rgba(0,0,0,0.02)] translate-x-0 animate-slide-in">
                {/* Header */}
                <div className="flex items-center justify-between p-6 bg-white border-b border-black/5 sticky top-0 z-20 shadow-sm">
                  <div>
                    <h3 className="text-xl font-black text-secondary tracking-tight">
                      Order #{selectedOrder._id.slice(-8).toUpperCase()}
                    </h3>
                    <p className="text-xs font-semibold text-secondary/40 mt-1">{new Date(selectedOrder.createdAt).toLocaleString()}</p>
                  </div>
                  <button
                    onClick={() => setSelectedOrder(null)}
                    className="w-10 h-10 flex items-center justify-center text-secondary/40 hover:bg-black/5 hover:text-secondary rounded-full transition-colors font-bold text-lg"
                  >
                    ✕
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6 hide-scrollbar">
                  {/* Status Timeline */}
                  <div className="bg-white rounded-[20px] p-6 shadow-sm border border-black/5">
                    <h4 className="text-xs font-black text-secondary/40 uppercase tracking-widest mb-6">Status Flow</h4>

                    {/* Payment Info Banner */}
                    {selectedOrder.paymentInfo && (
                      <div className={`mb-5 p-4 rounded-xl border flex items-center justify-between ${selectedOrder.paymentInfo.status === 'success' ? 'bg-green-50/80 border-green-200' :
                        selectedOrder.paymentInfo.status === 'pending' ? 'bg-orange-50/80 border-orange-200' :
                          'bg-red-50/80 border-red-200'
                        }`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${selectedOrder.paymentInfo.status === 'success' ? 'bg-green-100 text-green-600' :
                            selectedOrder.paymentInfo.status === 'pending' ? 'bg-orange-100 text-orange-600' :
                              'bg-red-100 text-red-600'
                            }`}>
                            {selectedOrder.paymentInfo.status === 'success' ? '✅' : selectedOrder.paymentInfo.status === 'pending' ? '⏳' : '❌'}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-secondary">
                              {selectedOrder.paymentInfo.provider?.toUpperCase()} Payment
                            </p>
                            <p className={`text-xs font-semibold mt-0.5 ${selectedOrder.paymentInfo.status === 'success' ? 'text-green-600' :
                              selectedOrder.paymentInfo.status === 'pending' ? 'text-orange-600' :
                                'text-red-600'
                              }`}>
                              {selectedOrder.paymentInfo.status === 'success' ? 'Payment Successful' :
                                selectedOrder.paymentInfo.status === 'pending' ? 'Waiting for Payment...' :
                                  'Payment Failed'}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-black text-secondary">${selectedOrder.paymentInfo.amount?.toFixed(2)}</p>
                          {selectedOrder.paymentInfo.transactionId && (
                            <p className="text-[10px] text-secondary/40 font-mono mt-0.5">{selectedOrder.paymentInfo.transactionId}</p>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="flex flex-col gap-6">
                      <div className="flex items-center w-full relative px-2">
                        <div className="absolute top-1/2 left-4 right-4 h-[3px] bg-black/5 -translate-y-1/2 z-0 rounded-full"></div>
                        <div
                          className="absolute top-1/2 left-4 h-[3px] bg-gradient-to-r from-primary to-rose-400 -translate-y-1/2 z-0 transition-all duration-700 ease-out rounded-full"
                          style={{
                            width: selectedOrder.status === 'pending' ? '0%' :
                              selectedOrder.status === 'paid' ? '20%' :
                                selectedOrder.status === 'confirmed' ? '40%' :
                                  selectedOrder.status === 'delivered' ? '70%' :
                                    selectedOrder.status === 'received' ? '100%' : '100%'
                          }}
                        ></div>
                        {(() => {
                          const isOnlinePayment = selectedOrder.payment === 'vnpay' || selectedOrder.payment === 'momo';
                          const steps = isOnlinePayment
                            ? [
                              { s: 'pending', l: 'Pending', icon: '📝' },
                              { s: 'paid', l: 'Paid', icon: '💰' },
                              { s: 'confirmed', l: selectedOrder.needsStringing && selectedOrder.stringingStatus !== 'completed' ? 'Stringing' : 'Delivery', icon: selectedOrder.needsStringing ? '🧵' : '🚚' },
                              { s: 'delivered', l: 'Delivered', icon: '📦' },
                              { s: 'received', l: 'Received', icon: '✅' }
                            ]
                            : [
                              { s: 'pending', l: 'Pending', icon: '📝' },
                              { s: 'confirmed', l: selectedOrder.needsStringing && selectedOrder.stringingStatus !== 'completed' ? 'Stringing' : 'Delivery', icon: selectedOrder.needsStringing ? '🧵' : '🚚' },
                              { s: 'delivered', l: 'Delivered', icon: '📦' },
                              { s: 'received', l: 'Received', icon: '✅' }
                            ];
                          const statusOrder = steps.map(s => s.s);
                          const currentIdx = statusOrder.indexOf(selectedOrder.status);

                          return steps.map((step, idx) => {
                            const isPast = ['cancelled', 'returned'].includes(selectedOrder.status) || idx <= currentIdx;
                            const isCurrent = ['cancelled', 'returned'].includes(selectedOrder.status) ? false : idx === currentIdx;

                            return (
                              <div key={step.s} className={`flex flex-col items-center flex-1 z-10 transition-transform ${isCurrent ? 'scale-110' : ''}`}>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-[3px] transition-all duration-500 shadow-sm
                                  ${isCurrent ? 'bg-white border-primary text-primary shadow-[0_0_15px_rgba(239,68,68,0.3)]' :
                                    isPast ? 'bg-primary border-primary text-white' : 'bg-white border-black/5 text-black/20'}`}
                                >
                                  {isPast && !isCurrent ? '✓' : step.icon}
                                </div>
                                <span className={`text-[10px] font-bold mt-2 uppercase tracking-wide transition-colors ${isCurrent ? 'text-primary' : isPast ? 'text-secondary/80' : 'text-secondary/30'}`}>
                                  {step.l}
                                </span>
                              </div>
                            );
                          });
                        })()}
                      </div>

                      <div className="flex gap-3 isolate mt-2">
                        {selectedOrder.status === 'pending' && (
                          selectedOrder.paymentInfo?.status === 'pending' ? (
                            <div className="flex-1 text-center py-3 bg-orange-50 text-orange-600 border border-orange-200 rounded-2xl text-sm font-bold flex items-center justify-center gap-2">
                              <span className="animate-pulse">⏳</span> Waiting for {selectedOrder.payment?.toUpperCase()} Payment...
                              <button onClick={() => openCancelModal(selectedOrder._id)} className="px-5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 py-3 rounded-2xl text-sm font-bold transition-all active:scale-95">Cancel</button>
                            </div>
                          ) : (
                            <>
                              <button onClick={() => handleUpdateOrderStatus(selectedOrder._id, 'confirmed')} className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-blue-500/25 text-white py-3 rounded-2xl text-sm font-bold shadow-lg transition-all hover:scale-[1.02] active:scale-95">Confirm Order</button>
                              <button onClick={() => openCancelModal(selectedOrder._id)} className="px-5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 py-3 rounded-2xl text-sm font-bold transition-all active:scale-95">Cancel</button>
                            </>
                          )
                        )}
                        {selectedOrder.status === 'paid' && (
                          <>
                            <button onClick={() => handleUpdateOrderStatus(selectedOrder._id, 'confirmed')} className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-blue-500/25 text-white py-3 rounded-2xl text-sm font-bold shadow-lg transition-all hover:scale-[1.02] active:scale-95">✅ Confirm Order</button>
                            <button onClick={() => openCancelModal(selectedOrder._id)} className="px-5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 py-3 rounded-2xl text-sm font-bold transition-all active:scale-95">Cancel</button>
                          </>
                        )}
                        {selectedOrder.status === 'confirmed' && (
                          selectedOrder.needsStringing && selectedOrder.stringingStatus !== 'completed' ? (
                            <div className="flex-1 text-center py-3 bg-blue-50 text-blue-600 border border-blue-100 rounded-2xl text-sm font-bold">
                              Waiting for Stringing Completion...
                            </div>
                          ) : (
                            <button onClick={() => handleUpdateOrderStatus(selectedOrder._id, 'delivered')} className="flex-1 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 shadow-purple-500/25 text-white py-3 rounded-2xl text-sm font-bold shadow-lg transition-all hover:scale-[1.02] active:scale-95">Mark as Delivered</button>
                          )
                        )}
                        {selectedOrder.status === 'delivered' && (
                          <button onClick={() => handleUpdateOrderStatus(selectedOrder._id, 'received')} className="flex-1 bg-gradient-to-r from-emerald-400 to-emerald-500 hover:from-emerald-500 hover:to-emerald-600 shadow-emerald-500/25 text-white py-3 rounded-2xl text-sm font-bold shadow-lg transition-all hover:scale-[1.02] active:scale-95">Confirm Received</button>
                        )}
                        {(!['pending', 'paid', 'confirmed', 'delivered'].includes(selectedOrder.status)) && (
                          <div className="flex-1 flex gap-3">
                            <select
                              className="flex-1 rounded-2xl border-none bg-black/5 px-4 py-3 text-sm font-bold shadow-inner focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all appearance-none cursor-pointer"
                              value={selectedOrder.status}
                              onChange={(e) => {
                                if (e.target.value === 'cancelled') {
                                  openCancelModal(selectedOrder._id);
                                } else {
                                  handleUpdateOrderStatus(selectedOrder._id, e.target.value);
                                }
                              }}
                            >
                              {['pending', 'paid', 'confirmed', 'delivered', 'received', 'cancelled', 'returned'].map(s => (
                                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Customer Info */}
                  <div className="bg-white rounded-[20px] p-6 shadow-sm border border-black/5 flex items-start gap-5 hover:shadow-md transition-shadow">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 text-primary flex items-center justify-center font-black text-xl shadow-inner border border-primary/10 shrink-0">
                      {(selectedOrder.recipientName || selectedOrder.user?.name || "C")[0].toUpperCase()}
                    </div>
                    <div className="flex-1 text-sm space-y-2.5 mt-0.5">
                      <h4 className="font-black text-secondary text-base">{selectedOrder.recipientName || selectedOrder.user?.name || "Unknown Customer"}</h4>
                      <p className="text-secondary/60 font-medium flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-black/5 flex items-center justify-center text-[10px]">📞</span>
                        {selectedOrder.recipientPhone || selectedOrder.user?.phone || "No phone"}
                      </p>
                      <p className="text-secondary/60 font-medium flex items-start gap-3">
                        <span className="w-6 h-6 rounded-full bg-black/5 flex items-center justify-center text-[10px] mt-px shrink-0">📍</span>
                        <span className="leading-relaxed">{selectedOrder.shippingAddress || "No address provided"}</span>
                      </p>
                      {selectedOrder.returnReason && (
                        <div className="mt-3 p-3 bg-red-50/50 border border-red-100 rounded-xl text-red-700 text-xs font-semibold">
                          <span className="mr-1">💬</span> Note: {selectedOrder.returnReason}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Products List */}
                  <div className="bg-white rounded-[20px] p-6 shadow-sm border border-black/5">
                    {selectedOrder.needsStringing && (
                      <div className="mb-6 p-4 rounded-xl border border-primary/20 bg-primary/5 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-primary text-2xl shadow-sm border border-primary/10">🧵</div>
                          <div>
                            <p className="text-[15px] font-black text-secondary">Racket Stringing Required</p>
                            <p className="text-xs font-semibold text-secondary/60 mt-0.5">
                              Status: <span className={selectedOrder.stringingStatus === 'completed' ? 'text-emerald-600' : selectedOrder.stringingStatus === 'in_progress' ? 'text-blue-600' : 'text-yellow-600'}>{selectedOrder.stringingStatus === 'completed' ? 'Completed' : selectedOrder.stringingStatus === 'in_progress' ? 'In Progress' : 'In Queue'}</span>
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    <div className="flex items-center justify-between mb-5">
                      <h4 className="text-xs font-black text-secondary/40 uppercase tracking-widest flex items-center gap-2">
                        Products
                      </h4>
                      <span className="bg-black/5 text-secondary font-bold text-xs px-2 py-0.5 rounded-md">{selectedOrder.items?.length || 0} ITEMS</span>
                    </div>
                    <div className="space-y-4">
                      {selectedOrder.items?.map((item: any, idx: number) => (
                        <div key={idx} className="flex items-center gap-4 group p-2 hover:bg-black/[0.02] rounded-xl transition-colors -mx-2">
                          <div className="relative">
                            <img src={item.product?.image || item.image || "/placeholder.jpg"} alt={item.product?.name || "Product"} className="w-16 h-16 rounded-xl object-cover border border-black/5 bg-white shadow-sm" />
                            <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-secondary text-white flex items-center justify-center text-[10px] font-bold border-2 border-white">{item.quantity}</div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-secondary truncate group-hover:text-primary transition-colors">{item.product?.name || item.name || "Unknown Product"}</p>
                            {item.variant && <p className="text-[11px] font-semibold text-secondary/40 mt-1 uppercase tracking-wide">{item.variant}</p>}
                          </div>
                          <div className="text-right whitespace-nowrap pl-4">
                            <p className="text-sm font-black text-secondary">${item.price}</p>
                            <p className="text-[10px] font-bold text-secondary/30 mt-1 uppercase">Price</p>
                          </div>
                        </div>
                      ))}
                      {(!selectedOrder.items || selectedOrder.items.length === 0) && (
                        <div className="text-sm text-secondary/40 text-center py-6 bg-black/[0.02] rounded-xl border border-black/5 border-dashed">
                          <div className="text-2xl mb-2">🤷</div>
                          <p className="font-medium">No items available</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Payment Summary */}
                  <div className="bg-gray-100 rounded-[20px] p-6 shadow-lg text-secondary mb-6">
                    <h4 className="text-xs font-black text-secondary uppercase tracking-widest mb-5 flex items-center gap-2">
                      Payment Summary
                    </h4>
                    <div className="space-y-4 text-sm font-medium">
                      <div className="flex justify-between text-secondary/70">
                        <span>Estimated Total</span>
                        <span className="font-bold text-secondary">${(selectedOrder.subtotal || selectedOrder.total || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-secondary/70">
                        <span>Shipping Fee</span>
                        <span className="font-bold text-secondary">${(selectedOrder.shippingFee || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-red-600">
                        <span>Discount {selectedOrder.discountCode ? `(${selectedOrder.discountCode})` : ''}</span>
                        <span className="font-bold">-${(selectedOrder.discountAmount || 0)}</span>
                      </div>
                      <div className="pt-4 mt-2 border-t border-white/10 flex justify-between items-end text-primary">
                        <span className="text-primary font-semibold mb-1">Final Amount</span>
                        <div className="text-right">
                          <span className="block text-2xl font-black text-primary">${(selectedOrder.total || 0).toFixed(2)}</span>
                          <span className="text-[10px] uppercase tracking-wider text-primary font-bold mt-1 block">Includes Taxes</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}






      {cancelModalOpen && (
        <ModalOverlay onClose={() => !cancelSubmitting && setCancelModalOpen(false)}>
          <div className="bg-white rounded-[24px] p-8 max-w-md w-full shadow-2xl relative select-none">
            <button
              onClick={() => !cancelSubmitting && setCancelModalOpen(false)}
              className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center bg-black/5 hover:bg-red-50 text-secondary hover:text-red-500 rounded-full transition-all"
            >
              ✕
            </button>
            <div className="text-4xl mb-4">⚠️</div>
            <h3 className="text-2xl font-black text-secondary tracking-tight mb-2">Cancel Order</h3>
            <p className="text-sm font-medium text-secondary/60 mb-6 max-w-[90%]">
              Please specify the cancellation reason. An email notification will be sent to the customer immediately.
            </p>

            <div className="space-y-4">
              <textarea
                className="w-full rounded-2xl border-none bg-black/5 p-4 text-sm font-medium focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all mb-4 min-h-[120px] resize-none"
                placeholder="Type your reason here (e.g., Out of stock, Customer requested)..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                disabled={cancelSubmitting}
              />

              <div className="flex gap-3">
                <button
                  onClick={() => setCancelModalOpen(false)}
                  disabled={cancelSubmitting}
                  className="flex-1 bg-black/5 hover:bg-black/10 text-secondary py-3.5 rounded-2xl font-bold transition-all disabled:opacity-50 active:scale-95 text-sm"
                >
                  Keep Order
                </button>
                <button
                  onClick={handleCancelOrder}
                  disabled={cancelSubmitting || !cancelReason.trim()}
                  className="flex-1 bg-red-50 text-red-600 hover:bg-red-100 hover:shadow-lg hover:shadow-red-500/10 py-3.5 rounded-2xl font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2 active:scale-95 text-sm"
                >
                  {cancelSubmitting ? <span className="animate-spin inline-block">⏳</span> : 'Confirm Cancel'}
                </button>
              </div>
            </div>
          </div>
        </ModalOverlay>
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
