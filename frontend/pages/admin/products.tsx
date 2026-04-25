import { confirmAction } from "../../components/ConfirmModal";
import Head from "next/head";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState, useCallback } from "react";
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
  createdAt: string;
};

type ProductForm = {
  id?: string;
  name: string;
  slug: string;
  description: string;
  images: string[];
  category: string;
  brand: string;
  basePrice: string; // Used as Selling Price
  purchasePrice: string;
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

export default function AdminProductsPage() {
  const router = useRouter();

  const [authChecked, setAuthChecked] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [section, setSection] = useState<AdminSection>("products");
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

  // Product management state
  const [productQuery, setProductQuery] = useState("");
  const [productCategory, setProductCategory] = useState("all");
  const [productBrand, setProductBrand] = useState("all");
  const [productStock, setProductStock] = useState("all"); // all | in-stock | low-stock | out-of-stock
  const [page, setPage] = useState(1);
  const pageSize = 8;

  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [productForm, setProductForm] = useState<ProductForm>({
    name: "",
    slug: "",
    description: "",
    images: [],
    category: "",
    brand: "",
    basePrice: "",
    purchasePrice: "",
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
        } catch {}
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

  // ─── Product inventory metrics ───────────────────────────────────
  const inventoryMetrics = useMemo(() => {
    const total = products.length;
    const selling = products.filter((p: any) => Number(p.stock ?? 0) > 10 && (p.status || "active") === "active").length;
    const lowStock = products.filter((p: any) => {
      const s = Number(p.stock ?? 0);
      return s > 0 && s <= 10;
    }).length;
    const outOfStock = products.filter((p: any) => Number(p.stock ?? 0) === 0).length;
    return { total, selling, lowStock, outOfStock };
  }, [products]);

  // ─── Product helpers ─────────────────────────────────────────────
  const filteredProducts = useMemo(() => {
    const q = productQuery.trim().toLowerCase();
    return products.filter((p: any) => {
      const cat = String(p.category?.slug || p.category?.name || p.category || "").toLowerCase();
      const brand = String(p.brand?.name || p.brand || "").toLowerCase();
      const stock = Number(p.stock ?? 0);
      const matchesQ = !q || p.name.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q);
      const matchesCat = productCategory === "all" || cat === productCategory;
      const matchesBrand = productBrand === "all" || brand === productBrand;
      let matchesStock = true;
      if (productStock === "in-stock") matchesStock = stock > 10;
      else if (productStock === "low-stock") matchesStock = stock > 0 && stock <= 10;
      else if (productStock === "out-of-stock") matchesStock = stock === 0;
      return matchesQ && matchesCat && matchesBrand && matchesStock;
    });
  }, [products, productBrand, productCategory, productQuery, productStock]);

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
      images: [],
      category: "",
      brand: "",
      basePrice: "",
      purchasePrice: "",
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
    // Build images array: prefer `images` field, fall back to single `image`
    let existingImages: string[] = [];
    if (Array.isArray(p.images) && p.images.length > 0) {
      existingImages = p.images.filter(Boolean);
    } else if (p.image) {
      existingImages = [p.image];
    }
    setProductForm({
      id,
      name: p.name || "",
      slug: p.slug || "",
      description: p.description || "",
      images: existingImages,
      category: String(p.category?._id || p.category || ""),
      brand: String(p.brand?._id || p.brand || ""),
      basePrice: String(p.basePrice ?? p.price ?? ""),
      purchasePrice: String(p.purchasePrice ?? ""),
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
        image: productForm.images[0] || undefined,
        images: productForm.images.filter(Boolean),
        basePrice: Number(productForm.basePrice || 0),
        purchasePrice: Number(productForm.purchasePrice || 0),
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

      

      {/* ═══════════════════════ PRODUCTS ═══════════════════════ */}
      {section === "products" && (
        <div className="space-y-6">
          {/* ── Inventory Metric Cards ── */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <InventoryMetricCard
              label="Total Products"
              value={inventoryMetrics.total}
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                  <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                  <line x1="12" y1="22.08" x2="12" y2="12" />
                </svg>
              }
              color="bg-blue-50 text-blue-600"
              iconBg="bg-blue-100"
            />
            <InventoryMetricCard
              label="Currently Selling"
              value={inventoryMetrics.selling}
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                  <polyline points="17 6 23 6 23 12" />
                </svg>
              }
              color="bg-emerald-50 text-emerald-600"
              iconBg="bg-emerald-100"
            />
            <InventoryMetricCard
              label="Low Stock (≤10)"
              value={inventoryMetrics.lowStock}
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              }
              color="bg-amber-50 text-amber-600"
              iconBg="bg-amber-100"
              highlight={inventoryMetrics.lowStock > 0}
            />
            <InventoryMetricCard
              label="Out of Stock"
              value={inventoryMetrics.outOfStock}
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                </svg>
              }
              color="bg-red-50 text-red-600"
              iconBg="bg-red-100"
              highlight={inventoryMetrics.outOfStock > 0}
            />
          </div>

          {/* ── Category Tabs ── */}
          <div className="rounded-2xl border border-black/5 bg-white shadow-sm overflow-hidden">
            <div className="flex border-b border-black/5 overflow-x-auto">
              <button
                onClick={() => { setProductCategory("all"); setPage(1); }}
                className={`flex items-center gap-2 whitespace-nowrap px-5 py-3.5 text-sm font-semibold transition-all border-b-2 ${
                  productCategory === "all"
                    ? "text-secondary border-secondary"
                    : "text-secondary/50 border-transparent hover:text-secondary/80 hover:bg-gray-50"
                }`}
              >
                All
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                    productCategory === "all"
                      ? "bg-secondary text-white"
                      : "bg-gray-100 text-secondary/60"
                  }`}
                >
                  {products.length}
                </span>
              </button>
              {categories.map((c) => {
                const catSlug = c.slug;
                const count = products.filter((p: any) => {
                  const pCat = String(p.category?.slug || p.category?.name || p.category || "").toLowerCase();
                  return pCat === catSlug;
                }).length;
                return (
                  <button
                    key={c._id || c.id || c.slug}
                    onClick={() => { setProductCategory(catSlug); setPage(1); }}
                    className={`flex items-center gap-2 whitespace-nowrap px-5 py-3.5 text-sm font-semibold transition-all border-b-2 ${
                      productCategory === catSlug
                        ? "text-primary border-primary"
                        : "text-secondary/50 border-transparent hover:text-secondary/80 hover:bg-gray-50"
                    }`}
                  >
                    {c.name}
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                        productCategory === catSlug
                          ? "bg-primary text-white"
                          : "bg-gray-100 text-secondary/60"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Search + Brand + Stock filter + Add button */}
            <div className="flex flex-wrap items-center gap-3 px-5 py-4">
              <div className="relative flex-1 min-w-[200px]">
                <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary/40" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  className="w-full rounded-xl border border-black/5 bg-gray-50 py-2.5 pl-10 pr-4 text-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="Search products..."
                  value={productQuery}
                  onChange={(e) => { setProductQuery(e.target.value); setPage(1); }}
                />
              </div>
              <select
                className="rounded-xl border border-black/5 bg-white px-4 py-2.5 text-sm font-medium shadow-sm"
                value={productBrand}
                onChange={(e) => { setProductBrand(e.target.value); setPage(1); }}
              >
                <option value="all">All Brands</option>
                {brands?.map((b) => (
                  <option key={b._id || b.id} value={b.name.toLowerCase()}>
                    {b.name}
                  </option>
                ))}
              </select>
              <select
                className={`rounded-xl border px-4 py-2.5 text-sm font-medium shadow-sm ${
                  productStock === "out-of-stock"
                    ? "border-red-200 bg-red-50 text-red-700"
                    : productStock === "low-stock"
                      ? "border-amber-200 bg-amber-50 text-amber-700"
                      : "border-black/5 bg-white"
                }`}
                value={productStock}
                onChange={(e) => { setProductStock(e.target.value); setPage(1); }}
              >
                <option value="all">All Inventory</option>
                <option value="in-stock">In Stock (&gt;10)</option>
                <option value="low-stock">Low Stock (≤10)</option>
                <option value="out-of-stock">Out of Stock</option>
              </select>
              <button className="btn-primary whitespace-nowrap" onClick={openCreate}>
                + Add Product
              </button>
            </div>
          </div>

          <Panel title={`Products (${filteredProducts.length})`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-black/5 text-secondary/60">
                    <th className="py-3 pr-4">Image</th>
                    <th className="py-3">Name</th>
                    <th className="py-3">Category</th>
                    <th className="py-3">Brand</th>
                    <th className="py-3">Price</th>
                    <th className="py-3">Stock</th>
                    <th className="py-3">Status</th>
                    <th className="py-3">Trending</th>
                    <th className="py-3">Best seller</th>
                    <th className="py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedProducts.map((p: any) => (
                    <tr key={p._id || p.id} className="border-b border-black/5 transition-colors hover:bg-black/[0.02]">
                      <td className="py-3 pr-4">
                        {p.image ? (
                          <img
                            src={p.image}
                            alt={p.name}
                            className="h-10 w-10 rounded-xl object-cover shadow-sm"
                          />
                        ) : (
                          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-green-100 to-green-50 text-xs font-bold text-green-600">
                            {(p.name || "P").charAt(0).toUpperCase()}
                          </div>
                        )}
                      </td>
                      <td className="py-3 font-semibold text-secondary">
                        <div>
                          <p className="line-clamp-2 max-w-16">{p.name}</p>
                        </div>
                      </td>
                      <td className="py-3 text-secondary/60">{String(p.category?.name || p.category || "—")}</td>
                      <td className="py-3 text-secondary/60">{String(p.brand?.name || p.brand || "—")}</td>
                      <td className="py-3 font-semibold">${Number(p.basePrice ?? p.price ?? 0).toFixed(2)}</td>
                      <td className="py-3">
                        <div className="flex flex-col gap-1">
                          <span className="text-sm font-semibold text-secondary">{Number(p.stock ?? 0)}</span>

                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-1.5">
                          {Number(p.stock ?? 0) === 0 ? (
                            <span className="inline-block rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-600">Out of stock</span>
                          ) : p.status === "draft" ? (
                            <span className="inline-block rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-semibold text-yellow-700">Draft</span>
                          ) : p.status === "inactive" ? (
                            <span className="inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-500">Inactive</span>
                          ) : (
                            <span className="inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-600">Active</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3">
                        {p.isTrending ? (
                          <span className="inline-block rounded-full bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-600">Yes</span>
                        ) : (
                          <span className="text-secondary/30">No</span>
                        )}
                      </td>
                      <td className="py-3">
                        {p.isBestSeller ? (
                          <span className="inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-600">Yes</span>
                        ) : (
                          <span className="text-secondary/30">No</span>
                        )}
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            className="inline-flex items-center gap-1 rounded-xl border border-black/5 bg-white px-3 py-1.5 text-xs font-semibold text-secondary shadow-sm transition hover:shadow-md"
                            onClick={() => openEdit(p)}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                            Edit
                          </button>
                          <button
                            className="inline-flex items-center gap-1 rounded-xl border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/10"
                            onClick={() => removeProduct(p._id || p.id)}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!pagedProducts.length && (
                    <tr>
                      <td className="py-6 text-center text-secondary/60" colSpan={9}>
                        No products found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <Pagination
              current={page}
              total={filteredProducts.length}
              pageSize={pageSize}
              onChange={setPage}
            />
          </Panel>

          {formOpen && (
            <ModalOverlay onClose={() => setFormOpen(false)}>
              <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between">
                  <h3 className="font-heading text-xl font-semibold text-secondary">
                    {productForm.id ? "Edit Product" : "Create Product"}
                  </h3>
                  <button className="pill" onClick={() => setFormOpen(false)}>
                    Close
                  </button>
                </div>

                {productFormError && (
                  <div className="mt-3 rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-primary">
                    {productFormError}
                  </div>
                )}

                <form className="mt-5 space-y-4" onSubmit={saveProduct}>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-secondary/70">Name *</label>
                      <input
                        className="w-full rounded-xl border border-black/5 bg-white px-4 py-3 text-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                        placeholder="e.g. Yonex Astrox 88D Pro"
                        value={productForm.name}
                        onChange={(e) => {
                          const name = e.target.value;
                          setProductForm((p) => ({
                            ...p,
                            name,
                            slug: p.id ? p.slug : autoSlug(name),
                          }));
                        }}
                        required
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-secondary/70">Slug *</label>
                      <input
                        className="w-full rounded-xl border border-black/5 bg-white px-4 py-3 text-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                        placeholder="e.g. yonex-astrox-88d-pro"
                        value={productForm.slug}
                        onChange={(e) => setProductForm((p) => ({ ...p, slug: e.target.value }))}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-secondary/70">Category *</label>
                      <select
                        className="w-full rounded-xl border border-black/5 bg-white px-4 py-3 text-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                        value={productForm.category}
                        onChange={(e) => setProductForm((p) => ({ ...p, category: e.target.value }))}
                        required
                      >
                        <option value="">Select category...</option>
                        {categories.map((c: any) => (
                          <option key={c._id || c.id} value={c._id || c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-secondary/70">Brand *</label>
                      <select
                        className="w-full rounded-xl border border-black/5 bg-white px-4 py-3 text-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                        value={productForm.brand}
                        onChange={(e) => setProductForm((p) => ({ ...p, brand: e.target.value }))}
                        required
                      >
                        <option value="">Select brand...</option>
                        {brands.map((b: any) => (
                          <option key={b._id || b.id} value={b._id || b.id}>
                            {b.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-4">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-secondary/70">Purchase Price *</label>
                      <input
                        className="w-full rounded-xl border border-black/5 bg-white px-4 py-3 text-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                        placeholder="0.00"
                        type="number"
                        step="0.01"
                        min="0"
                        value={productForm.purchasePrice}
                        onChange={(e) => setProductForm((p) => ({ ...p, purchasePrice: e.target.value }))}
                        required
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-secondary/70">Selling Price *</label>
                      <input
                        className="w-full rounded-xl border border-black/5 bg-white px-4 py-3 text-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                        placeholder="0.00"
                        type="number"
                        step="0.01"
                        min="0"
                        value={productForm.basePrice}
                        onChange={(e) => setProductForm((p) => ({ ...p, basePrice: e.target.value }))}
                        required
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-secondary/70">Stock Quantity</label>
                      <input
                        className="w-full rounded-xl border border-black/5 bg-white px-4 py-3 text-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                        placeholder="0"
                        type="number"
                        min="0"
                        step="1"
                        value={productForm.stock}
                        onChange={(e) => setProductForm((p) => ({ ...p, stock: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-secondary/70">Status</label>
                      <select
                        className="w-full rounded-xl border border-black/5 bg-white px-4 py-3 text-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                        value={productForm.status}
                        onChange={(e) => setProductForm((p) => ({ ...p, status: e.target.value }))}
                      >
                        <option value="active">Active</option>
                        <option value="draft">Draft</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-secondary/70">
                      Product Images
                      <span className="ml-1 text-[10px] font-normal text-secondary/40">({productForm.images.length} uploaded{productForm.images.length > 0 ? " • first image = thumbnail" : ""})</span>
                    </label>

                    {/* Existing image gallery */}
                    {productForm.images.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-3">
                        {productForm.images.map((imgUrl, idx) => (
                          <div key={idx} className="group relative">
                            <img
                              src={imgUrl}
                              alt={`Product ${idx + 1}`}
                              className={`h-28 w-28 rounded-2xl border-2 object-cover shadow-sm transition ${
                                idx === 0
                                  ? "border-primary ring-2 ring-primary/20"
                                  : "border-black/5 hover:border-primary/30"
                              }`}
                              onError={(e) => { (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect fill='%23f3f4f6' width='100' height='100'/%3E%3Ctext fill='%239ca3af' x='50' y='55' text-anchor='middle' font-size='12'%3ENo image%3C/text%3E%3C/svg%3E"; }}
                            />
                            {idx === 0 && (
                              <span className="absolute -left-1 -top-1 rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-bold text-white shadow">
                                Main
                              </span>
                            )}
                            {/* Remove button */}
                            <button
                              type="button"
                              onClick={() => setProductForm((p) => ({ ...p, images: p.images.filter((_, i) => i !== idx) }))}
                              className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-red-500 text-[10px] text-white shadow-md transition hover:bg-red-600 opacity-0 group-hover:opacity-100"
                            >
                              ✕
                            </button>
                            {/* Reorder buttons */}
                            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5 opacity-0 group-hover:opacity-100 transition">
                              {idx > 0 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setProductForm((p) => {
                                      const imgs = [...p.images];
                                      [imgs[idx - 1], imgs[idx]] = [imgs[idx], imgs[idx - 1]];
                                      return { ...p, images: imgs };
                                    });
                                  }}
                                  className="grid h-5 w-5 place-items-center rounded-full bg-white/90 text-[10px] text-secondary shadow-sm border border-black/10 hover:bg-primary hover:text-white transition"
                                  title="Move left"
                                >
                                  ◀
                                </button>
                              )}
                              {idx < productForm.images.length - 1 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setProductForm((p) => {
                                      const imgs = [...p.images];
                                      [imgs[idx], imgs[idx + 1]] = [imgs[idx + 1], imgs[idx]];
                                      return { ...p, images: imgs };
                                    });
                                  }}
                                  className="grid h-5 w-5 place-items-center rounded-full bg-white/90 text-[10px] text-secondary shadow-sm border border-black/10 hover:bg-primary hover:text-white transition"
                                  title="Move right"
                                >
                                  ▶
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Drop-zone for adding more images */}
                    <label
                      className="group mt-3 flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-black/10 bg-gray-50 px-6 py-6 transition hover:border-primary/30 hover:bg-primary/5"
                      onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("border-primary", "bg-primary/5"); }}
                      onDragLeave={(e) => { e.currentTarget.classList.remove("border-primary", "bg-primary/5"); }}
                      onDrop={async (e) => {
                        e.preventDefault();
                        e.currentTarget.classList.remove("border-primary", "bg-primary/5");
                        const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith("image/"));
                        if (!files.length) return;
                        try {
                          setSaving(true);
                          const urls = await Promise.all(files.map(f => uploadImage(f)));
                          setProductForm((p) => ({ ...p, images: [...p.images, ...urls] }));
                        } catch (err: any) {
                          setProductFormError("Image upload failed: " + (err?.message || "Unknown error"));
                        } finally {
                          setSaving(false);
                        }
                      }}
                    >
                      <div className="grid h-10 w-10 place-items-center rounded-full bg-white text-secondary/30 shadow-sm group-hover:text-primary">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                      </div>
                      <span className="text-sm font-semibold text-secondary/60 group-hover:text-primary">
                        {productForm.images.length === 0 ? "Drop images here or click to browse" : "+ Add more images"}
                      </span>
                      <span className="text-xs text-secondary/40">JPG, PNG, WebP, GIF • Max 10MB each • Select multiple files</span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={async (e) => {
                          const files = Array.from(e.target.files || []);
                          if (!files.length) return;
                          try {
                            setSaving(true);
                            const urls = await Promise.all(files.map(f => uploadImage(f)));
                            setProductForm((p) => ({ ...p, images: [...p.images, ...urls] }));
                          } catch (err: any) {
                            setProductFormError("Image upload failed: " + (err?.message || "Unknown error"));
                          } finally {
                            setSaving(false);
                            e.target.value = "";
                          }
                        }}
                      />
                    </label>

                    {/* Paste URL fallback */}
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-[10px] text-secondary/30">or paste URL:</span>
                      <input
                        className="flex-1 rounded-lg border border-black/5 bg-white px-3 py-1.5 text-xs transition focus:border-primary focus:outline-none"
                        placeholder="https://example.com/image.jpg"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            const val = (e.target as HTMLInputElement).value.trim();
                            if (val) {
                              setProductForm((p) => ({ ...p, images: [...p.images, val] }));
                              (e.target as HTMLInputElement).value = "";
                            }
                          }
                        }}
                      />
                      <button
                        type="button"
                        className="rounded-lg border border-black/10 bg-white px-2.5 py-1.5 text-xs font-semibold text-secondary transition hover:bg-primary/5 hover:border-primary/20 hover:text-primary"
                        onClick={(e) => {
                          const input = (e.currentTarget.previousElementSibling as HTMLInputElement);
                          const val = input?.value?.trim();
                          if (val) {
                            setProductForm((p) => ({ ...p, images: [...p.images, val] }));
                            input.value = "";
                          }
                        }}
                      >
                        Add
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-6">
                    <label className="flex cursor-pointer items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-black/10 text-primary accent-primary"
                        checked={productForm.isTrending}
                        onChange={(e) => setProductForm((p) => ({ ...p, isTrending: e.target.checked }))}
                      />
                      <span className="font-medium">Trending</span>
                    </label>
                    <label className="flex cursor-pointer items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-black/10 text-primary accent-primary"
                        checked={productForm.isBestSeller}
                        onChange={(e) => setProductForm((p) => ({ ...p, isBestSeller: e.target.checked }))}
                      />
                      <span className="font-medium">Best seller</span>
                    </label>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-secondary/70">Description *</label>
                    <textarea
                      className="w-full rounded-xl border border-black/5 bg-white px-4 py-3 text-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      placeholder="Detailed product description..."
                      rows={4}
                      value={productForm.description}
                      onChange={(e) => setProductForm((p) => ({ ...p, description: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="mt-4 border-t border-black/5 pt-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h4 className="mb-1 text-sm font-semibold text-secondary">Product Specifications & Filters</h4>
                        <p className="text-xs text-secondary/60">
                          Choose recommended spec keys for the selected category or type a custom field. Then enter the matching value manually.
                        </p>
                      </div>
                      <button
                        type="button"
                        className="btn-outline whitespace-nowrap"
                        onClick={() => setProductForm(p => ({ ...p, specs: [...p.specs, { key: "", value: "" }] }))}
                      >
                        + Add Spec
                      </button>
                    </div>

                    {availableSpecKeys.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {availableSpecKeys.map((key) => (
                          <button
                            type="button"
                            key={key}
                            className="rounded-full border border-black/10 bg-gray-50 px-3 py-1.5 text-xs font-semibold text-secondary transition hover:border-primary hover:bg-primary/10"
                            onClick={() => setProductForm((p) => ({ ...p, specs: [...p.specs, { key, value: "" }] }))}
                          >
                            {key}
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="mt-4 space-y-2">
                      {productForm.specs.length === 0 && (
                        <div className="rounded-2xl border border-black/5 bg-gray-50 px-4 py-3 text-sm text-secondary/70">
                          No specs added yet. Use the suggestions above or click Add Spec to start.
                        </div>
                      )}

                      {productForm.specs.map((spec, i) => (
                        <div key={i} className="grid gap-2 sm:grid-cols-[1.4fr_1.4fr_auto]">
                          <div>
                            <input
                              list="product-spec-keys"
                              className="w-full rounded-lg border border-black/5 bg-gray-50 px-3 py-2 text-sm text-secondary placeholder:text-secondary/40 focus:border-primary focus:bg-white focus:outline-none"
                              placeholder="Spec Name or choose suggested key"
                              value={spec.key}
                              onChange={(e) => {
                                const newSpecs = [...productForm.specs];
                                newSpecs[i].key = e.target.value;
                                setProductForm((p) => ({ ...p, specs: newSpecs }));
                              }}
                            />
                            <datalist id="product-spec-keys">
                              {availableSpecKeys.map((key) => (
                                <option key={key} value={key} />
                              ))}
                            </datalist>
                          </div>
                          <input
                            className="w-full rounded-lg border border-black/5 bg-gray-50 px-3 py-2 text-sm text-secondary placeholder:text-secondary/40 focus:border-primary focus:bg-white focus:outline-none"
                            placeholder="Value"
                            value={spec.value}
                            onChange={(e) => {
                              const newSpecs = [...productForm.specs];
                              newSpecs[i].value = e.target.value;
                              setProductForm((p) => ({ ...p, specs: newSpecs }));
                            }}
                          />
                          <button
                            type="button"
                            className="flex h-9 w-9 items-center justify-center rounded-lg border border-red-500/20 text-red-500 transition hover:bg-red-50"
                            onClick={() => {
                              const newSpecs = [...productForm.specs];
                              newSpecs.splice(i, 1);
                              setProductForm((p) => ({ ...p, specs: newSpecs }));
                            }}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18" /><path d="M6 6l12 12" /></svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-black/5 pt-4">
                    <label className="mb-1 block text-xs font-semibold text-secondary/70">Badges</label>
                    <input
                      className="w-full rounded-xl border border-black/5 bg-white px-4 py-3 text-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      placeholder="e.g. Authentic, Best Seller, New, Sale"
                      value={productForm.badges}
                      onChange={(e) => setProductForm(p => ({ ...p, badges: e.target.value }))}
                    />
                    <p className="mt-1 text-[10px] text-secondary/50">Comma-separated tags to display as colorful badges on the product card.</p>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      className="btn-outline"
                      onClick={() => setFormOpen(false)}
                    >
                      Cancel
                    </button>
                    <button className="btn-primary" disabled={saving}>
                      {saving ? "Saving..." : productForm.id ? "Update Product" : "Create Product"}
                    </button>
                  </div>
                </form>
              </div>
            </ModalOverlay>
          )}
        </div>
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
  
  let profitThisMonth = 0;
  ordersThisMonth.forEach((o) => {
    (o.items || []).forEach((item: any) => {
      const sellPrice = Number(item.price || 0);
      const buyPrice = Number(item.product?.purchasePrice || 0);
      profitThisMonth += (sellPrice - buyPrice) * Number(item.quantity || 1);
    });
  });

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

function InventoryMetricCard({
  label,
  value,
  icon,
  color,
  iconBg,
  highlight,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  iconBg: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border p-5 shadow-sm transition hover:shadow-md ${
        highlight
          ? color.includes("red")
            ? "border-red-200 bg-gradient-to-br from-red-50 to-white"
            : "border-amber-200 bg-gradient-to-br from-amber-50 to-white"
          : "border-black/5 bg-white"
      }`}
    >
      {highlight && (
        <div
          className={`absolute top-0 right-0 h-16 w-16 rounded-bl-full ${
            color.includes("red") ? "bg-red-200/30" : "bg-amber-200/30"
          }`}
        />
      )}
      <div className={`mb-3 grid h-10 w-10 place-items-center rounded-xl ${iconBg} ${color}`}>
        {icon}
      </div>
      <p className="text-xs font-semibold text-secondary/60 uppercase tracking-wider">{label}</p>
      <p className={`mt-1 font-heading text-2xl font-bold ${color.split(" ")[1] || "text-secondary"}`}>
        {value}
      </p>
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
