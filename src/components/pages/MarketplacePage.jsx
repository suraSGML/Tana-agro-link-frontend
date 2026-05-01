import { useMemo, useState } from "react";
import {
  ShoppingCart, Heart, Star, MapPin, Calendar,
  Filter, X, Eye, Package, Fish, Apple, Leaf, Wheat,
  SlidersHorizontal, LogIn, Lock, Minus, Plus,
} from "lucide-react";
import { api } from "../../api.js";

const CATEGORIES = ["all", "fish", "fruit", "vegetable", "grain", "other"];

const CAT_STYLE = {
  fish:      "text-blue-400 bg-blue-500/10 border-blue-500/20",
  fruit:     "text-orange-400 bg-orange-500/10 border-orange-500/20",
  vegetable: "text-green-400 bg-green-500/10 border-green-500/20",
  grain:     "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
  other:     "text-slate-400 bg-slate-500/10 border-slate-500/20",
};
const CAT_ICONS = { fish: Fish, fruit: Apple, vegetable: Leaf, grain: Wheat, other: Package };

function AddToCartBtn({ listing, onAdd, onLoginRequired, isInCart, className = "" }) {
  if (isInCart) {
    return (
      <button disabled className={`btn btn-success flex-1 py-2 text-xs ${className}`}>
        <ShoppingCart size={13} /> In Cart
      </button>
    );
  }
  if (!onLoginRequired) {
    return (
      <button onClick={() => onAdd(listing)} className={`btn btn-primary flex-1 py-2 text-xs ${className}`}>
        <ShoppingCart size={13} /> Add to Cart
      </button>
    );
  }
  return (
    <button
      onClick={onLoginRequired}
      className={`btn btn-secondary flex-1 py-2 text-xs text-brand-400 border-brand-500/30 hover:bg-brand-500/10 ${className}`}
    >
      <Lock size={13} /> Sign in to buy
    </button>
  );
}

function ListingCard({ listing, onAdd, onDetail, isInCart, isShortlisted, onToggleShortlist, onLoginRequired }) {
  const cat = listing.category || "other";
  const style = CAT_STYLE[cat] || CAT_STYLE.other;
  const Icon = CAT_ICONS[cat] || Package;

  return (
    <div className="card-hover flex flex-col overflow-hidden group">
      <div className="relative h-40 bg-surface-hover overflow-hidden">
        {listing.image_url ? (
          <img src={listing.image_url} alt={listing.name_en} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center border-b border-surface-border">
            <Icon size={40} className={`opacity-20 ${style.split(" ")[0]}`} />
          </div>
        )}
        <div className="absolute top-2 left-2 flex gap-1.5 flex-wrap">
          <span className={`badge border ${style} text-xs`}>{cat}</span>
          {listing.quality && listing.quality !== "standard" && (
            <span className="badge badge-yellow text-xs">{listing.quality}</span>
          )}
        </div>
        <button
          onClick={() => onToggleShortlist(listing.id)}
          className={`absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center transition-all ${
            isShortlisted ? "bg-red-500 text-white" : "bg-surface-card/80 text-slate-400 hover:text-red-400"
          }`}
        >
          <Heart size={13} fill={isShortlisted ? "currentColor" : "none"} />
        </button>
      </div>

      <div className="p-4 flex flex-col flex-1 gap-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-bold text-slate-100 text-sm leading-tight">{listing.name_en}</h3>
            <p className="text-xs text-slate-500">{listing.name_am}</p>
          </div>
          {listing.reliability_score > 0 && (
            <div className="flex items-center gap-1 shrink-0">
              <Star size={11} className="text-brand-400 fill-brand-400" />
              <span className="text-xs font-semibold text-brand-400">{Number(listing.reliability_score).toFixed(1)}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <MapPin size={11} /><span className="truncate">{listing.location_text || "Bahir Dar"}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <Calendar size={11} />
          <span>{listing.harvest_or_catch_date ? new Date(listing.harvest_or_catch_date).toLocaleDateString() : "—"}</span>
        </div>
        <div className="mt-auto pt-2 border-t border-surface-border">
          <div className="flex items-end justify-between mb-3">
            <div>
              {listing.expected_price_etb ? (
                <>
                  <p className="text-lg font-extrabold text-brand-400 leading-tight">
                    {Number(listing.expected_price_etb).toLocaleString()} ETB
                  </p>
                  <p className="text-xs text-slate-500">per {listing.unit}</p>
                </>
              ) : (
                <p className="text-sm text-slate-500 italic">Price on request</p>
              )}
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold text-emerald-400">{Number(listing.quantity_available).toLocaleString()} {listing.unit}</p>
              <p className="text-xs text-slate-600">available</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => onDetail(listing.id)} className="btn btn-secondary flex-1 py-2 text-xs">
              <Eye size={13} /> Details
            </button>
            <AddToCartBtn listing={listing} onAdd={onAdd} onLoginRequired={onLoginRequired} isInCart={isInCart} />
          </div>
        </div>
      </div>
    </div>
  );
}

function ListingDetailModal({ listing, onClose, onAdd, isInCart, onLoginRequired }) {
  if (!listing) return null;
  const cat = listing.category || "other";
  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal max-w-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-100">{listing.name_en}</h2>
          <button onClick={onClose} className="btn btn-icon btn-ghost"><X size={18} /></button>
        </div>
        {listing.image_url && (
          <img src={listing.image_url} alt={listing.name_en} className="w-full h-48 object-cover rounded-xl mb-4" />
        )}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {[
            { label: "Price", value: listing.expected_price_etb ? `${Number(listing.expected_price_etb).toLocaleString()} ETB / ${listing.unit}` : "On request" },
            { label: "Available", value: `${Number(listing.quantity_available).toLocaleString()} ${listing.unit}` },
            { label: "Quality", value: listing.quality || "standard" },
            { label: "Category", value: cat },
            { label: "Seller", value: listing.seller_name },
            { label: "Phone", value: listing.seller_phone || "—" },
            { label: "Location", value: listing.location_text || "Bahir Dar" },
            { label: "Harvest Date", value: listing.harvest_or_catch_date ? new Date(listing.harvest_or_catch_date).toLocaleDateString() : "—" },
          ].map(({ label, value }) => (
            <div key={label} className="bg-surface-hover rounded-xl p-3">
              <p className="text-xs text-slate-500 mb-0.5">{label}</p>
              <p className="text-sm font-semibold text-slate-200">{value}</p>
            </div>
          ))}
        </div>
        {listing.quality_notes && (
          <div className="bg-surface-hover rounded-xl p-3 mb-4">
            <p className="text-xs text-slate-500 mb-1">Quality Notes</p>
            <p className="text-sm text-slate-300">{listing.quality_notes}</p>
          </div>
        )}
        <AddToCartBtn
          listing={listing}
          onAdd={(l) => { onAdd(l); onClose(); }}
          onLoginRequired={onLoginRequired ? () => { onClose(); onLoginRequired(); } : null}
          isInCart={isInCart}
          className="w-full py-3 text-sm"
        />
      </div>
    </div>
  );
}

function FilterPanel({ filters, setFilters, onApply, onReset }) {
  return (
    <div className="card p-4 space-y-4 mb-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-slate-200 flex items-center gap-2">
          <SlidersHorizontal size={15} className="text-brand-400" /> Filters
        </p>
        <button onClick={onReset} className="btn btn-ghost text-xs px-2 py-1">Reset</button>
      </div>
      <div className="grid sm:grid-cols-3 gap-3">
        <div className="form-group">
          <label className="form-label">Max Price (ETB)</label>
          <input className="input text-sm" type="number" min="0" placeholder="Any price"
            value={filters.max_price} onChange={(e) => setFilters((f) => ({ ...f, max_price: e.target.value }))} />
        </div>
        <div className="form-group">
          <label className="form-label">Min Seller Rating</label>
          <select className="input text-sm" value={filters.min_reliability}
            onChange={(e) => setFilters((f) => ({ ...f, min_reliability: e.target.value }))}>
            <option value="0">Any rating</option>
            <option value="3">3+ stars</option>
            <option value="4">4+ stars</option>
            <option value="4.5">4.5+ stars</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Quality</label>
          <select className="input text-sm" value={filters.quality}
            onChange={(e) => setFilters((f) => ({ ...f, quality: e.target.value }))}>
            <option value="">Any quality</option>
            <option value="premium">Premium</option>
            <option value="standard">Standard</option>
            <option value="mixed">Mixed</option>
          </select>
        </div>
      </div>
      <button onClick={onApply} className="btn btn-primary text-sm px-4 py-2">Apply Filters</button>
    </div>
  );
}

// ── Cart panel with adjustable quantities ─────────────────────────────────────
function CartPanel({ cart, removeFromCart, updateCartQty, cartTotal, authUser, buyerForm, setBuyerForm, onSubmit, onLoginRequired, loading }) {
  return (
    <div className="card p-4 flex flex-col gap-4 sticky top-24">
      <h3 className="section-title">
        <ShoppingCart size={16} className="text-brand-400" />
        Request Cart
        {cart.length > 0 && (
          <span className="ml-auto bg-brand-500 text-slate-900 text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {cart.length}
          </span>
        )}
      </h3>

      {cart.length === 0 ? (
        <div className="text-center py-8">
          <ShoppingCart size={32} className="text-slate-700 mx-auto mb-2" />
          <p className="text-sm text-slate-500">Your cart is empty</p>
          <p className="text-xs text-slate-600 mt-1">Browse listings and add items to order</p>
        </div>
      ) : (
        <>
          {/* Cart items with adjustable quantity */}
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {cart.map((item) => (
              <div key={item.id} className="p-2.5 bg-surface-hover rounded-xl space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-200 truncate">{item.name_en}</p>
                    <p className="text-xs text-slate-500">
                      {item.expected_price_etb
                        ? `${Number(item.expected_price_etb).toLocaleString()} ETB / ${item.unit}`
                        : "Price on request"}
                    </p>
                  </div>
                  <button onClick={() => removeFromCart(item.id)} className="btn btn-icon btn-ghost p-1 text-red-400 shrink-0">
                    <X size={13} />
                  </button>
                </div>
                {/* Quantity adjuster */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 shrink-0">Qty:</span>
                  <div className="flex items-center gap-1 flex-1">
                    <button
                      onClick={() => updateCartQty(item.id, Math.max(0.1, Number(item.qty_needed || item.quantity_available) - 1))}
                      className="btn btn-icon btn-ghost p-1 w-6 h-6"
                    >
                      <Minus size={10} />
                    </button>
                    <input
                      type="number"
                      min="0.1"
                      max={item.quantity_available}
                      step="0.1"
                      className="input text-xs text-center py-1 px-2 flex-1 min-w-0"
                      value={item.qty_needed ?? item.quantity_available}
                      onChange={(e) => updateCartQty(item.id, e.target.value)}
                    />
                    <button
                      onClick={() => updateCartQty(item.id, Math.min(Number(item.quantity_available), Number(item.qty_needed || item.quantity_available) + 1))}
                      className="btn btn-icon btn-ghost p-1 w-6 h-6"
                    >
                      <Plus size={10} />
                    </button>
                    <span className="text-xs text-slate-500 shrink-0">{item.unit}</span>
                  </div>
                  {item.expected_price_etb && (
                    <p className="text-xs font-bold text-brand-400 shrink-0">
                      {(Number(item.expected_price_etb) * Number(item.qty_needed ?? item.quantity_available)).toLocaleString()} ETB
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-surface-border pt-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Estimated Total</span>
              <span className="font-bold text-brand-400">{cartTotal.toLocaleString()} ETB</span>
            </div>

            {!authUser ? (
              <div className="space-y-2">
                <div className="p-3 rounded-xl bg-brand-500/10 border border-brand-500/20 text-center">
                  <Lock size={16} className="text-brand-400 mx-auto mb-1" />
                  <p className="text-xs text-brand-300 font-semibold">Sign in to place your order</p>
                  <p className="text-xs text-slate-500 mt-0.5">Create an account or log in to submit buy requests</p>
                </div>
                <button onClick={onLoginRequired} className="btn btn-primary w-full">
                  <LogIn size={15} /> Sign In to Order
                </button>
              </div>
            ) : authUser.role !== "buyer" && authUser.role !== "admin" ? (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                <p className="text-xs text-red-300 text-center">Only buyers can place orders. You are logged in as <strong>{authUser.role}</strong>.</p>
              </div>
            ) : (
              <>
                <div className="p-2.5 bg-brand-500/10 border border-brand-500/20 rounded-xl">
                  <p className="text-xs text-brand-300 font-semibold">Buying as: {authUser.full_name}</p>
                </div>
                <input className="input text-sm" type="datetime-local"
                  placeholder="Preferred delivery time"
                  value={buyerForm.preferred_delivery_datetime}
                  onChange={(e) => setBuyerForm({ ...buyerForm, preferred_delivery_datetime: e.target.value })} />
                <input className="input text-sm" placeholder="Delivery location"
                  value={buyerForm.delivery_location_text}
                  onChange={(e) => setBuyerForm({ ...buyerForm, delivery_location_text: e.target.value })} />
                <button onClick={onSubmit} disabled={loading} className="btn btn-primary w-full">
                  {loading ? "Matching sellers…" : "Submit & Auto-Match Sellers"}
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default function MarketplacePage({
  listings, commodities, authUser, cart, addToCart, removeFromCart,
  cartTotal, search, selectedCategory, setSelectedCategory,
  shortlist, setShortlist, token, notify, refreshListings, loading,
  onLoginRequired,
}) {
  const [selectedListing, setSelectedListing] = useState(null);
  const [cartLoading, setCartLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({ max_price: "", min_reliability: "0", quality: "" });
  // Per-item quantity overrides (listingId → qty)
  const [qtyOverrides, setQtyOverrides] = useState({});
  const [buyerForm, setBuyerForm] = useState({
    preferred_delivery_datetime: "",
    deadline_datetime: "",
    delivery_location_text: "Abay Market, Bahir Dar",
  });

  const listingCategoryMap = useMemo(() => {
    const map = {};
    commodities.forEach((c) => { map[c.name_en] = c.category; });
    return map;
  }, [commodities]);

  const filtered = useMemo(() => {
    return listings.filter((l) => {
      const name = (l.name_en || "").toLowerCase();
      const seller = (l.seller_name || "").toLowerCase();
      const q = search.toLowerCase().trim();
      const category = l.category || listingCategoryMap[l.name_en] || "other";
      const matchesSearch = !q || name.includes(q) || seller.includes(q);
      const matchesCategory = selectedCategory === "all" || selectedCategory === category;
      const matchesQuality = !filters.quality || l.quality === filters.quality;
      return matchesSearch && matchesCategory && matchesQuality;
    });
  }, [listings, search, selectedCategory, listingCategoryMap, filters.quality]);

  // Cart with qty_needed injected from overrides
  const cartWithQty = cart.map((item) => ({
    ...item,
    qty_needed: qtyOverrides[item.id] !== undefined ? qtyOverrides[item.id] : item.quantity_available,
  }));

  const cartTotalWithQty = cartWithQty.reduce(
    (s, i) => s + Number(i.expected_price_etb || 0) * Number(i.qty_needed || 0), 0
  );

  const updateCartQty = (id, val) => {
    const num = Math.max(0.1, Number(val) || 0.1);
    setQtyOverrides((prev) => ({ ...prev, [id]: num }));
  };

  const applyFilters = async () => {
    const params = {};
    if (filters.max_price) params.max_price = filters.max_price;
    if (filters.min_reliability && filters.min_reliability !== "0") params.min_reliability = filters.min_reliability;
    await refreshListings(params);
    setShowFilters(false);
  };

  const resetFilters = async () => {
    setFilters({ max_price: "", min_reliability: "0", quality: "" });
    await refreshListings({});
  };

  const openDetail = async (listingId) => {
    try {
      const row = await api.getListingById(listingId);
      setSelectedListing(row);
    } catch (err) { notify(`Detail error: ${err.message}`, "error"); }
  };

  const toggleShortlist = (id) => {
    setShortlist((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const handleAddToCart = (listing) => {
    if (!authUser) { onLoginRequired?.(); return; }
    addToCart(listing);
  };

  const submitCart = async () => {
    if (!authUser) { onLoginRequired?.(); return; }
    if (authUser.role !== "buyer" && authUser.role !== "admin") {
      notify("Only buyers can place orders", "error"); return;
    }
    if (!cartWithQty.length) { notify("Cart is empty", "error"); return; }

    setCartLoading(true);
    try {
      let count = 0;
      const deliveryTime = buyerForm.preferred_delivery_datetime
        || new Date(Date.now() + 6 * 3600000).toISOString().slice(0, 16);
      const deadline = buyerForm.deadline_datetime
        || new Date(Date.now() + 24 * 3600000).toISOString().slice(0, 16);

      for (const item of cartWithQty) {
        const commodity = commodities.find((c) => c.name_en === item.name_en);
        if (!commodity) continue;
        const created = await api.createBuyRequest({
          buyer_id: authUser.id,
          commodity_id: commodity.id,
          quantity_needed: Number(item.qty_needed),
          unit: item.unit,
          max_price_etb: item.expected_price_etb ? Number(item.expected_price_etb) : null,
          preferred_delivery_datetime: deliveryTime,
          deadline_datetime: deadline,
          delivery_location_text: buyerForm.delivery_location_text,
        }, token);
        await api.runMatch(created.id, token);
        count++;
      }
      notify(`${count} request(s) submitted! Sellers have been notified.`, "success");
      cart.forEach((i) => removeFromCart(i.id));
      setQtyOverrides({});
      refreshListings();
    } catch (err) {
      notify(`Order failed: ${err.message}`, "error");
    } finally {
      setCartLoading(false);
    }
  };

  return (
    <div className="space-y-4 animate-slide-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Marketplace</h1>
          <p className="text-sm text-slate-500">{filtered.length} listings available</p>
        </div>
        <button
          onClick={() => setShowFilters((v) => !v)}
          className={`btn text-xs px-3 py-2 ${showFilters ? "btn-primary" : "btn-secondary"}`}
        >
          <Filter size={13} /> Filters
          {(filters.max_price || filters.min_reliability !== "0" || filters.quality) && (
            <span className="w-2 h-2 rounded-full bg-brand-400" />
          )}
        </button>
      </div>

      {showFilters && (
        <FilterPanel filters={filters} setFilters={setFilters} onApply={applyFilters} onReset={resetFilters} />
      )}

      <div className="flex gap-2 flex-wrap">
        {CATEGORIES.map((cat) => (
          <button key={cat} onClick={() => setSelectedCategory(cat)}
            className={`cat-pill ${selectedCategory === cat ? "active" : ""}`}>
            {cat === "all" ? "All" : cat.charAt(0).toUpperCase() + cat.slice(1)}
          </button>
        ))}
      </div>

      <div className="grid xl:grid-cols-[1fr_320px] gap-6">
        <div>
          {loading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1,2,3,4,5,6].map(i => <div key={i} className="skeleton h-72 rounded-2xl" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="card p-12 text-center">
              <Package size={40} className="text-slate-700 mx-auto mb-3" />
              <p className="text-slate-400 font-semibold">No listings found</p>
              <p className="text-slate-600 text-sm mt-1">Try adjusting your search or filters</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((l) => (
                <ListingCard
                  key={l.id}
                  listing={{ ...l, category: l.category || listingCategoryMap[l.name_en] || "other" }}
                  onAdd={handleAddToCart}
                  onDetail={openDetail}
                  isInCart={cart.some((c) => c.id === l.id)}
                  isShortlisted={shortlist.includes(l.id)}
                  onToggleShortlist={toggleShortlist}
                  onLoginRequired={!authUser ? onLoginRequired : null}
                />
              ))}
            </div>
          )}
        </div>

        <CartPanel
          cart={cartWithQty}
          removeFromCart={(id) => { removeFromCart(id); setQtyOverrides((p) => { const n = {...p}; delete n[id]; return n; }); }}
          updateCartQty={updateCartQty}
          cartTotal={cartTotalWithQty}
          authUser={authUser}
          buyerForm={buyerForm}
          setBuyerForm={setBuyerForm}
          onSubmit={submitCart}
          onLoginRequired={onLoginRequired}
          loading={cartLoading}
        />
      </div>

      {selectedListing && (
        <ListingDetailModal
          listing={selectedListing}
          onClose={() => setSelectedListing(null)}
          onAdd={handleAddToCart}
          isInCart={cart.some((c) => c.id === selectedListing.id)}
          onLoginRequired={!authUser ? onLoginRequired : null}
        />
      )}
    </div>
  );
}
