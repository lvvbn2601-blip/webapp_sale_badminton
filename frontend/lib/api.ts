import axios from "axios";
import { Product, Category } from "../types";

export const API_BASE = process.env.NEXT_PUBLIC_API_BASE || process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
const API_ORIGIN = API_BASE.replace(/\/api\/?$/, ""); // e.g. http://localhost:4000

const api = axios.create({
  baseURL: API_BASE,
  timeout: 8000,
});

// ── Image Upload ─────────────────────────────────────
export const uploadImage = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append("image", file);
  const { data } = await api.post("/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: 30000,
  });
  // data.data.url is relative like "/uploads/xxx.jpg"
  return `${API_ORIGIN}${data.data.url}`;
};

export const fetchCategories = async (): Promise<Category[]> => {
  const { data } = await api.get("/categories");
  return data.data;
};

export const fetchProducts = async (params: Record<string, string | number | undefined> = {}) => {
  const { data } = await api.get("/products", { params });
  return data.data as { data: Product[]; total: number };
};

export const fetchProductBySlug = async (slug: string): Promise<Product> => {
  const { data } = await api.get(`/products/slug/${slug}`);
  return data.data as Product;
};

export const fetchTrending = async (): Promise<Product[]> => {
  const { data } = await api.get("/products/trending");
  return data.data as Product[];
};

export const fetchBestSellers = async (): Promise<Product[]> => {
  const { data } = await api.get("/products/best-sellers");
  return data.data as Product[];
};

export const fetchProductById = async (id: string): Promise<Product> => {
  const { data } = await api.get(`/products/${id}`);
  return data.data as Product;
};

// Auth
export const registerUser = async (payload: { name: string; email: string; password: string }) => {
  const { data } = await api.post("/auth/register", payload);
  return data.data as { user: any; accessToken: string; refreshToken: string };
};

export const fetchProfile = async (token: string) => {
  const { data } = await api.get("/users/profile", {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data.data;
};

export const updateProfile = async (payload: Record<string, any>, token: string) => {
  const { data } = await api.put("/users/profile", payload, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data.data;
};

export const loginUser = async (payload: { email: string; password: string }) => {
  const { data } = await api.post("/auth/login", payload);
  return data.data as { user: any; accessToken: string; refreshToken: string };
};

export const logoutUser = async (token: string) => {
  await api.post(
    "/auth/logout",
    {},
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
};

// Admin
export const fetchAdminDashboard = async (token: string) => {
  const { data } = await api.get("/admin/dashboard", {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data.data as { users: number; orders: number; products: number };
};

export const fetchAdminUsers = async (token: string) => {
  const { data } = await api.get("/admin/users", {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data.data as any[];
};

export const fetchAdminOrders = async (token: string) => {
  const { data } = await api.get("/admin/orders", {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data.data as any[];
};

export const fetchAdminProducts = async (token: string) => {
  const { data } = await api.get("/admin/products", {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data.data as Product[];
};

export const fetchAdminRevenue = async (token: string) => {
  const { data } = await api.get("/admin/revenue", {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data.data as { revenue: number };
};

export const updateOrderStatus = async (id: string, status: string, token: string, reason?: string) => {
  const { data } = await api.put(`/orders/${id}/status`, { status, reason }, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data.data;
};

export const fetchUserOrders = async (token: string) => {
  const { data } = await api.get("/orders", {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data.data;
};

export const createOrder = async (payload: { items: any[]; shippingAddress: string; payment?: string; recipientName?: string; recipientPhone?: string; discountCode?: string }, token: string) => {
  const { data } = await api.post("/orders", payload, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data.data;
};

export const cancelUserOrder = async (orderId: string, token: string) => {
  const { data } = await api.post(`/orders/${orderId}/cancel`, {}, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data.data;
};

export const confirmReceipt = async (orderId: string, token: string) => {
  const { data } = await api.post(`/orders/${orderId}/confirm-receipt`, {}, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data.data;
};

export const requestReturn = async (orderId: string, reason: string, token: string) => {
  const { data } = await api.post(`/orders/${orderId}/request-return`, { reason }, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data.data;
};

export const requestRefund = async (orderId: string, reason: string, token: string) => {
  const { data } = await api.post(`/orders/${orderId}/request-refund`, { reason }, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data.data;
};

export const confirmRefund = async (orderId: string, token: string) => {
  const { data } = await api.post(`/orders/${orderId}/confirm-refund`, {}, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data.data;
};

export const rejectRefund = async (orderId: string, reason: string, token: string) => {
  const { data } = await api.post(`/orders/${orderId}/reject-refund`, { reason }, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data.data;
};

export const updateOrderTracking = async (orderId: string, trackingNumber: string, carrier: string, token: string) => {
  const { data } = await api.put(`/orders/${orderId}/tracking`, { trackingNumber, carrier }, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data.data;
};

export const updateStringingStatus = async (orderId: string, stringingStatus: string, token: string) => {
  const { data } = await api.put(`/orders/${orderId}/stringing`, { stringingStatus }, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data.data;
};

export const updateUserRole = async (id: string, role: string, token: string) => {
  const { data } = await api.put(`/users/${id}`, { role }, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data.data;
};

export const updateAdminUser = async (id: string, payload: Record<string, any>, token: string) => {
  const { data } = await api.put(`/users/${id}`, payload, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data.data;
};

export const deleteAdminUser = async (id: string, token: string) => {
  await api.delete(`/users/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
};

export const giveVoucher = async (id: string, token: string) => {
  const { data } = await api.post(`/users/${id}/give-voucher`, {}, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data.data;
};

export const addUserPoints = async (id: string, points: number, token: string) => {
  const { data } = await api.post(`/users/${id}/add-points`, { points }, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data.data;
};

export const deleteAdminProduct = async (id: string, token: string) => {
  await api.delete(`/products/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
};

export const createAdminProduct = async (
  payload: {
    name: string;
    slug: string;
    description: string;
    image?: string;
    basePrice: number;
    category: string;
    brand: string;
    isTrending?: boolean;
    isBestSeller?: boolean;
    discount?: number;
    stock?: number;
    images?: string[];
    status?: string;
  },
  token: string
) => {
  const { data } = await api.post("/products", payload, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data.data as Product;
};

export const updateAdminProduct = async (
  id: string,
  payload: Record<string, any>,
  token: string
) => {
  const { data } = await api.put(`/products/${id}`, payload, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data.data as Product;
};

export const fetchBrands = async () => {
  const { data } = await api.get("/brands");
  return data.data as { _id: string; name: string; slug: string; image?: string; description?: string }[];
};

// Admin Brand CRUD
export const createAdminBrand = async (
  payload: { name: string; slug: string; description?: string; image?: string },
  token: string
) => {
  const { data } = await api.post("/brands", payload, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data.data;
};

export const updateAdminBrand = async (
  id: string,
  payload: Record<string, any>,
  token: string
) => {
  const { data } = await api.put(`/brands/${id}`, payload, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data.data;
};

export const deleteAdminBrand = async (id: string, token: string) => {
  await api.delete(`/brands/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
};

// Admin Category CRUD
export const createAdminCategory = async (
  payload: { name: string; slug: string; description?: string; image?: string },
  token: string
) => {
  const { data } = await api.post("/categories", payload, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data.data;
};

export const updateAdminCategory = async (
  id: string,
  payload: Record<string, any>,
  token: string
) => {
  const { data } = await api.put(`/categories/${id}`, payload, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data.data;
};

export const deleteAdminCategory = async (id: string, token: string) => {
  await api.delete(`/categories/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
};

// ── Cart API (server-persisted, user-linked) ─────────────

export const fetchCart = async (token: string) => {
  const { data } = await api.get("/cart", {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data.data;
};

export const addToServerCart = async (productId: string, quantity: number, token: string, variantOptions?: any) => {
  const { data } = await api.post("/cart/add", { productId, quantity, variantOptions }, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data.data;
};

export const updateServerCartItem = async (productId: string, quantity: number, token: string, variantOptions?: any) => {
  const { data } = await api.put("/cart/update", { productId, quantity, variantOptions }, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data.data;
};

export const removeServerCartItem = async (productId: string, token: string, variantOptions?: any) => {
  const { data } = await api.delete("/cart/remove", {
    headers: { Authorization: `Bearer ${token}` },
    data: { productId, variantOptions },
  });
  return data.data;
};

export const clearServerCart = async (token: string) => {
  const { data } = await api.delete("/cart/clear", {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data.data;
};

export const syncServerCart = async (items: { productId: string; quantity: number, variantOptions?: any }[], token: string) => {
  const { data } = await api.post("/cart/sync", { items }, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data.data;
};

// ── Notifications ────────────────────────────────────

export const fetchNotifications = async (token: string) => {
  const { data } = await api.get("/notifications", {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data.data;
};

export const fetchUnreadNotificationCount = async (token: string) => {
  const { data } = await api.get("/notifications/unread-count", {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data.data as { count: number };
};

export const markNotificationRead = async (id: string, token: string) => {
  const { data } = await api.put(`/notifications/${id}/read`, {}, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data.data;
};

export const markAllNotificationsRead = async (token: string) => {
  const { data } = await api.put("/notifications/read-all", {}, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data.data;
};

// ── Reviews ────────────────────────────────────────────

export const createReview = async (payload: { product: string; rating: number; comment: string; title: string; tags: string[]; images?: string[]; videos?: string[] }, token: string) => {
  const { data } = await api.post("/reviews", payload, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data.data;
};

export const fetchProductReviews = async (productId: string) => {
  const { data } = await api.get(`/reviews/product/${productId}`);
  return data.data;
};

export const fetchFeaturedReviews = async () => {
  const { data } = await api.get("/reviews/featured");
  return data.data;
};

export const fetchUserReviews = async (token: string) => {
  const { data } = await api.get(`/reviews/user/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data.data;
};

export const updateReview = async (reviewId: string, payload: { rating: number; comment: string; title: string; tags: string[]; images?: string[]; videos?: string[] }, token: string) => {
  const { data } = await api.put(`/reviews/${reviewId}`, payload, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data.data;
};

export const markReviewHelpful = async (reviewId: string, token: string) => {
  const { data } = await api.post(`/reviews/${reviewId}/helpful`, {}, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data.data;
};

// ── Admin Reviews ─────────────────────────────────────────────

export const fetchAdminReviews = async (token: string) => {
  const { data } = await api.get("/reviews/admin/all", {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data.data as { reviews: any[]; stats: any };
};

export const updateAdminReviewStatus = async (reviewId: string, status: "approved" | "rejected", token: string) => {
  const { data } = await api.put(`/reviews/admin/${reviewId}/status`, { status }, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data.data;
};

export const adminReplyToReview = async (reviewId: string, adminReply: string, token: string) => {
  const { data } = await api.put(`/reviews/admin/${reviewId}/reply`, { adminReply }, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data.data;
};

export const toggleReviewFeatured = async (reviewId: string, token: string) => {
  const { data } = await api.put(`/reviews/admin/${reviewId}/featured`, {}, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data.data;
};

export const bulkUpdateReviewStatus = async (ids: string[], status: "approved" | "rejected", token: string) => {
  const { data } = await api.post("/reviews/admin/bulk", { ids, status }, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data.data;
};

export const deleteAdminReview = async (reviewId: string, token: string) => {
  await api.delete(`/reviews/admin/${reviewId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
};

export const exportReviewsCsv = async (token: string) => {
  const response = await api.get("/reviews/admin/export-csv", {
    headers: { Authorization: `Bearer ${token}` },
    responseType: "blob",
  });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", "reviews.csv");
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

// ── Settings ────────────────────────────────────────────────

export const fetchSettings = async () => {
  const { data } = await api.get("/settings");
  return data.data;
};

export const updateSettings = async (payload: any, token: string) => {
  const { data } = await api.put("/settings", payload, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data.data;
};

// ── Users/Staff ────────────────────────────────────────────────

export const fetchUsers = async (token: string) => {
  const { data } = await api.get("/users", {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data.data as any[];
};

export const createUser = async (payload: any, token: string) => {
  const { data } = await api.post("/users", payload, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data.data;
};


export const deleteUser = async (userId: string, token: string) => {
  await api.delete(`/users/${userId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
};

// ── Coupons ────────────────────────────────────────────────
export const fetchPublicCoupons = async () => {
  const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const { data } = await api.get("/coupons/public", { headers });
  return data.data;
};

export const fetchAdminCoupons = async (token: string) => {
  const { data } = await api.get("/coupons", {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data.data;
};

export const createAdminCoupon = async (payload: any, token: string) => {
  const { data } = await api.post("/coupons", payload, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data.data;
};

export const updateAdminCoupon = async (id: string, payload: any, token: string) => {
  const { data } = await api.put(`/coupons/${id}`, payload, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data.data;
};

export const updateAdminCouponStatus = async (id: string, status: string, token: string) => {
  const { data } = await api.patch(`/coupons/${id}/status`, { status }, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data.data;
};

export const deleteAdminCoupon = async (id: string, token: string) => {
  await api.delete(`/coupons/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
};

// ── Payment ────────────────────────────────────────────────

export const createVnPayPayment = async (orderId: string, amount: number, token: string) => {
  const { data } = await api.post("/payment/vnpay/create", { orderId, amount }, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data.data as { paymentUrl: string };
};

export const createMoMoPayment = async (orderId: string, amount: number, token: string) => {
  const { data } = await api.post("/payment/momo/create", { orderId, amount }, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data.data as {
    payUrl: string | null;
    qrCodeUrl: string | null;
    deeplink: string | null;
    deeplinkMiniApp: string | null;
    demoMode?: boolean;
  };
};

export const getPaymentStatus = async (orderId: string) => {

  const { data } = await api.get("/payment/status", { params: { orderId } });
  return data.data;
};

export const simulatePayment = async (orderId: string, provider: string, token: string) => {
  const { data } = await api.post("/payment/simulate", { orderId, provider }, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data.data;
};

// ── Tracking Recommendations ──────────────────────────────
export const fetchFrequentlyPurchasedTogether = async (productIds: string[], limit: number = 4) => {
  if (!productIds || productIds.length === 0) return [];
  const { data } = await api.get("/tracking/frequently-purchased", {
    params: { productIds: productIds.join(','), limit }
  });
  return data.recommendations as Product[];
};

// ── Content-Based Similarity ──────────────────────────────
export const fetchSimilarProducts = async (productId: string, limit: number = 6): Promise<{
  source: { id: string; name: string; category: string };
  schema: string;
  products: (Product & { similarityScore?: number })[];
}> => {
  if (!productId) return { source: { id: '', name: '', category: '' }, schema: '', products: [] };
  const { data } = await api.get(`/products/${productId}/similar`, {
    params: { limit }
  });
  return data.data;
};

// ── Wishlist ──────────────────────────────────────────────
export const fetchWishlist = async (token: string) => {
  const { data } = await api.get("/wishlist", {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data.data;
};

export const addToWishlist = async (productId: string, token: string) => {
  const { data } = await api.post("/wishlist/add", { productId }, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data.data;
};

export const removeFromWishlist = async (productId: string, token: string) => {
  const { data } = await api.delete("/wishlist/remove", {
    headers: { Authorization: `Bearer ${token}` },
    data: { productId },
  });
  return data.data;
};

// ── Stringer Module ──────────────────────────────────────────

export const fetchStringers = async (token: string) => {
  const { data } = await api.get("/stringers", {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data.data as any[];
};

export const createStringer = async (payload: any, token: string) => {
  const { data } = await api.post("/stringers", payload, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data.data;
};

export const updateStringerApi = async (id: string, payload: any, token: string) => {
  const { data } = await api.put(`/stringers/${id}`, payload, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data.data;
};

export const deleteStringerApi = async (id: string, token: string) => {
  await api.delete(`/stringers/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
};

export const fetchStringerStats = async (id: string, token: string) => {
  const { data } = await api.get(`/stringers/${id}/stats`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data.data;
};

// ── String Inventory (Spools) ────────────────────────────────

export const fetchStringSpools = async () => {
  const { data } = await api.get("/stringers/spools");
  return data.data as any[];
};

export const createStringSpool = async (payload: any, token: string) => {
  const { data } = await api.post("/stringers/spools", payload, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data.data;
};

export const updateStringSpoolMeters = async (id: string, amount: number, token: string) => {
  const { data } = await api.put(`/stringers/spools/${id}/meters`, { amount }, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data.data;
};

// ── Stringing Tasks ──────────────────────────────────────────

export const fetchStringingTasks = async (token: string, filter?: { status?: string; stringer?: string }) => {
  const { data } = await api.get("/stringers/tasks/all", {
    headers: { Authorization: `Bearer ${token}` },
    params: filter,
  });
  return data.data as any[];
};

export const createStringingTask = async (payload: any, token: string) => {
  const { data } = await api.post("/stringers/tasks", payload, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data.data;
};

export const startStringingTask = async (taskId: string, token: string) => {
  const { data } = await api.put(`/stringers/tasks/${taskId}/start`, {}, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data.data;
};

export const assignStringingTask = async (taskId: string, stringerId: string, token: string) => {
  const { data } = await api.put(`/stringers/tasks/${taskId}/assign`, { stringerId }, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data.data;
};

export const completeStringingTask = async (taskId: string, token: string) => {
  const { data } = await api.put(`/stringers/tasks/${taskId}/complete`, {}, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data.data;
};

export const rateStringingTask = async (taskId: string, rating: number, note: string, token: string) => {
  const { data } = await api.put(`/stringers/tasks/${taskId}/rate`, { rating, note }, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data.data;
};

export const autoAssignTasks = async (token: string) => {
  const { data } = await api.post("/stringers/tasks/auto-assign", {}, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data.data;
};

// ── Performance & Level Up ─────────────────────────────────

export const fetchPerformanceOverview = async (token: string) => {
  const { data } = await api.get("/stringers/performance", {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data.data;
};

export const approveLevelUp = async (id: string, token: string) => {
  const { data } = await api.post(`/stringers/${id}/level-up`, {}, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data.data;
};

// ── Customer Stringing Service ─────────────────────────────

export const bookStringingService = async (payload: any, token: string) => {
  const { data } = await api.post("/stringers/tasks/book", payload, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data.data;
};

export const fetchMyStringingTasks = async (token: string) => {
  const { data } = await api.get("/stringers/tasks/my", {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data.data as any[];
};
