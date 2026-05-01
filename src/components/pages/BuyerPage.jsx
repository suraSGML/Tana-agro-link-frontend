import { useEffect, useState } from "react";
import { ShoppingCart, Zap, ChevronRight, AlertCircle, List, X, RefreshCw, Ban } from "lucide-react";
import { api } from "../../api.js";

// FIX #11: match result detail modal
function MatchDetailModal({ requestId, token, notify, onClose }) {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getRequestMatches(requestId, token)
      .then(setMatches)
      .catch((e) => notify(e.message, "error"))
      .finally(() => setLoading(false));
  }, [requestId, token, notify]);

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal max-w-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-100">Match Details</h2>
          <button onClick={onClose} className="btn btn-icon btn-ghost"><X size={18} /></button>
        </div>
        {loading ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="skeleton h-16 rounded-xl" />)}</div>
        ) : matches.length === 0 ? (
          <p className="text-slate-500 text-center py-8">No matches found for this request.</p>
        ) : (
          <div className="space-y-3">
            {matches.map((m) => {
              const total = Number(m.agreed_price_etb) * Number(m.matched_quantity);
              const paid = Number(m.paid_amount || 0);
              return (
                <div key={m.id} className="card p-4 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-200">{m.seller_name}</p>
                    <p className="text-xs text-slate-500">{m.seller_phone}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold text-brand-400">{m.matched_quantity} {m.unit}</p>
                    <p className="text-xs text-slate-500">@ {Number(m.agreed_price_etb).toLocaleString()} ETB</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-slate-200">{total.toLocaleString()} ETB</p>
                    <p className={`text-xs ${paid >= total ? "text-emerald-400" : "text-slate-500"}`}>
                      Paid: {paid.toLocaleString()} ETB
                    </p>
                  </div>
                  <div>
                    <span className={`badge ${
                      m.status === "delivered" ? "badge-green" :
                      m.status === "in_transit" ? "badge-purple" :
                      m.status === "confirmed" ? "badge-blue" :
                      m.status === "cancelled" ? "badge-red" : "badge-yellow"
                    }`}>{m.status}</span>
                    <p className="text-xs text-slate-600 mt-1">Score: {m.match_score}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function BuyerPage({ commodities, authUser, token, notify, refreshListings }) {
  const [form, setForm] = useState({
    buyer_id: authUser?.id || "",
    commodity_id: "",
    quantity_needed: "",
    unit: "kg",
    max_price_etb: "",
    preferred_delivery_datetime: "",
    deadline_datetime: "",
    delivery_location_text: "Abay Market, Bahir Dar",
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [lastMatch, setLastMatch] = useState(null);

  // FIX #1: buy request list
  const [myRequests, setMyRequests] = useState([]);
  const [reqLoading, setReqLoading] = useState(false);
  const [detailRequestId, setDetailRequestId] = useState(null);
  const [activeTab, setActiveTab] = useState("new");

  // FIX #5: always use own ID
  useEffect(() => {
    if (authUser?.id) setForm((f) => ({ ...f, buyer_id: authUser.id }));
  }, [authUser]);

  const loadRequests = async () => {
    if (!token) return;
    setReqLoading(true);
    try {
      const rows = await api.getBuyRequests({}, token);
      setMyRequests(rows);
    } catch (e) { notify(e.message, "error"); }
    finally { setReqLoading(false); }
  };

  useEffect(() => {
    if (activeTab === "requests") loadRequests();
  }, [activeTab, token]);

  const validate = () => {
    const e = {};
    if (!form.commodity_id) e.commodity_id = "Commodity is required";
    if (!form.quantity_needed || Number(form.quantity_needed) <= 0) e.quantity_needed = "Quantity must be > 0";
    if (!form.preferred_delivery_datetime) e.preferred_delivery_datetime = "Delivery time required";
    if (!form.deadline_datetime) e.deadline_datetime = "Deadline required";
    return e;
  };

  const submit = async (e) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setLoading(true);
    try {
      const created = await api.createBuyRequest({
        ...form,
        quantity_needed: Number(form.quantity_needed),
        max_price_etb: form.max_price_etb ? Number(form.max_price_etb) : null,
      }, token);
      const match = await api.runMatch(created.id, token);
      setLastMatch({ ...match, requestId: created.id });
      notify(`Buy request created! ${match.matched_orders} match(es) found.`, "success");
      refreshListings();
      loadRequests();
    } catch (err) { notify(`Failed: ${err.message}`, "error"); }
    finally { setLoading(false); }
  };

  const cancelRequest = async (id) => {
    if (!window.confirm("Cancel this buy request?")) return;
    try {
      await api.cancelBuyRequest(id, token);
      notify("Request cancelled", "success");
      loadRequests();
    } catch (e) { notify(e.message, "error"); }
  };

  const F = ({ id, label, children, error }) => (
    <div className="form-group">
      <label className="form-label" htmlFor={id}>{label}</label>
      {children}
      {error && <p className="field-error">{error}</p>}
    </div>
  );

  const STATUS_BADGE = {
    open: "badge-blue", partially_matched: "badge-yellow",
    matched: "badge-green", closed: "badge-gray", cancelled: "badge-red",
  };

  return (
    <div className="max-w-3xl space-y-5 animate-slide-up">
      <div>
        <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          <ShoppingCart size={20} className="text-brand-400" /> Buyer Dashboard
        </h1>
        <p className="text-sm text-slate-500 mt-1">Post buy requests and let the matching engine find the best sellers.</p>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 p-1 bg-surface-card rounded-xl border border-surface-border w-fit">
        {[
          { id: "new",      label: "New Request", icon: ShoppingCart },
          { id: "requests", label: "My Requests", icon: List },
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

      {activeTab === "new" && (
        <>
          {lastMatch && (
            <div className="card p-4 border-emerald-500/30 bg-emerald-500/5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <Zap size={18} className="text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-emerald-300">Matching Complete</p>
                    <p className="text-sm text-slate-400 mt-0.5">
                      {lastMatch.matched_orders} order(s) matched.
                      {lastMatch.unfilled_quantity > 0 && ` ${lastMatch.unfilled_quantity} units unfilled.`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setDetailRequestId(lastMatch.requestId)}
                  className="btn btn-secondary text-xs px-3 py-1.5 shrink-0"
                >
                  View Matches
                </button>
              </div>
            </div>
          )}

          <form onSubmit={submit} className="card p-6 space-y-4">
            <h2 className="section-title mb-2">
              <ShoppingCart size={16} className="text-brand-400" /> New Buy Request
            </h2>

            {/* FIX #5: show who is buying, don't allow changing */}
            {authUser ? (
              <div className="p-3 rounded-xl bg-brand-500/10 border border-brand-500/20">
                <p className="text-xs text-brand-300">
                  Buying as: <span className="font-bold">{authUser.full_name}</span>
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                <AlertCircle size={15} className="text-red-400 shrink-0" />
                <p className="text-xs text-red-300">Sign in to submit buy requests.</p>
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

              <F id="quantity_needed" label="Quantity Needed" error={errors.quantity_needed}>
                <div className="flex gap-2">
                  <input id="quantity_needed" className="input flex-1" type="number" min="0" step="0.01"
                    placeholder="e.g. 50" value={form.quantity_needed}
                    onChange={(e) => setForm({ ...form, quantity_needed: e.target.value })} />
                  <select className="input w-24" value={form.unit}
                    onChange={(e) => setForm({ ...form, unit: e.target.value })}>
                    <option value="kg">kg</option>
                    <option value="piece">piece</option>
                    <option value="quintal">quintal</option>
                  </select>
                </div>
              </F>

              <F id="max_price_etb" label="Max Price (ETB / unit) — optional">
                <input id="max_price_etb" className="input" type="number" min="0" step="0.01"
                  placeholder="Leave blank for any price" value={form.max_price_etb}
                  onChange={(e) => setForm({ ...form, max_price_etb: e.target.value })} />
              </F>

              <F id="preferred_delivery_datetime" label="Preferred Delivery Time" error={errors.preferred_delivery_datetime}>
                <input id="preferred_delivery_datetime" className="input" type="datetime-local"
                  value={form.preferred_delivery_datetime}
                  onChange={(e) => setForm({ ...form, preferred_delivery_datetime: e.target.value })} />
              </F>

              <F id="deadline_datetime" label="Deadline" error={errors.deadline_datetime}>
                <input id="deadline_datetime" className="input" type="datetime-local"
                  value={form.deadline_datetime}
                  onChange={(e) => setForm({ ...form, deadline_datetime: e.target.value })} />
              </F>

              <F id="delivery_location_text" label="Delivery Location">
                <input id="delivery_location_text" className="input" placeholder="e.g. Abay Market, Bahir Dar"
                  value={form.delivery_location_text}
                  onChange={(e) => setForm({ ...form, delivery_location_text: e.target.value })} />
              </F>
            </div>

            <button type="submit" disabled={loading || !token} className="btn btn-primary w-full">
              {loading ? "Submitting & Matching…" : "Submit & Auto-Match"}
              <ChevronRight size={16} />
            </button>
          </form>
        </>
      )}

      {activeTab === "requests" && (
        <div className="card overflow-hidden">
          <div className="p-4 border-b border-surface-border flex items-center justify-between">
            <h2 className="section-title">
              <List size={16} className="text-brand-400" /> My Buy Requests
            </h2>
            <button onClick={loadRequests} disabled={reqLoading} className="btn btn-secondary text-xs px-3 py-1.5">
              <RefreshCw size={13} className={reqLoading ? "animate-spin" : ""} /> Refresh
            </button>
          </div>
          {reqLoading ? (
            <div className="p-4 space-y-3">{[1,2,3].map(i => <div key={i} className="skeleton h-16 rounded-xl" />)}</div>
          ) : myRequests.length === 0 ? (
            <div className="p-12 text-center">
              <ShoppingCart size={36} className="text-slate-700 mx-auto mb-3" />
              <p className="text-slate-400 font-semibold">No buy requests yet</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Commodity</th>
                    <th>Qty</th>
                    <th>Max Price</th>
                    <th>Matches</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {myRequests.map((r) => (
                    <tr key={r.id}>
                      <td className="font-semibold text-slate-200">{r.commodity_name}</td>
                      <td>{r.quantity_needed} {r.unit}</td>
                      <td>{r.max_price_etb ? `${Number(r.max_price_etb).toLocaleString()} ETB` : "Any"}</td>
                      <td>
                        <span className={`badge ${r.match_count > 0 ? "badge-green" : "badge-gray"}`}>
                          {r.match_count} match{r.match_count !== 1 ? "es" : ""}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${STATUS_BADGE[r.status] || "badge-gray"}`}>
                          {r.status.replace("_", " ")}
                        </span>
                      </td>
                      <td>
                        <div className="flex gap-1.5">
                          {r.match_count > 0 && (
                            <button onClick={() => setDetailRequestId(r.id)} className="btn btn-secondary text-xs px-2 py-1">
                              View Matches
                            </button>
                          )}
                          {!["matched", "closed", "cancelled"].includes(r.status) && (
                            <button onClick={() => cancelRequest(r.id)} className="btn btn-danger text-xs px-2 py-1">
                              <Ban size={11} /> Cancel
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

      {detailRequestId && (
        <MatchDetailModal
          requestId={detailRequestId}
          token={token}
          notify={notify}
          onClose={() => setDetailRequestId(null)}
        />
      )}
    </div>
  );
}
