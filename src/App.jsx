import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "./api.js";
import Sidebar from "./components/Sidebar.jsx";
import Topbar from "./components/Topbar.jsx";
import ToastStack from "./components/ToastStack.jsx";
import AuthModal from "./components/AuthModal.jsx";
import MarketplacePage from "./components/pages/MarketplacePage.jsx";
import HomePage from "./components/pages/HomePage.jsx";
import BuyerPage from "./components/pages/BuyerPage.jsx";
import SellerPage from "./components/pages/SellerPage.jsx";
import OrdersPage from "./components/pages/OrdersPage.jsx";
import ServicesPage from "./components/pages/ServicesPage.jsx";
import AdminPage from "./components/pages/AdminPage.jsx";
import ProfilePage from "./components/pages/ProfilePage.jsx";

export default function App() {
  const [tab, setTab] = useState("home");
  const [language, setLanguage] = useState("en");
  const [prices, setPrices] = useState([]);
  const [commodities, setCommodities] = useState([]);

  const [buyers, setBuyers] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [listings, setListings] = useState([]);
  const [logistics, setLogistics] = useState([]);
  const [resources, setResources] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [cart, setCart] = useState([]);
  const [myOrders, setMyOrders] = useState([]);           // FIX #4: own orders
  const [buyerOrders, setBuyerOrders] = useState([]);
  const [sellerOrders, setSellerOrders] = useState([]);
  const [activeAccountId, setActiveAccountId] = useState("");
  const [activeRole, setActiveRole] = useState("buyer");
  const [toasts, setToasts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);  // FIX #19: mobile sidebar
  const [notifications, setNotifications] = useState([]); // FIX #6
  const [unreadCount, setUnreadCount] = useState(0);       // FIX #6
  const [healthOk, setHealthOk] = useState(true);          // FIX #20
  const [token, setToken] = useState(localStorage.getItem("tal_token") || "");
  const [authUser, setAuthUser] = useState(() => {
    const raw = localStorage.getItem("tal_user");
    return raw ? JSON.parse(raw) : null;
  });
  const [shortlist, setShortlist] = useState(() =>
    JSON.parse(localStorage.getItem("tal_shortlist") || "[]")
  );

  const notify = useCallback((message, type = "info") => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);

  // FIX #18: handle 401 globally — clear token and prompt re-login
  const handleApiError = useCallback((err) => {
    if (err?.status === 401) {
      setToken("");
      setAuthUser(null);
      localStorage.removeItem("tal_token");
      localStorage.removeItem("tal_user");
      setShowAuth(true);
      notify("Session expired. Please sign in again.", "error");
    } else {
      notify(err.message, "error");
    }
  }, [notify]);

  // FIX #20: health check on mount
  useEffect(() => {
    api.checkHealth()
      .then(() => setHealthOk(true))
      .catch(() => setHealthOk(false));
  }, []);

  // Main data load
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [p, c, l, lg, rs, ro] = await Promise.all([
          api.getPrices(),
          api.getCommodities(),
          api.getListings(),
          api.getLogistics(),
          api.getResources(),
          api.getRecentOrders(),
        ]);
        setPrices(p);
        setCommodities(c);
        setListings(l);
        setLogistics(lg);
        setResources(rs);
        setRecentOrders(ro);

        if (token) {
          const [b, s, u] = await Promise.all([
            api.getUsers("buyer", token),
            api.getUsers("seller", token),
            api.getUsers("", token),
          ]);
          setBuyers(b);
          setSellers(s);
          setAllUsers(u);
        }
      } catch (err) {
        handleApiError(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token, handleApiError]);

  // FIX #4: auto-load own orders when logged in, and auto-set activeAccountId
  useEffect(() => {
    if (!token || !authUser) return;
    setActiveAccountId(authUser.id);
    api.getOrders({}, token)
      .then(setMyOrders)
      .catch(() => {});
  }, [token, authUser]);

  // FIX #6: load notifications when logged in
  useEffect(() => {
    if (!token) { setNotifications([]); setUnreadCount(0); return; }
    const loadNotifs = () => {
      api.getNotifications(token).then(setNotifications).catch(() => {});
      api.getUnreadCount(token).then((d) => setUnreadCount(d.count)).catch(() => {});
    };
    loadNotifs();
    const interval = setInterval(loadNotifs, 30000); // poll every 30s
    return () => clearInterval(interval);
  }, [token]);

  useEffect(() => {
    localStorage.setItem("tal_shortlist", JSON.stringify(shortlist));
  }, [shortlist]);

  const role = authUser?.role || null;
  const visibleTabs = useMemo(() => {
    if (!role) return ["home", "store"];
    if (role === "buyer") return ["home", "store", "buyer", "orders", "profile"];
    if (role === "seller") return ["home", "store", "seller", "orders", "profile"];
    if (role === "field_agent") return ["home", "store", "seller", "services", "orders", "profile"];
    if (role === "admin") return ["home", "store", "buyer", "seller", "services", "orders", "admin", "profile"];
    return ["home", "store"];
  }, [role]);

  useEffect(() => {
    if (!visibleTabs.includes(tab)) setTab(visibleTabs[0]);
  }, [tab, visibleTabs]);

  const refreshListings = useCallback(async (params = {}) => {
    try {
      const data = await api.getListings(params);
      setListings(data);
    } catch (err) { handleApiError(err); }
  }, [handleApiError]);

  // Expose setPrices for AdminPage after price update
  // (already in sharedProps below)

  const refreshOrders = useCallback(async (accountId = activeAccountId, r = activeRole) => {
    if (!accountId) return;
    try {
      if (r === "buyer") {
        const rows = await api.getOrders({ buyerId: accountId }, token);
        setBuyerOrders(rows);
      } else {
        const rows = await api.getOrders({ sellerId: accountId }, token);
        setSellerOrders(rows);
      }
    } catch (err) { handleApiError(err); }
  }, [activeAccountId, activeRole, token, handleApiError]);

  const refreshMyOrders = useCallback(async () => {
    if (!token) return;
    try {
      const rows = await api.getOrders({}, token);
      setMyOrders(rows);
    } catch (err) { handleApiError(err); }
  }, [token, handleApiError]);

  const handleLogin = useCallback((res) => {
    setToken(res.token);
    setAuthUser(res.user);
    setActiveRole(res.user.role === "seller" ? "seller" : "buyer");
    setActiveAccountId(res.user.id);
    localStorage.setItem("tal_token", res.token);
    localStorage.setItem("tal_user", JSON.stringify(res.user));
    setShowAuth(false);
    notify(`Welcome back, ${res.user.full_name}!`, "success");
  }, [notify]);

  const handleLogout = useCallback(() => {
    setToken("");
    setAuthUser(null);
    setActiveAccountId("");
    setBuyerOrders([]);
    setSellerOrders([]);
    setMyOrders([]);
    setNotifications([]);
    setUnreadCount(0);
    localStorage.removeItem("tal_token");
    localStorage.removeItem("tal_user");
    notify("Logged out successfully", "info");
  }, [notify]);

  const addToCart = useCallback((listing) => {
    if (cart.some((x) => x.id === listing.id)) return;
    setCart((prev) => [...prev, listing]);
    notify(`${listing.name_en} added to cart`, "success");
  }, [cart, notify]);

  const removeFromCart = useCallback((id) => setCart((prev) => prev.filter((x) => x.id !== id)), []);

  const cartTotal = useMemo(
    () => cart.reduce((s, i) => s + Number(i.expected_price_etb || 0) * Number(i.quantity_available || 0), 0),
    [cart]
  );

  const markNotifRead = useCallback(async (id) => {
    try {
      await api.markNotifRead(id, token);
      setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, status: "delivered" } : n));
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (_) {}
  }, [token]);

  const markAllRead = useCallback(async () => {
    try {
      await api.markAllNotifsRead(token);
      setNotifications((prev) => prev.map((n) => ({ ...n, status: "delivered" })));
      setUnreadCount(0);
    } catch (_) {}
  }, [token]);

  const sharedProps = {
    token, authUser, role, language, notify, handleApiError,
    prices, commodities, listings, logistics, resources,
    buyers, sellers, allUsers, recentOrders,
    myOrders, buyerOrders, sellerOrders,
    activeAccountId, setActiveAccountId,
    activeRole, setActiveRole,
    cart, addToCart, removeFromCart, cartTotal,
    search, setSearch,
    selectedCategory, setSelectedCategory,
    shortlist, setShortlist,
    refreshListings, refreshOrders, refreshMyOrders,
    setAllUsers, setBuyers, setSellers, setRecentOrders, setPrices,
    setCommodities, setLogistics,
    notifications, unreadCount, markNotifRead, markAllRead,
    loading,
  };

  const pages = {
    home:     <HomePage     {...sharedProps} setTab={setTab} onLoginRequired={() => setShowAuth(true)} />,
    store:    <MarketplacePage {...sharedProps} onLoginRequired={() => setShowAuth(true)} />,
    buyer:    <BuyerPage    {...sharedProps} />,
    seller:   <SellerPage   {...sharedProps} sellers={sellers} />,
    orders:   <OrdersPage   {...sharedProps} />,
    services: <ServicesPage {...sharedProps} />,
    admin:    <AdminPage    {...sharedProps} />,
    profile:  <ProfilePage  authUser={authUser} token={token} notify={notify} setAuthUser={setAuthUser} />,
  };

  return (
    <div className="min-h-screen bg-surface flex">
      {/* FIX #19: mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar
        tab={tab}
        setTab={(t) => { setTab(t); setSidebarOpen(false); }}
        visibleTabs={visibleTabs}
        language={language}
        authUser={authUser}
        cart={cart}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        {/* FIX #20: backend health banner */}
        {!healthOk && (
          <div className="bg-red-900/80 border-b border-red-500/40 px-6 py-2 text-sm text-red-200 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse shrink-0" />
            Backend unreachable — check that the server is running on port 4000.
          </div>
        )}

        <Topbar
          search={search}
          setSearch={setSearch}
          language={language}
          setLanguage={setLanguage}
          authUser={authUser}
          token={token}
          onLoginClick={() => setShowAuth(true)}
          onLogout={handleLogout}
          cart={cart}
          cartTotal={cartTotal}
          setTab={setTab}
          onMenuClick={() => setSidebarOpen(true)}
          notifications={notifications}
          unreadCount={unreadCount}
          markNotifRead={markNotifRead}
          markAllRead={markAllRead}
        />

        <main className="flex-1 p-4 md:p-6 overflow-y-auto animate-fade-in">
          {pages[tab] || pages.home}
        </main>
      </div>

      {showAuth && (
        <AuthModal
          onClose={() => setShowAuth(false)}
          onLogin={handleLogin}
          notify={notify}
        />
      )}

      <ToastStack toasts={toasts} />
    </div>
  );
}
