import { useState, useRef, useEffect } from "react";
import { Search, ShoppingCart, LogIn, LogOut, Globe, Bell, Menu, CheckCheck, X } from "lucide-react";

// FIX #6: notification dropdown
function NotifDropdown({ notifications, unreadCount, markNotifRead, markAllRead, onClose }) {
  return (
    <div className="absolute right-0 top-full mt-2 w-80 card shadow-2xl z-50 overflow-hidden animate-pop-in">
      <div className="flex items-center justify-between px-4 py-3 border-b border-surface-border">
        <p className="text-sm font-bold text-slate-100">Notifications</p>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button onClick={markAllRead} className="btn btn-ghost text-xs px-2 py-1 gap-1">
              <CheckCheck size={12} /> Mark all read
            </button>
          )}
          <button onClick={onClose} className="btn btn-icon btn-ghost p-1"><X size={14} /></button>
        </div>
      </div>
      <div className="max-h-80 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <Bell size={24} className="text-slate-700 mx-auto mb-2" />
            <p className="text-sm text-slate-500">No notifications yet</p>
          </div>
        ) : (
          notifications.map((n) => (
            <button
              key={n.id}
              onClick={() => markNotifRead(n.id)}
              className={`w-full text-left px-4 py-3 border-b border-surface-border/50 hover:bg-surface-hover transition-colors ${
                n.status === "queued" ? "bg-brand-500/5" : ""
              }`}
            >
              <div className="flex items-start gap-2">
                {n.status === "queued" && (
                  <span className="w-2 h-2 rounded-full bg-brand-400 shrink-0 mt-1.5" />
                )}
                <div className={n.status !== "queued" ? "pl-4" : ""}>
                  <p className="text-xs text-slate-300 leading-relaxed">{n.message_body}</p>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {new Date(n.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

export default function Topbar({
  search, setSearch, language, setLanguage,
  authUser, onLoginClick, onLogout,
  cart, cartTotal, setTab,
  onMenuClick,
  notifications, unreadCount, markNotifRead, markAllRead,
}) {
  const [showNotifs, setShowNotifs] = useState(false);
  const notifRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifs(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <header className="sticky top-0 z-30 bg-surface-card/80 backdrop-blur-md border-b border-surface-border px-4 md:px-6 py-3 flex items-center gap-3">
      {/* FIX #19: hamburger for mobile */}
      <button onClick={onMenuClick} className="btn btn-icon btn-ghost lg:hidden shrink-0">
        <Menu size={18} />
      </button>

      {/* Search */}
      <div className="flex-1 max-w-xl relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
        <input
          className="input pl-10 py-2.5 text-sm"
          placeholder="Search products, fish, fruits, sellers…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="flex items-center gap-1.5 ml-auto">
        {/* Language toggle */}
        <button
          onClick={() => setLanguage(language === "en" ? "am" : "en")}
          className="btn btn-ghost flex items-center gap-1.5 text-xs px-3 py-2"
        >
          <Globe size={14} />
          <span className="hidden sm:inline">{language === "en" ? "EN" : "አማ"}</span>
        </button>

        {/* Cart */}
        <button
          onClick={() => setTab("store")}
          className="btn btn-secondary relative px-3 py-2 flex items-center gap-2"
        >
          <ShoppingCart size={16} />
          {cart.length > 0 && (
            <>
              <span className="absolute -top-1.5 -right-1.5 bg-brand-500 text-slate-900 text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                {cart.length}
              </span>
              <span className="hidden sm:inline text-xs font-semibold text-brand-400">
                {cartTotal.toLocaleString()} ETB
              </span>
            </>
          )}
        </button>

        {/* FIX #6: Notification bell */}
        {authUser && (
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setShowNotifs((v) => !v)}
              className="btn btn-icon btn-ghost relative"
            >
              <Bell size={16} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-0.5">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>
            {showNotifs && (
              <NotifDropdown
                notifications={notifications}
                unreadCount={unreadCount}
                markNotifRead={markNotifRead}
                markAllRead={markAllRead}
                onClose={() => setShowNotifs(false)}
              />
            )}
          </div>
        )}

        {/* Auth */}
        {authUser ? (
          <div className="flex items-center gap-1.5">
            <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl bg-surface-hover border border-surface-border">
              <div className="w-6 h-6 rounded-full bg-brand-500/20 flex items-center justify-center text-brand-400 font-bold text-xs">
                {authUser.full_name?.[0]?.toUpperCase()}
              </div>
              <span className="text-sm font-medium text-slate-200">{authUser.full_name.split(" ")[0]}</span>
            </div>
            <button onClick={onLogout} className="btn btn-ghost px-3 py-2 text-xs">
              <LogOut size={14} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        ) : (
          <button onClick={onLoginClick} className="btn btn-primary px-4 py-2 text-sm">
            <LogIn size={14} />
            <span className="hidden sm:inline">Sign In</span>
          </button>
        )}
      </div>
    </header>
  );
}
