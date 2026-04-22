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

export default function AdminCategoriesPage() {
  const router = useRouter();

  const [authChecked, setAuthChecked] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [section, setSection] = useState<AdminSection>("categories");
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
    if (!window.confirm("Are you sure you want to delete this?")) return;
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
    if (!window.confirm("Are you sure you want to delete this?")) return;
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
    if (!window.confirm("Are you sure you want to delete this?")) return;
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
    if (!window.confirm("Are you sure you want to delete this?")) return;
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

      

      

      

      {/* ═══════════════════════ CATEGORIES ═══════════════════════ */}
      {section === "categories" && (
        <div className="space-y-6">
          <Panel title="Category Management">
            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <input
                className="rounded-xl border border-black/5 bg-white px-4 py-3 text-sm"
                placeholder="Search categories..."
                value={categoryQuery}
                onChange={(e) => { setCategoryQuery(e.target.value); setCategoryPage(1); }}
              />
              <button className="btn-primary whitespace-nowrap" onClick={openCreateCategory}>
                + Add Category
              </button>
            </div>
          </Panel>

          <Panel title={`Categories (${filteredCategories.length})`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-black/5 text-secondary/60">
                    <th className="py-3 pr-4">Image</th>
                    <th className="py-3">Name</th>
                    <th className="py-3">Slug</th>
                    <th className="py-3">Description</th>
                    <th className="py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedCategories.map((c) => (
                    <tr key={c._id || c.id} className="border-b border-black/5 transition-colors hover:bg-black/[0.02]">
                      <td className="py-3 pr-4">
                        {c.image ? (
                          <img
                            src={c.image}
                            alt={c.name}
                            className="h-10 w-10 rounded-xl object-cover shadow-sm"
                          />
                        ) : (
                          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-blue-100 to-blue-50 text-xs font-bold text-blue-600">
                            {c.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </td>
                      <td className="py-3 font-semibold text-secondary">{c.name}</td>
                      <td className="py-3 text-secondary/60">{c.slug}</td>
                      <td className="py-3 text-secondary/60">
                        <span className="line-clamp-1 max-w-[200px]">{c.description || "—"}</span>
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            className="inline-flex items-center gap-1 rounded-xl border border-black/5 bg-white px-3 py-1.5 text-xs font-semibold text-secondary shadow-sm transition hover:shadow-md"
                            onClick={() => openEditCategory(c)}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                            Edit
                          </button>
                          <button
                            className="inline-flex items-center gap-1 rounded-xl border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/10"
                            onClick={() => removeCategory(c._id || c.id)}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!pagedCategories.length && (
                    <tr>
                      <td className="py-6 text-center text-secondary/60" colSpan={5}>
                        No categories found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <Pagination
              current={categoryPage}
              total={filteredCategories.length}
              pageSize={categoryPageSize}
              onChange={setCategoryPage}
            />
          </Panel>

          {categoryFormOpen && (
            <ModalOverlay onClose={() => setCategoryFormOpen(false)}>
              <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
                <div className="flex items-center justify-between">
                  <h3 className="font-heading text-xl font-semibold text-secondary">
                    {categoryForm.id ? "Edit Category" : "Create Category"}
                  </h3>
                  <button className="pill" onClick={() => setCategoryFormOpen(false)}>
                    Close
                  </button>
                </div>

                <form className="mt-5 space-y-4" onSubmit={saveCategory}>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-secondary/70">Name *</label>
                    <input
                      className="w-full rounded-xl border border-black/5 bg-white px-4 py-3 text-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      placeholder="e.g. Rackets"
                      value={categoryForm.name}
                      onChange={(e) => {
                        const name = e.target.value;
                        setCategoryForm((p) => ({
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
                      placeholder="e.g. rackets"
                      value={categoryForm.slug}
                      onChange={(e) => setCategoryForm((p) => ({ ...p, slug: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-secondary/70">Image URL</label>
                    <input
                      className="w-full rounded-xl border border-black/5 bg-white px-4 py-3 text-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      placeholder="https://example.com/category-image.png"
                      value={categoryForm.image}
                      onChange={(e) => setCategoryForm((p) => ({ ...p, image: e.target.value }))}
                    />
                    {categoryForm.image && (
                      <div className="mt-2 flex items-center gap-3">
                        <img
                          src={categoryForm.image}
                          alt="Preview"
                          className="h-14 w-14 rounded-xl border border-black/5 object-cover shadow-sm"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                        />
                        <span className="text-xs text-secondary/50">Preview</span>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-secondary/70">Description</label>
                    <textarea
                      className="w-full rounded-xl border border-black/5 bg-white px-4 py-3 text-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      placeholder="Brief description of the category..."
                      rows={3}
                      value={categoryForm.description}
                      onChange={(e) => setCategoryForm((p) => ({ ...p, description: e.target.value }))}
                    />
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      className="btn-outline"
                      onClick={() => setCategoryFormOpen(false)}
                    >
                      Cancel
                    </button>
                    <button className="btn-primary" disabled={categorySaving}>
                      {categorySaving ? "Saving..." : categoryForm.id ? "Update Category" : "Create Category"}
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
