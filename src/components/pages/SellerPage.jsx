import { useEffect, useState } from "react";
import { Package, Plus, Upload, ChevronRight, AlertCircle, Edit2, List, RefreshCw, X, Eye } from "lucide-react";
import { api } from "../../api.js";

const STATUS_BADGE = {
  active: "badge-green", draft: "badge-gray", reserved: "badge-blue",
  sold: "badge-purple", expired: "badge-red", cancelled: "badge-red",
};

export default function SellerPage({ commodities, authUser, token, notify, refreshListings, sellers }) {
  const [form, setForm] = useState({
    seller_id: authUser?.id || "",
    commodity_id: "",
    quantity_available: "",
    unit: "kg",
    expected_price_etb: "",
    harvest_or_catch_date: "",
    location_text: "Bahir Dar",
    quality: "standard",
    quality_notes: "",
    image_url: "",
  });
  const [editingId, setEditingId] = useState("");
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("new");

  // FIX #3: my listings
  const [myListings, setMyListings] = useState([]);
  const [listLoading, setListLoading] = useState(false);

  // FIX #15: improved bulk upload
  const [bulkRows, setBulkRows] = useState([
    { commodity_id: "", quantity_available: "", expected_price_etb: "", harvest_or_catch_date: "", location_text: "Bahir Dar", quality: "standard" },
  ]);
  const [bulkLoading, setBulkLoading] = useState(false);

  // FIX #5: always use own seller ID
  useEffect(() => {
    if (authUser?.id) setForm((f) => ({ ...f, seller_id: authUser.id }));
  }, [authUser]);

  const loadMyListings = async () => {
    if (!token) return;
    setListLoading(true);
    try {
      const rows = await api.getMyListings(token);
      setMyListings(rows);
    } catch (e) { notify(e.message, "error"); }
    finally { setListLoading(false); }
  };

  useEffect(() => {
    if (activeTab === "listings") loadMyListings();
  }, [activeTab, token]);

  const validate = () => {
    const e = {};
    if (!form.commodity_id) e.commodity_id = "Commodity is required";
    if (!form.quantity_available || Number(form.quantity_available) <= 0) e.quantity_available = "Quantity must be > 0";
    if (!form.harvest_or_catch_date) e.harvest_or_catch_date = "Harvest/catch date is required";
    return e;
  };

  const submit = async (e) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setLoading(true);
    try {
      const payload = {
        ...form,
        quantity_available: Number(form.quantity_available),
        expected_price_etb: form.expected_price_etb ? Number(form.expected_price_etb) : null,
      };
      if (editingId) {
        await api.updateListing(editingId, payload, token);
        notify("Listing updated!", "success");
        setEditingId("");
      } else {
        const created = await api.createListing(payload, token);
        notify(`Listing created: ${created.id.slice(0, 8)}…`, "success");
      }
      setForm((f) => ({ ...f, commodity_id: "", quantity_available: "", expected_price_etb: "", harvest_or_catch_date: "", quality_notes: "", image_url: "", quality: "standard" }));
      refreshListings();
      loadMyListings();
    } catch (err) { notify(`Failed: ${err.message}`, "error"); }
    finally { setLoading(false); }
  };

  const startEdit = (listing) => {
    setForm({
      seller_id: listing.seller_id || authUser?.id || "",
      commodity_id: listing.commodity_id || "",
      quantity_available: listing.quantity_available || "",
      unit: listing.unit || "kg",
      expected_price_etb: listing.expected_price_etb || "",
      harvest_or_catch_date: listing.harvest_or_catch_date?.slice(0, 10) || "",
      location_text: listing.location_text || "Bahir Dar",
      quality: listing.quality || "standard",
      quality_notes: listing.quality_notes || "",
      image_url: listing.image_url || "",
    });
    setEditingId(listing.id);
    setActiveTab("new");
  };

  const deactivateListing = async (id) => {
    if (!window.confirm("Deactivate this listing?")) return;
    try {
      await api.updateListing(id, { status: "cancelled" }, token);
      notify("Listing deactivated", "success");
      loadMyListings();
      refreshListings();
    } catch (e) { notify(e.message, "error"); }
  };

  // FIX #15: bulk upload with form rows instead of raw CSV
  const addBulkRow = () => setBulkRows((r) => [...r, { commodity_id: "", quantity_available: "", expected_price_etb: "", harvest_or_catch_date: "", location_text: "Bahir Dar", quality: "standard" }]);
  const removeBulkRow = (i) => setBulkRows((r) => r.filter((_, idx) => idx !== i));
  const updateBulkRow = (i, field, value) => setBulkRows((r) => r.map((row, idx) => idx === i ? { ...row, [field]: value } : row));

  const submitBulk = async () => {
    const valid = bulkRows.filter((r) => r.commodity_id && r.quantity_available && r.harvest_or_catch_date);
    if (!valid.length) { notify("Fill in at least one complete row", "error"); return; }
    setBulkLoading(true);
    try {
      const res = await api.createBulkListings({
        seller_id: authUser?.id,
        listings: valid.map((r) => ({
          ...r,
          quantity_available: Number(r.quantity_available),
          expected_price_etb: r.expected_price_etb ? Number(r.expected_price_etb) : null,
        })),
      }, token);
      notify(`Bulk upload: ${res.created_count} listings created`, "success");
      setBulkRows([{ commodity_id: "", quantity_available: "", expected_price_etb: "", harvest_or_catch_date: "", location_text: "Bahir Dar", quality: "standard" }]);
      refreshListings();
      loadMyListings();
    } catch (err) { notify(`Bulk failed: ${err.message}`, "error"); }
    finally { setBulkLoading(false); }
  };

  const F = ({ id, label, children, error }) => (
    <div className="form-group">
      <label className="form-label" htmlFor={id}>{label}</label>
      {children}
      {error && <p className="field-error">{error}</p>}
    </div>
  );

  return (
    <div className="max-w-3xl space-y-5 animate-slide-up">
      <div>
        <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          <Package size={20} className="text-brand-400" /> Seller Dashboard
        </h1>
        <p className="text-sm text-slate-500 mt-1">List your inventory and reach buyers across Bahir Dar.</p>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 p-1 bg-surface-card rounded-xl border border-surface-border w-fit flex-wrap">
        {[
          { id: "new",      label: editingId ? "Edit Listing" : "New Listing", icon: Plus },
          { id: "bulk",     label: "Bulk Upload",  icon: Upload },
          { id: "listings", label: "My Listings",  icon: List },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === id ? "bg-brand-500 text-slate-900 shadow" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {/* Single listing form */}
      {activeTab === "new" && (
        <form onSubmit={submit} className="card p-6 space-y-4">
          <h2 className="section-title mb-2">
            {editingId ? <><Edit2 size={16} className="text-brand-400" /> Edit Listing</> : <><Plus size={16} className="text-brand-400" /> New Listing</>}
          </h2>

          {authUser ? (
            authUser.role === "admin" ? (
              <div className="form-group">
                <label className="form-label">Listing on behalf of seller</label>
                <select className="input" value={form.seller_id}
                  onChange={(e) => setForm({ ...form, seller_id: e.target.value })}>
                  <option value="">Select seller…</option>
                  {(sellers || []).map((s) => (
                    <option key={s.id} value={s.id}>{s.full_name}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-brand-500/10 border border-brand-500/20">
                <p className="text-xs text-brand-300">Listing as: <span className="font-bold">{authUser.full_name}</span></p>
              </div>
            )
          ) : (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
              <AlertCircle size={15} className="text-red-400 shrink-0" />
              <p className="text-xs text-red-300">Sign in to create listings.</p>
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-4">
            <F id="commodity_id" label="Commodity" error={errors.commodity_id}>
              <select id="commodity_id" className="input" value={form.commodity_id}
                onChange={(e) => setForm({ ...form, commodity_id: e.target.value })}>
                <option value="">Select commodity…</option>
                {commodities.map((c) => (
                  <option key={c.id} value={c.id}>{c.name_en} ({c.name_am})</option>
                ))}
              </select>
            </F>

            <F id="quantity_available" label="Quantity Available" error={errors.quantity_available}>
              <div className="flex gap-2">
                <input id="quantity_available" className="input flex-1" type="number" min="0" step="0.01"
                  placeholder="e.g. 100" value={form.quantity_available}
                  onChange={(e) => setForm({ ...form, quantity_available: e.target.value })} />
                <select className="input w-24" value={form.unit}
                  onChange={(e) => setForm({ ...form, unit: e.target.value })}>
                  <option value="kg">kg</option>
                  <option value="piece">piece</option>
                  <option value="quintal">quintal</option>
                </select>
              </div>
            </F>

            <F id="expected_price_etb" label="Expected Price (ETB / unit)">
              <input id="expected_price_etb" className="input" type="number" min="0" step="0.01"
                placeholder="Leave blank for negotiable" value={form.expected_price_etb}
                onChange={(e) => setForm({ ...form, expected_price_etb: e.target.value })} />
            </F>

            <F id="harvest_or_catch_date" label="Harvest / Catch Date" error={errors.harvest_or_catch_date}>
              <input id="harvest_or_catch_date" className="input" type="date"
                value={form.harvest_or_catch_date}
                onChange={(e) => setForm({ ...form, harvest_or_catch_date: e.target.value })} />
            </F>

            {/* FIX #13: quality field */}
            <F id="quality" label="Quality Grade">
              <select id="quality" className="input" value={form.quality}
                onChange={(e) => setForm({ ...form, quality: e.target.value })}>
                <option value="standard">Standard</option>
                <option value="premium">Premium</option>
                <option value="mixed">Mixed</option>
              </select>
            </F>

            <F id="location_text" label="Location">
              <input id="location_text" className="input" placeholder="e.g. Bahir Dar"
                value={form.location_text}
                onChange={(e) => setForm({ ...form, location_text: e.target.value })} />
            </F>
          </div>

          <F id="image_url" label="Image URL (optional)">
            <input id="image_url" className="input" placeholder="https://…"
              value={form.image_url}
              onChange={(e) => setForm({ ...form, image_url: e.target.value })} />
          </F>

          <F id="quality_notes" label="Quality Notes (optional)">
            <textarea id="quality_notes" className="input min-h-[80px] resize-none"
              placeholder="Describe quality, freshness, packaging…"
              value={form.quality_notes}
              onChange={(e) => setForm({ ...form, quality_notes: e.target.value })} />
          </F>

          <div className="flex gap-3">
            {editingId && (
              <button type="button" onClick={() => { setEditingId(""); }} className="btn btn-secondary flex-1">
                Cancel Edit
              </button>
            )}
            <button type="submit" disabled={loading || !token} className="btn btn-primary flex-1">
              {loading ? "Saving…" : editingId ? "Update Listing" : "Create Listing"}
              <ChevronRight size={16} />
            </button>
          </div>
        </form>
      )}

      {/* FIX #15: bulk upload with form rows */}
      {activeTab === "bulk" && (
        <div className="card p-6 space-y-4">
          <h2 className="section-title mb-2">
            <Upload size={16} className="text-brand-400" /> Bulk Upload
          </h2>
          <p className="text-xs text-slate-500">Fill in each row. Commodity, quantity, and harvest date are required.</p>

          <div className="space-y-3">
            {bulkRows.map((row, i) => (
              <div key={i} className="card p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-slate-400">Row {i + 1}</p>
                  {bulkRows.length > 1 && (
                    <button onClick={() => removeBulkRow(i)} className="btn btn-icon btn-ghost p-1 text-red-400">
                      <X size={13} />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <select className="input text-xs" value={row.commodity_id}
                    onChange={(e) => updateBulkRow(i, "commodity_id", e.target.value)}>
                    <option value="">Commodity…</option>
                    {commodities.map((c) => <option key={c.id} value={c.id}>{c.name_en}</option>)}
                  </select>
                  <input className="input text-xs" type="number" placeholder="Quantity"
                    value={row.quantity_available} onChange={(e) => updateBulkRow(i, "quantity_available", e.target.value)} />
                  <input className="input text-xs" type="number" placeholder="Price ETB (opt)"
                    value={row.expected_price_etb} onChange={(e) => updateBulkRow(i, "expected_price_etb", e.target.value)} />
                  <input className="input text-xs" type="date"
                    value={row.harvest_or_catch_date} onChange={(e) => updateBulkRow(i, "harvest_or_catch_date", e.target.value)} />
                  <input className="input text-xs" placeholder="Location"
                    value={row.location_text} onChange={(e) => updateBulkRow(i, "location_text", e.target.value)} />
                  <select className="input text-xs" value={row.quality}
                    onChange={(e) => updateBulkRow(i, "quality", e.target.value)}>
                    <option value="standard">Standard</option>
                    <option value="premium">Premium</option>
                    <option value="mixed">Mixed</option>
                  </select>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <button onClick={addBulkRow} className="btn btn-secondary flex-1">
              <Plus size={14} /> Add Row
            </button>
            <button onClick={submitBulk} disabled={bulkLoading || !token} className="btn btn-primary flex-1">
              {bulkLoading ? "Uploading…" : `Upload ${bulkRows.filter(r => r.commodity_id && r.quantity_available).length} Listing(s)`}
              <Upload size={14} />
            </button>
          </div>
        </div>
      )}

      {/* FIX #3: my listings */}
      {activeTab === "listings" && (
        <div className="card overflow-hidden">
          <div className="p-4 border-b border-surface-border flex items-center justify-between">
            <h2 className="section-title">
              <List size={16} className="text-brand-400" /> My Listings
            </h2>
            <button onClick={loadMyListings} disabled={listLoading} className="btn btn-secondary text-xs px-3 py-1.5">
              <RefreshCw size={13} className={listLoading ? "animate-spin" : ""} /> Refresh
            </button>
          </div>
          {listLoading ? (
            <div className="p-4 space-y-3">{[1,2,3].map(i => <div key={i} className="skeleton h-16 rounded-xl" />)}</div>
          ) : myListings.length === 0 ? (
            <div className="p-12 text-center">
              <Package size={36} className="text-slate-700 mx-auto mb-3" />
              <p className="text-slate-400 font-semibold">No listings yet</p>
              <p className="text-slate-600 text-sm mt-1">Create your first listing above</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Commodity</th>
                    <th>Qty</th>
                    <th>Price</th>
                    <th>Quality</th>
                    <th>Orders</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {myListings.map((l) => (
                    <tr key={l.id}>
                      <td className="font-semibold text-slate-200">{l.name_en}</td>
                      <td>{Number(l.quantity_available).toLocaleString()} {l.unit}</td>
                      <td className="text-brand-400">
                        {l.expected_price_etb ? `${Number(l.expected_price_etb).toLocaleString()} ETB` : "—"}
                      </td>
                      <td className="capitalize">{l.quality}</td>
                      <td>
                        <span className={`badge ${l.order_count > 0 ? "badge-blue" : "badge-gray"}`}>
                          {l.order_count}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${STATUS_BADGE[l.status] || "badge-gray"}`}>{l.status}</span>
                      </td>
                      <td>
                        <div className="flex gap-1.5">
                          <button onClick={() => startEdit(l)} className="btn btn-secondary text-xs px-2 py-1">
                            <Edit2 size={11} /> Edit
                          </button>
                          {l.status === "active" && (
                            <button onClick={() => deactivateListing(l.id)} className="btn btn-danger text-xs px-2 py-1">
                              <X size={11} /> Deactivate
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
