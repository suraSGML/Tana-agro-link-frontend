// ── API client ────────────────────────────────────────────────────────────────
// In dev: Vite proxies /api → localhost:4000
// In production: set VITE_API_URL=https://your-backend.onrender.com in your
// hosting dashboard (Vercel / Netlify environment variables)
const BASE = import.meta.env.VITE_API_URL || "";

const request = async (url, options = {}, token = "") => {
  const headers = { ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${url}`, { ...options, headers });
  const raw = await res.text();
  let data = {};
  if (raw) { try { data = JSON.parse(raw); } catch { data = { message: raw }; } }
  // FIX #18: detect 401 and throw a typed error so callers can handle token expiry
  if (res.status === 401) {
    const err = new Error(data?.message || "Unauthorized");
    err.status = 401;
    throw err;
  }
  if (!res.ok) throw new Error(data?.message || "Request failed");
  return data;
};

export const api = {
  // Auth
  requestOtp:        (phone_number) => request("/api/v1/auth/request-otp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone_number }) }),
  verifyOtp:         (phone_number, otp_code) => request("/api/v1/auth/verify-otp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone_number, otp_code }) }),
  register:          (payload) => request("/api/v1/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }),
  login:             (email, password) => request("/api/v1/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) }),
  getMe:             (token) => request("/api/v1/auth/me", {}, token),
  requestPasswordReset: (email) => request("/api/v1/auth/request-password-reset", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) }),
  resetPassword:     (reset_token, new_password) => request("/api/v1/auth/reset-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reset_token, new_password }) }),

  // Users
  getUsers:          (role, token) => request(`/api/v1/users${role ? `?role=${role}` : ""}`, {}, token),
  getUser:           (userId, token) => request(`/api/v1/users/${userId}`, {}, token),
  updateUser:        (userId, payload, token) => request(`/api/v1/users/${userId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }, token),
  updateProfile:     (userId, payload, token) => request(`/api/v1/users/${userId}/profile`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }, token),

  // Market prices
  getPrices:         () => request("/api/v1/market-prices/today"),
  getPriceHistory:   (commodityId, days = 7) => request(`/api/v1/market-prices/history?commodity_id=${commodityId}&days=${days}`),
  createMarketPrice: (payload, token) => request("/api/v1/market-prices", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }, token),

  // Commodities
  getCommodities:    () => request("/api/v1/commodities"),
  createCommodity:   (payload, token) => request("/api/v1/commodities", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }, token),

  // Listings
  getListings:       (params = {}) => {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== "") q.set(k, v); });
    const qs = q.toString();
    return request(`/api/v1/listings${qs ? `?${qs}` : ""}`);
  },
  getMyListings:     (token, seller_id) => request(`/api/v1/my-listings${seller_id ? `?seller_id=${seller_id}` : ""}`, {}, token),
  getListingById:    (listingId) => request(`/api/v1/listings/${listingId}`),
  createListing:     (payload, token) => request("/api/v1/listings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }, token),
  updateListing:     (listingId, payload, token) => request(`/api/v1/listings/${listingId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }, token),
  createBulkListings:(payload, token) => request("/api/v1/listings/bulk", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }, token),

  // Buy requests
  getBuyRequests:    (params, token) => {
    const q = new URLSearchParams();
    if (params?.buyer_id) q.set("buyer_id", params.buyer_id);
    if (params?.status) q.set("status", params.status);
    return request(`/api/v1/buy-requests${q.toString() ? `?${q}` : ""}`, {}, token);
  },
  createBuyRequest:  (payload, token) => request("/api/v1/buy-requests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }, token),
  cancelBuyRequest:  (requestId, token) => request(`/api/v1/buy-requests/${requestId}/cancel`, { method: "PATCH" }, token),
  getRequestMatches: (requestId, token) => request(`/api/v1/buy-requests/${requestId}/matches`, {}, token),
  runMatch:          (buyRequestId, token) => request("/api/v1/matches/run", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ buy_request_id: buyRequestId }) }, token),

  // Orders
  getRecentOrders:   () => request("/api/v1/orders/recent"),
  getOrders:         (params, token) => {
    const q = new URLSearchParams();
    if (params?.buyerId) q.set("buyer_id", params.buyerId);
    if (params?.sellerId) q.set("seller_id", params.sellerId);
    return request(`/api/v1/orders${q.toString() ? `?${q}` : ""}`, {}, token);
  },
  getOrderDetail:    (orderId, token) => request(`/api/v1/orders/${orderId}/detail`, {}, token),
  getOrderMessages:  (orderId, token) => request(`/api/v1/orders/${orderId}/messages`, {}, token),
  sendOrderMessage:  (orderId, message, token) => request(`/api/v1/orders/${orderId}/messages`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message }) }, token),
  updateOrderStatus: (orderId, status, token, note) => request(`/api/v1/orders/${orderId}/status`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status, note }) }, token),
  getOrderHistory:   (orderId, token) => request(`/api/v1/orders/${orderId}/history`, {}, token),
  getOrderPayments:  (orderId, token) => request(`/api/v1/orders/${orderId}/payments`, {}, token),
  payOrder:          (orderId, payload, token) => request(`/api/v1/orders/${orderId}/pay`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }, token),

  // Notifications
  getNotifications:      (token) => request("/api/v1/notifications", {}, token),
  getUnreadCount:        (token) => request("/api/v1/notifications/unread-count", {}, token),
  markNotifRead:         (id, token) => request(`/api/v1/notifications/${id}/read`, { method: "PATCH" }, token),
  markAllNotifsRead:     (token) => request("/api/v1/notifications/read-all", { method: "PATCH" }, token),

  // Reviews
  createReview:      (payload, token) => request("/api/v1/reviews", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }, token),
  getReviews:        (params) => {
    const q = new URLSearchParams();
    if (params?.user_id) q.set("user_id", params.user_id);
    if (params?.order_id) q.set("order_id", params.order_id);
    return request(`/api/v1/reviews${q.toString() ? `?${q}` : ""}`);
  },

  // Logistics
  getLogistics:      () => request("/api/v1/logistics"),
  createLogistics:   (payload, token) => request("/api/v1/logistics", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }, token),
  updateLogistics:   (id, payload, token) => request(`/api/v1/logistics/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }, token),
  deleteLogistics:   (id, token) => request(`/api/v1/logistics/${id}`, { method: "DELETE" }, token),

  // Resources
  getResources:      () => request("/api/v1/farmer-resources"),

  // Health
  checkHealth:       () => request("/api/v1/health"),
};
