import {
  Home, ShoppingBag, ShoppingCart, Package,
  Truck, Settings, BarChart2, Leaf, ChevronRight, Fish, X, User,
} from "lucide-react";

const NAV_ITEMS = [
  { id: "home",     label: "Dashboard",   icon: Home },
  { id: "store",    label: "Marketplace", icon: ShoppingBag },
  { id: "buyer",    label: "Buy",         icon: ShoppingCart },
  { id: "seller",   label: "Sell",        icon: Package },
  { id: "orders",   label: "Orders",      icon: BarChart2 },
  { id: "services", label: "Services",    icon: Truck },
  { id: "admin",    label: "Admin",       icon: Settings },
  { id: "profile",  label: "My Profile",  icon: User },
];

// FIX #19: accepts open/onClose for mobile drawer
export default function Sidebar({ tab, setTab, visibleTabs, authUser, cart, open, onClose }) {
  const items = NAV_ITEMS.filter((n) => visibleTabs.includes(n.id));

  const content = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-surface-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-brand-500 flex items-center justify-center shadow-lg shadow-brand-500/30 shrink-0">
            <Fish size={18} className="text-slate-900" />
          </div>
          <div>
            <p className="font-bold text-slate-100 text-sm leading-tight">Tana-Agro Link</p>
            <p className="text-xs text-slate-500">Bahir Dar • B2B</p>
          </div>
        </div>
        {/* Close button — mobile only */}
        <button onClick={onClose} className="lg:hidden btn btn-icon btn-ghost">
          <X size={18} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {items.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`nav-item w-full ${tab === id ? "active" : ""}`}
          >
            <Icon size={17} />
            <span className="flex-1 text-left">{label}</span>
            {id === "store" && cart.length > 0 && (
              <span className="bg-brand-500 text-slate-900 text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {cart.length}
              </span>
            )}
            {tab === id && <ChevronRight size={14} className="opacity-50" />}
          </button>
        ))}
      </nav>

      {/* User */}
      {authUser && (
        <div className="px-3 py-3 border-t border-surface-border">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-surface-hover">
            <div className="w-8 h-8 rounded-full bg-brand-500/20 border border-brand-500/30 flex items-center justify-center text-brand-400 font-bold text-sm shrink-0">
              {authUser.full_name?.[0]?.toUpperCase() || "U"}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-200 truncate">{authUser.full_name}</p>
              <p className="text-xs text-slate-500 capitalize">{authUser.role?.replace("_", " ")}</p>
            </div>
          </div>
        </div>
      )}

      <div className="px-5 py-3 border-t border-surface-border">
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <Leaf size={12} />
          <span>Lake Tana Agricultural Hub</span>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 min-h-screen bg-surface-card border-r border-surface-border shrink-0">
        {content}
      </aside>

      {/* Mobile drawer — FIX #19 */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-72 bg-surface-card border-r border-surface-border
        flex flex-col transform transition-transform duration-300 ease-in-out lg:hidden
        ${open ? "translate-x-0" : "-translate-x-full"}
      `}>
        {content}
      </aside>
    </>
  );
}
