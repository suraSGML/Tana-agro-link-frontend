import { useMemo, useState, useEffect } from "react";
import {
  Settings, Search, ChevronUp, ChevronDown,
  UserCheck, UserX, TrendingUp, Users, Shield,
  Plus, Package, BarChart2, X,
} from "lucide-react";
import { api } from "../../api.js";

const ROLES = ["all", "buyer", "seller", "field_agent", "admin"];

function RoleBadge({ role }) {
  const cls = { buyer: "badge-blue", seller: "badge-green", field_agent: "badge-purple", admin: "badge-yellow" }[role] || "badge-gray";
  return <span className={`badge ${cls} capitalize`}>{role?.replace("_", " ")}</span>;
}

// FIX #16: price history inline chart (CSS bar chart, no library needed)
function PriceHistoryPanel({ commodities, token, notify }) {
  const [selectedId, setSelectedId] = useState("");
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadHistory = async (id) => {
    if (!id) return;
    setLoading(true);
    try {
      const rows = await api.getPriceHistory(id, 14);
      setHistory(rows);
    } catch (e) { notify(e.message, "error"); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (selectedId) loadHistory(selectedId); }, [selectedId]);

  const maxPrice = Math.max(...history.map((h) => Number(h.price_etb)), 1);

  return (
    <div className="card p-5">
      <h2 className="section-title mb-4">
        <BarChart2 size={16} className="text-brand-400" /> Price History (14 days)
      </h2>
      <select
        className="input text-sm mb-4 max-w-xs"
        value={selectedId}
        onChange={(e) => setSelectedId(e.target.value)}
      >
        <option value="">Select commodity…</option>
        {commodities.map((c) => <option key={c.id} value={c.id}>{c.name_en}</option>)}
      </select>
      {loading ? (
        <div className="skeleton h-32 rounded-xl" />
      ) : history.length === 0 ? (
        selectedId && <p className="text-slate-500 text-sm text-center py-6">No price history for this commodity.</p>
      ) : (
        <div className="flex items-end gap-1.5 h-32">
          {history.map((h) => {
            const pct = (Number(h.price_etb) / maxPrice) * 100;
            return (
              <div key={h.market_date} className="flex-1 flex flex-col items-center gap-1 group">
                <div className="relative w-full">
                  <div
                    className="w-full bg-brand-500/70 hover:bg-brand-500 rounded-t transition-all"
                    style={{ height: `${Math.max(4, pct * 1.2)}px` }}
                  />
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-surface-card border border-surface-border rounded px-1.5 py-0.5 text-xs text-brand-400 font-bold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                    {Number(h.price_etb).toLocaleString()} ETB
                  </div>
                </div>
                <p className="text-xs text-slate-600 rotate-45 origin-left whitespace-nowrap" style={{ fontSize: "9px" }}>
                  {new Date(h.market_date).toLocaleDateString("en", { month: "short", day: "numeric" })}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// FIX #9: commodity management
function CommodityPanel({ commodities, setCommodities, token, notify }) {
  const [form, setForm] = useState({ name_en: "", name_am: "", category: "fish", base_unit: "kg", is_perishable: true });
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const created = await api.createCommodity(form, token);
      setCommodities((prev) => [...prev, created]);
      notify(`Commodity "${created.name_en}" added!`, "success");
      setForm({ name_en: "", name_am: "", category: "fish", base_unit: "kg", is_perishable: true });
      setShowForm(false);
    } catch (err) { notify(err.message, "error"); }
    finally { setLoading(false); }
  };

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="section-title">
          <Package size={16} className="text-brand-400" /> Commodities
          <span className="ml-2 badge badge-gray">{commodities.length}</span>
        </h2>
        <button onClick={() => setShowForm((v) => !v)} className="btn btn-primary text-xs px-3 py-2">
          <Plus size={13} /> Add Commodity
        </button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="card p-4 mb-4 space-y-3 border-brand-500/20">
          <div className="grid grid-cols-2 gap-3">
            <div className="form-group">
              <label className="form-label">Name (English)</label>
              <input className="input" placeholder="Tilapia" value={form.name_en}
                onChange={(e) => setForm({ ...form, name_en: e.target.value })} required />
            </div>
            <div className="form-group">
              <label className="form-label">Name (Amharic)</label>
              <input className="input" placeholder="ቲላፒያ" value={form.name_am}
                onChange={(e) => setForm({ ...form, name_am: e.target.value })} required />
            </div>
            <div className="form-group">
              <label className="form-label">Category</label>
              <select className="input" value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}>
                <option value="fish">Fish</option>
                <option value="fruit">Fruit</option>
                <option value="vegetable">Vegetable</option>
                <option value="grain">Grain</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Base Unit</label>
              <select className="input" value={form.base_unit}
                onChange={(e) => setForm({ ...form, base_unit: e.target.value })}>
                <option value="kg">kg</option>
                <option value="piece">piece</option>
                <option value="quintal">quintal</option>
                <option value="liter">liter</option>
              </select>
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
            <input type="checkbox" checked={form.is_perishable}
              onChange={(e) => setForm({ ...form, is_perishable: e.target.checked })}
              className="w-4 h-4 rounded" />
            Perishable
          </label>
          <div className="flex gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="btn btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={loading} className="btn btn-primary flex-1">
              {loading ? "Adding…" : "Add Commodity"}
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {commodities.map((c) => (
          <div key={c.id} className="bg-surface-hover rounded-xl p-3 flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-200 truncate">{c.name_en}</p>
              <p className="text-xs text-slate-500">{c.name_am} · {c.base_unit}</p>
            </div>
            <span className="badge badge-gray text-xs capitalize">{c.category}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdminPage({
  allUsers, setAllUsers, setBuyers, setSellers,
  token, notify, prices, setPrices, commodities, setCommodities, listings, recentOrders,
}) {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [activeFilter, setActiveFilter] = useState("all");
  const [sortBy, setSortBy] = useState("full_name");
  const [sortDir, setSortDir] = useState("asc");
  const [page, setPage] = useState(1);
  const [priceForm, setPriceForm] = useState({ commodity_id: "", price_etb: "", unit: "kg" });
  const [priceLoading, setPriceLoading] = useState(false);
  const PAGE_SIZE = 8;

  const filtered = useMemo(() => {
    const rows = allUsers.filter((u) => {
      const q = search.trim().toLowerCase();
      const matchSearch = !q ||
        (u.full_name || "").toLowerCase().includes(q) ||
        (u.email || "").toLowerCase().includes(q) ||
        (u.phone_number || "").toLowerCase().includes(q);
      const matchRole = roleFilter === "all" || u.role === roleFilter;
      const matchActive =
        activeFilter === "all" ||
        (activeFilter === "active" && u.is_active) ||
        (activeFilter === "inactive" && !u.is_active);
      return matchSearch && matchRole && matchActive;
    });
    rows.sort((a, b) => {
      const f = sortDir === "asc" ? 1 : -1;
      if (sortBy === "full_name") return a.full_name.localeCompare(b.full_name) * f;
      if (sortBy === "role") return a.role.localeCompare(b.role) * f;
      return (new Date(a.created_at || 0) - new Date(b.created_at || 0)) * f;
    });
    return rows;
  }, [allUsers, search, roleFilter, activeFilter, sortBy, sortDir]);

  const paged = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const updateUser = async (userId, payload) => {
    const label = payload.role ? `role to "${payload.role}"` : payload.is_active ? "enable account" : "disable account";
    if (!window.confirm(`Confirm: change ${label}?`)) return;
    try {
      await api.updateUser(userId, payload, token);
      notify("User updated", "success");
      const [u, b, s] = await Promise.all([
        api.getUsers("", token),
        api.getUsers("buyer", token),
        api.getUsers("seller", token),
      ]);
      setAllUsers(u); setBuyers(b); setSellers(s);
    } catch (err) { notify(`Update failed: ${err.message}`, "error"); }
  };

  const submitPrice = async (e) => {
    e.preventDefault();
    setPriceLoading(true);
    try {
      await api.createMarketPrice({
        commodity_id: priceForm.commodity_id,
        price_etb: Number(priceForm.price_etb),
        unit: priceForm.unit,
      }, token);
      notify("Market price updated!", "success");
      setPriceForm({ commodity_id: "", price_etb: "", unit: "kg" });
      // Refresh prices
      const p = await api.getPrices();
      setPrices(p);
    } catch (err) { notify(`Price update failed: ${err.message}`, "error"); }
    finally { setPriceLoading(false); }
  };

  const SortBtn = ({ field, label }) => (
    <button
      onClick={() => { setSortBy(field); setSortDir(sortBy === field && sortDir === "asc" ? "desc" : "asc"); }}
      className="flex items-center gap-1 hover:text-slate-100 transition-colors"
    >
      {label}
      {sortBy === field
        ? sortDir === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />
        : <ChevronDown size={12} className="opacity-30" />}
    </button>
  );

  return (
    <div className="space-y-6 animate-slide-up">
      <div>
        <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          <Settings size={20} className="text-brand-400" /> Admin Panel
        </h1>
        <p className="text-sm text-slate-500 mt-1">Manage users, commodities, and market data.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: Users,      label: "Total Users",   value: allUsers.length,                                 color: "text-brand-400" },
          { icon: UserCheck,  label: "Active",        value: allUsers.filter(u => u.is_active).length,        color: "text-emerald-400" },
          { icon: Shield,     label: "Sellers",       value: allUsers.filter(u => u.role === "seller").length, color: "text-blue-400" },
          { icon: TrendingUp, label: "Market Prices", value: prices.length,                                   color: "text-purple-400" },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="stat-card">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
              <Icon size={14} className={color} />
            </div>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Market price update */}
      <div className="card p-5">
        <h2 className="section-title mb-4">
          <TrendingUp size={16} className="text-brand-400" /> Update Market Price
        </h2>
        <form onSubmit={submitPrice} className="grid sm:grid-cols-4 gap-3 items-end">
          <div className="form-group">
            <label className="form-label">Commodity</label>
            <select className="input" value={priceForm.commodity_id}
              onChange={(e) => setPriceForm({ ...priceForm, commodity_id: e.target.value })} required>
              <option value="">Select…</option>
              {commodities.map((c) => <option key={c.id} value={c.id}>{c.name_en}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Price (ETB)</label>
            <input className="input" type="number" min="0" step="0.01" placeholder="e.g. 380"
              value={priceForm.price_etb}
              onChange={(e) => setPriceForm({ ...priceForm, price_etb: e.target.value })} required />
          </div>
          <div className="form-group">
            <label className="form-label">Unit</label>
            <select className="input" value={priceForm.unit}
              onChange={(e) => setPriceForm({ ...priceForm, unit: e.target.value })}>
              <option value="kg">kg</option>
              <option value="piece">piece</option>
              <option value="quintal">quintal</option>
            </select>
          </div>
          <button type="submit" disabled={priceLoading} className="btn btn-primary">
            {priceLoading ? "Saving…" : "Update Price"}
          </button>
        </form>
      </div>

      {/* FIX #16: Price history chart */}
      <PriceHistoryPanel commodities={commodities} token={token} notify={notify} />

      {/* FIX #9: Commodity management */}
      <CommodityPanel
        commodities={commodities}
        setCommodities={setCommodities}
        token={token}
        notify={notify}
      />

      {/* User management */}
      <div className="card overflow-hidden">
        <div className="p-5 border-b border-surface-border">
          <h2 className="section-title mb-4">
            <Users size={16} className="text-brand-400" /> User Management
          </h2>
          <div className="grid sm:grid-cols-3 gap-3">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input className="input pl-9 text-sm" placeholder="Search users…"
                value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
            </div>
            <select className="input text-sm" value={roleFilter}
              onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}>
              {ROLES.map((r) => <option key={r} value={r}>{r === "all" ? "All roles" : r.replace("_", " ")}</option>)}
            </select>
            <select className="input text-sm" value={activeFilter}
              onChange={(e) => { setActiveFilter(e.target.value); setPage(1); }}>
              <option value="all">All status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th><SortBtn field="full_name" label="Name" /></th>
                <th>Phone</th>
                <th><SortBtn field="role" label="Role" /></th>
                <th>Status</th>
                <th>Score</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paged.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-brand-500/20 flex items-center justify-center text-brand-400 font-bold text-xs shrink-0">
                        {u.full_name?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-200 text-sm">{u.full_name}</p>
                        <p className="text-xs text-slate-500">{u.email || "—"}</p>
                      </div>
                    </div>
                  </td>
                  <td className="text-slate-400 text-sm">{u.phone_number}</td>
                  <td><RoleBadge role={u.role} /></td>
                  <td>
                    <span className={`badge ${u.is_active ? "badge-green" : "badge-red"}`}>
                      {u.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="text-brand-400 font-semibold">{Number(u.reliability_score || 0).toFixed(1)}</td>
                  <td>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <select
                        className="input-sm w-28 text-xs"
                        defaultValue={u.role}
                        onChange={(e) => { if (e.target.value !== u.role) updateUser(u.id, { role: e.target.value }); }}
                      >
                        {["buyer", "seller", "field_agent", "admin"].map((r) => (
                          <option key={r} value={r}>{r.replace("_", " ")}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => updateUser(u.id, { is_active: !u.is_active })}
                        className={`btn text-xs px-2 py-1 ${u.is_active ? "btn-danger" : "btn-success"}`}
                      >
                        {u.is_active ? <UserX size={12} /> : <UserCheck size={12} />}
                        {u.is_active ? "Disable" : "Enable"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="p-4 border-t border-surface-border flex items-center justify-between">
            <p className="text-xs text-slate-500">
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
            </p>
            <div className="flex gap-1">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="btn btn-secondary text-xs px-3 py-1.5">Prev</button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((p) => (
                <button key={p} onClick={() => setPage(p)}
                  className={`btn text-xs px-3 py-1.5 ${p === page ? "btn-primary" : "btn-secondary"}`}>{p}</button>
              ))}
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="btn btn-secondary text-xs px-3 py-1.5">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
