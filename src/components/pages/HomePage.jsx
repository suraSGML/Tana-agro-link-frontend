import { useMemo, useState } from "react";
import {
  TrendingUp, Package, ShoppingCart, Truck,
  ArrowRight, Star, Activity, Fish, Apple, Wheat, Leaf,
  ChevronRight,
} from "lucide-react";
import { api } from "../../api.js";

const CATEGORY_ICONS = {
  fish:      { icon: Fish,    color: "text-blue-400",   bg: "bg-blue-500/10",   border: "border-blue-500/20" },
  fruit:     { icon: Apple,   color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/20" },
  vegetable: { icon: Leaf,    color: "text-green-400",  bg: "bg-green-500/10",  border: "border-green-500/20" },
  grain:     { icon: Wheat,   color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/20" },
  other:     { icon: Package, color: "text-slate-400",  bg: "bg-slate-500/10",  border: "border-slate-500/20" },
};

function StatCard({ icon: Icon, label, value, sub, color = "text-brand-400" }) {
  return (
    <div className="stat-card">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
        <div className="w-8 h-8 rounded-lg bg-surface-hover flex items-center justify-center">
          <Icon size={15} className={color} />
        </div>
      </div>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
    </div>
  );
}

// FIX #9: inline price history mini-chart
function PriceTicker({ prices, commodities, notify }) {
  const [selectedId, setSelectedId] = useState(null);
  const [history, setHistory] = useState([]);
  const [histLoading, setHistLoading] = useState(false);

  const loadHistory = async (commodityId) => {
    if (selectedId === commodityId) { setSelectedId(null); setHistory([]); return; }
    setSelectedId(commodityId);
    setHistLoading(true);
    try {
      const rows = await api.getPriceHistory(commodityId, 7);
      setHistory(rows);
    } catch (e) { notify(e.message, "error"); }
    finally { setHistLoading(false); }
  };

  const maxPrice = Math.max(...history.map((h) => Number(h.price_etb)), 1);

  return (
    <div className="card p-5">
      <h2 className="section-title mb-4">
        <TrendingUp size={17} className="text-brand-400" />
        Today's Prices
        <span className="ml-auto text-xs text-slate-500 font-normal">Click for 7-day history</span>
      </h2>
      <div className="space-y-2">
        {prices.slice(0, 6).map((p) => {
          const cat = commodities.find((c) => c.id === p.commodity_id)?.category || "other";
          const { icon: Icon, color, bg, border } = CATEGORY_ICONS[cat] || CATEGORY_ICONS.other;
          const isSelected = selectedId === p.commodity_id;
          return (
            <div key={p.commodity_id}>
              <button
                onClick={() => loadHistory(p.commodity_id)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors text-left ${
                  isSelected ? "bg-brand-500/10 border border-brand-500/20" : "bg-surface-hover hover:bg-surface-border/50"
                }`}
              >
                <div className={`w-8 h-8 rounded-lg ${bg} border ${border} flex items-center justify-center shrink-0`}>
                  <Icon size={14} className={color} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-200 truncate">{p.name_en}</p>
                  <p className="text-xs text-slate-500">{p.name_am}</p>
                </div>
                <div className="text-right shrink-0">
                  {p.price_etb ? (
                    <>
                      <p className="text-sm font-bold text-brand-400">{Number(p.price_etb).toLocaleString()} ETB</p>
                      <p className="text-xs text-slate-600">per {p.base_unit}</p>
                    </>
                  ) : (
                    <p className="text-xs text-slate-600">No data</p>
                  )}
                </div>
                <ChevronRight size={14} className={`text-slate-600 transition-transform ${isSelected ? "rotate-90" : ""}`} />
              </button>

              {/* Inline history chart */}
              {isSelected && (
                <div className="mx-3 mb-2 p-3 bg-surface rounded-xl border border-surface-border">
                  {histLoading ? (
                    <div className="skeleton h-16 rounded-lg" />
                  ) : history.length === 0 ? (
                    <p className="text-xs text-slate-500 text-center py-3">No history data</p>
                  ) : (
                    <div className="flex items-end gap-1 h-16">
                      {history.map((h) => {
                        const pct = (Number(h.price_etb) / maxPrice) * 100;
                        return (
                          <div key={h.market_date} className="flex-1 flex flex-col items-center gap-1 group relative">
                            <div
                              className="w-full bg-brand-500/60 hover:bg-brand-500 rounded-t transition-all"
                              style={{ height: `${Math.max(4, pct * 0.56)}px` }}
                            />
                            <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-surface-card border border-surface-border rounded px-1 py-0.5 text-xs text-brand-400 font-bold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                              {Number(h.price_etb).toLocaleString()}
                            </div>
                            <p className="text-slate-600" style={{ fontSize: "8px" }}>
                              {new Date(h.market_date).toLocaleDateString("en", { month: "short", day: "numeric" })}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function HomePage({
  prices, commodities, listings, recentOrders,
  logistics, loading, setTab, language, notify, authUser, onLoginRequired,
}) {
  const am = language === "am";

  const activeCats = useMemo(() => {
    const cats = {};
    commodities.forEach((c) => { cats[c.category] = (cats[c.category] || 0) + 1; });
    return Object.entries(cats);
  }, [commodities]);

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Hero banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-600 via-brand-500 to-amber-400 p-6 md:p-8">
        <div className="relative z-10">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-semibold mb-3">
            <Activity size={11} />
            {am ? "ቀጥታ ገበያ" : "Live Market"}
          </span>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white mb-2">
            {am ? "ታና-አግሮ ሊንክ" : "Tana-Agro Link"}
          </h1>
          <p className="text-white/80 text-sm md:text-base max-w-md mb-5">
            {am
              ? "ለባህር ዳር እና ለአካባቢው ዘመናዊ የግብርና ንግድ ግንኙነት"
              : "Smart B2B agricultural supply chain for Bahir Dar & Lake Tana producers."}
          </p>
          <div className="flex flex-wrap gap-3">
            <button onClick={() => setTab("store")} className="btn bg-white text-brand-700 hover:bg-white/90 font-bold px-5 py-2.5 text-sm">
              {am ? "ገበያ ይጎብኙ" : "Browse Market"} <ArrowRight size={15} />
            </button>
            <button
              onClick={() => authUser ? setTab("buyer") : onLoginRequired?.()}
              className="btn bg-white/20 text-white hover:bg-white/30 font-semibold px-5 py-2.5 text-sm border border-white/30"
            >
              {authUser ? (am ? "ይግዙ" : "Place Order") : (am ? "ለመግዛት ይግቡ" : "Sign In to Order")}
            </button>
          </div>
        </div>
        <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-white/10 pointer-events-none" />
        <div className="absolute -right-8 -bottom-20 w-48 h-48 rounded-full bg-white/5 pointer-events-none" />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Package}      label="Commodities"   value={commodities.length}  sub="Available types"     color="text-brand-400" />
        <StatCard icon={ShoppingCart} label="Live Listings" value={listings.length}     sub="Active offers"       color="text-blue-400" />
        <StatCard icon={TrendingUp}   label="Recent Orders" value={recentOrders.length} sub="Last transactions"   color="text-emerald-400" />
        <StatCard icon={Truck}        label="Logistics"     value={logistics.length}    sub="Transport providers" color="text-purple-400" />
      </div>

      {/* Prices + Categories */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* FIX #9: price ticker with inline history */}
        {loading ? (
          <div className="card p-5 space-y-3">
            {[1,2,3,4].map(i => <div key={i} className="skeleton h-12 rounded-xl" />)}
          </div>
        ) : (
          <PriceTicker prices={prices} commodities={commodities} notify={notify} />
        )}

        {/* Categories */}
        <div className="card p-5">
          <h2 className="section-title mb-4">
            <Package size={17} className="text-brand-400" />
            {am ? "ምድቦች" : "Categories"}
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {activeCats.map(([cat, count]) => {
              const { icon: Icon, color, bg, border } = CATEGORY_ICONS[cat] || CATEGORY_ICONS.other;
              return (
                <button
                  key={cat}
                  onClick={() => setTab("store")}
                  className={`flex items-center gap-3 p-4 rounded-xl ${bg} border ${border} hover:opacity-80 transition-opacity text-left`}
                >
                  <Icon size={20} className={color} />
                  <div>
                    <p className={`text-sm font-bold capitalize ${color}`}>{cat}</p>
                    <p className="text-xs text-slate-500">{count} item{count !== 1 ? "s" : ""}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent market activity */}
      {recentOrders.length > 0 && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title">
              <Activity size={17} className="text-brand-400" />
              {am ? "የቅርብ ጊዜ ግብይቶች" : "Market Activity"}
              <span className="ml-2 text-xs text-slate-500 font-normal">Live feed</span>
            </h2>
            <button onClick={() => setTab("orders")} className="btn btn-ghost text-xs px-2 py-1">
              My Orders <ArrowRight size={12} />
            </button>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Commodity</th>
                  <th>Buyer</th>
                  <th>Seller</th>
                  <th>Qty</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.slice(0, 6).map((o) => (
                  <tr key={o.id}>
                    <td className="font-medium text-slate-200">{o.commodity_name}</td>
                    <td className="text-slate-400">{o.buyer_name}</td>
                    <td className="text-slate-400">{o.seller_name}</td>
                    <td>{o.matched_quantity} {o.unit}</td>
                    <td className="text-brand-400 font-semibold">
                      {(Number(o.agreed_price_etb) * Number(o.matched_quantity)).toLocaleString()} ETB
                    </td>
                    <td>
                      <span className={`badge ${
                        o.status === "delivered" ? "badge-green" :
                        o.status === "in_transit" ? "badge-purple" :
                        o.status === "confirmed" ? "badge-blue" :
                        o.status === "cancelled" ? "badge-red" : "badge-yellow"
                      }`}>{o.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Trust badges */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: Star,     label: "Trust Scores",    desc: "Reliability ratings for every seller" },
          { icon: Activity, label: "Auto Matching",   desc: "Smart buyer-seller pairing engine" },
          { icon: Truck,    label: "Cold Chain",      desc: "Refrigerated logistics directory" },
          { icon: Fish,     label: "Lake Tana Fresh", desc: "Direct from fishers & farmers" },
        ].map(({ icon: Icon, label, desc }) => (
          <div key={label} className="card p-4 flex flex-col gap-2">
            <div className="w-9 h-9 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center">
              <Icon size={16} className="text-brand-400" />
            </div>
            <p className="text-sm font-bold text-slate-200">{label}</p>
            <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
