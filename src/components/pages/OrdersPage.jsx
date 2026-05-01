import { useState, useEffect, useCallback } from "react";
import { BarChart2, CreditCard, X, RefreshCw, Clock, CheckCircle2, Star, ExternalLink } from "lucide-react";
import { api } from "../../api.js";
import OrderDetailModal from "../OrderDetailModal.jsx";

// ── Status flow: who can do what ─────────────────────────────────────────────
// seller: pending → confirmed (accepts order)
// seller: confirmed → in_transit (ships)
// buyer:  in_transit → delivered (confirms receipt)
// buyer:  pending/confirmed → cancelled (before shipping)
// either: in_transit → disputed
const STATUS_FLOW_SELLER = {
  pending:    ["confirmed", "cancelled"],
  confirmed:  ["in_transit", "cancelled"],
  in_transit: ["disputed"],
  delivered:  [],
  cancelled:  [],
  disputed:   ["cancelled"],
};
const STATUS_FLOW_BUYER = {
  pending:    ["cancelled"],
  confirmed:  ["cancelled"],
  in_transit: ["delivered", "disputed"],
  delivered:  [],
  cancelled:  [],
  disputed:   ["delivered"],
};

const STATUS_CLS = {
  pending:    "badge-yellow",
  confirmed:  "badge-blue",
  in_transit: "badge-purple",
  delivered:  "badge-green",
  cancelled:  "badge-red",
  disputed:   "badge-red",
};

// ── FIX #3: Payment modal — properly refreshes after recording payment ────────
function PaymentModal({ order, onClose, token, notify, onRefresh }) {
  const [payments, setPayments] = useState([]);
  const [loadingPayments, setLoadingPayments] = useState(true);
  const [form, setForm] = useState({ amount_etb: "", payment_method: "telebirr", transaction_ref: "" });
  const [submitting, setSubmitting] = useState(false);

  const loadPayments = useCallback(async () => {
    setLoadingPayments(true);
    try {
      const rows = await api.getOrderPayments(order.id, token);
      setPayments(rows);
    } catch (err) {
      notify(`Load payments failed: ${err.message}`, "error");
    } finally {
      setLoadingPayments(false);
    }
  }, [order.id, token, notify]);

  // Load on mount
  useEffect(() => { loadPayments(); }, [loadPayments]);

  const orderTotal = Number(order.agreed_price_etb) * Number(order.matched_quantity);
  const paidTotal = payments
    .filter((p) => p.payment_status === "completed")
    .reduce((s, p) => s + Number(p.amount_etb), 0);
  const remaining = Math.max(0, orderTotal - paidTotal);

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.payOrder(order.id, {
        amount_etb: Number(form.amount_etb),
        payment_method: form.payment_method,
        transaction_ref: form.transaction_ref || null,
      }, token);
      notify(
        res.is_fully_paid
          ? "Order fully paid!"
          : `Payment recorded. Remaining: ${(res.order_total - res.paid_total).toFixed(2)} ETB`,
        "success"
      );
      setForm({ amount_etb: "", payment_method: "telebirr", transaction_ref: "" });
      await loadPayments(); // FIX #3: refresh payment list immediately
      onRefresh();
    } catch (err) {
      notify(`Payment failed: ${err.message}`, "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal max-w-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-100">Payment — {order.commodity_name}</h2>
          <button onClick={onClose} className="btn btn-icon btn-ghost"><X size={18} /></button>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { label: "Order Total", value: `${orderTotal.toLocaleString()} ETB`, color: "text-slate-200" },
            { label: "Paid",        value: `${paidTotal.toLocaleString()} ETB`,  color: "text-emerald-400" },
            { label: "Remaining",   value: `${remaining.toLocaleString()} ETB`,  color: remaining > 0 ? "text-brand-400" : "text-emerald-400" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-surface-hover rounded-xl p-3 text-center">
              <p className="text-xs text-slate-500 mb-1">{label}</p>
              <p className={`text-sm font-bold ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Payment history */}
        {loadingPayments ? (
          <div className="space-y-2 mb-4">
            {[1,2].map(i => <div key={i} className="skeleton h-10 rounded-xl" />)}
          </div>
        ) : payments.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Payment History</p>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {payments.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-2.5 bg-surface-hover rounded-xl text-sm">
                  <div>
                    <span className="font-semibold text-slate-200">{Number(p.amount_etb).toLocaleString()} ETB</span>
                    <span className="text-slate-500 ml-2 text-xs">{p.payment_method}</span>
                    {p.transaction_ref && <span className="text-slate-600 ml-2 text-xs font-mono">{p.transaction_ref}</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-600">{new Date(p.created_at).toLocaleDateString()}</span>
                    <span className={`badge ${p.payment_status === "completed" ? "badge-green" : "badge-red"}`}>
                      {p.payment_status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* New payment form */}
        {remaining > 0 ? (
          <form onSubmit={submit} className="space-y-3 border-t border-surface-border pt-4">
            <p className="text-sm font-semibold text-slate-300">Record Payment</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="form-group">
                <label className="form-label">Amount (ETB)</label>
                <input
                  className="input"
                  type="number"
                  min="1"
                  max={remaining}
                  step="0.01"
                  placeholder={`Max ${remaining.toFixed(2)}`}
                  value={form.amount_etb}
                  onChange={(e) => setForm({ ...form, amount_etb: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Method</label>
                <select className="input" value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })}>
                  <option value="telebirr">Telebirr</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cash">Cash</option>
                  <option value="chapa">Chapa</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Transaction Ref (optional)</label>
              <input className="input" placeholder="TXN-…" value={form.transaction_ref} onChange={(e) => setForm({ ...form, transaction_ref: e.target.value })} />
            </div>
            <button type="submit" disabled={submitting || !form.amount_etb} className="btn btn-primary w-full">
              {submitting ? "Processing…" : "Record Payment"}
            </button>
          </form>
        ) : (
          <div className="text-center py-4 border-t border-surface-border">
            <CheckCircle2 size={28} className="text-emerald-400 mx-auto mb-2" />
            <span className="badge badge-green text-sm px-4 py-2">Fully Paid</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── FIX #17: Order history timeline modal ─────────────────────────────────────
function HistoryModal({ order, onClose, token, notify }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getOrderHistory(order.id, token)
      .then(setHistory)
      .catch((e) => notify(e.message, "error"))
      .finally(() => setLoading(false));
  }, [order.id, token, notify]);

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-100">Order Timeline</h2>
          <button onClick={onClose} className="btn btn-icon btn-ghost"><X size={18} /></button>
        </div>
        {loading ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="skeleton h-12 rounded-xl" />)}</div>
        ) : history.length === 0 ? (
          <p className="text-slate-500 text-center py-8">No status history yet.</p>
        ) : (
          <div className="relative pl-6">
            <div className="absolute left-2 top-0 bottom-0 w-0.5 bg-surface-border" />
            {history.map((h, i) => (
              <div key={h.id} className="relative mb-4">
                <div className={`absolute -left-4 w-3 h-3 rounded-full border-2 ${
                  i === history.length - 1 ? "bg-brand-500 border-brand-500" : "bg-surface-card border-surface-border"
                }`} />
                <div className="card p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {h.from_status && (
                        <span className={`badge ${STATUS_CLS[h.from_status] || "badge-gray"} text-xs`}>
                          {h.from_status}
                        </span>
                      )}
                      {h.from_status && <span className="text-slate-600 text-xs">→</span>}
                      <span className={`badge ${STATUS_CLS[h.to_status] || "badge-gray"} text-xs`}>
                        {h.to_status}
                      </span>
                    </div>
                    <span className="text-xs text-slate-600">{new Date(h.created_at).toLocaleString()}</span>
                  </div>
                  {h.changed_by_name && (
                    <p className="text-xs text-slate-500 mt-1">by {h.changed_by_name}</p>
                  )}
                  {h.note && <p className="text-xs text-slate-400 mt-1 italic">"{h.note}"</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── FIX #7: Review modal ──────────────────────────────────────────────────────
function ReviewModal({ order, authUser, onClose, token, notify }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const revieweeId = authUser?.id === order.buyer_id ? order.seller_id : order.buyer_id;
  const revieweeName = authUser?.id === order.buyer_id ? order.seller_name : order.buyer_name;

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.createReview({ order_match_id: order.id, reviewee_user_id: revieweeId, rating, comment }, token);
      notify(`Review submitted for ${revieweeName}!`, "success");
      onClose();
    } catch (err) {
      notify(err.message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal max-w-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-100">Leave a Review</h2>
          <button onClick={onClose} className="btn btn-icon btn-ghost"><X size={18} /></button>
        </div>
        <p className="text-sm text-slate-400 mb-4">
          Reviewing: <span className="font-semibold text-slate-200">{revieweeName}</span>
        </p>
        <form onSubmit={submit} className="space-y-4">
          <div className="form-group">
            <label className="form-label">Rating</label>
            <div className="flex gap-2">
              {[1,2,3,4,5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(n)}
                  className={`w-10 h-10 rounded-xl text-lg transition-all ${
                    n <= rating ? "bg-brand-500 text-slate-900" : "bg-surface-hover text-slate-500"
                  }`}
                >
                  ★
                </button>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Comment (optional)</label>
            <textarea
              className="input min-h-[80px] resize-none"
              placeholder="Share your experience…"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>
          <button type="submit" disabled={submitting} className="btn btn-primary w-full">
            {submitting ? "Submitting…" : "Submit Review"}
            <Star size={14} />
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Main OrdersPage ───────────────────────────────────────────────────────────
export default function OrdersPage({
  myOrders, buyerOrders, sellerOrders, recentOrders,
  activeAccountId, setActiveAccountId,
  activeRole, setActiveRole,
  buyers, sellers, token, authUser, notify, refreshOrders, refreshMyOrders, setRecentOrders,
}) {
  const [paymentOrder, setPaymentOrder] = useState(null);
  const [historyOrder, setHistoryOrder] = useState(null);
  const [reviewOrder, setReviewOrder] = useState(null);
  const [detailOrderId, setDetailOrderId] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [noteInput, setNoteInput] = useState("");

  // Logged-in users always see their own orders.
  // Admin can additionally filter by a specific account.
  // Unauthenticated users see nothing (prompted to sign in).
  const displayOrders = (() => {
    if (!authUser) return [];
    if (authUser.role === "admin" && activeAccountId) {
      return activeRole === "buyer" ? buyerOrders : sellerOrders;
    }
    return myOrders;
  })();

  const handleStatusUpdate = async (orderId, status) => {
    try {
      await api.updateOrderStatus(orderId, status, token, noteInput || undefined);
      notify(`Order updated to ${status.replace("_", " ")}`, "success");
      setNoteInput("");
      refreshMyOrders();
      refreshOrders();
      const ro = await api.getRecentOrders();
      setRecentOrders(ro);
    } catch (err) {
      notify(`Update failed: ${err.message}`, "error");
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refreshMyOrders(), refreshOrders()]);
    setRefreshing(false);
  };

  return (
    <div className="space-y-5 animate-slide-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <BarChart2 size={20} className="text-brand-400" /> Orders
          </h1>
          <p className="text-sm text-slate-500 mt-1">{displayOrders.length} order(s)</p>
        </div>
        <button onClick={handleRefresh} disabled={refreshing} className="btn btn-secondary text-xs px-3 py-2">
          <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {/* Account selector — only show for admin */}
      {authUser?.role === "admin" && (
        <div className="card p-4 flex flex-wrap gap-3 items-center">
          <div className="flex gap-1 p-1 bg-surface rounded-xl">
            {["buyer", "seller"].map((r) => (
              <button
                key={r}
                onClick={() => { setActiveRole(r); setActiveAccountId(""); }}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all capitalize ${
                  activeRole === r ? "bg-brand-500 text-slate-900" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
          <select
            className="input flex-1 max-w-xs text-sm"
            value={activeAccountId}
            onChange={(e) => {
              setActiveAccountId(e.target.value);
              if (e.target.value) refreshOrders(e.target.value, activeRole);
            }}
          >
            <option value="">My orders</option>
            {(activeRole === "buyer" ? buyers : sellers).map((u) => (
              <option key={u.id} value={u.id}>{u.full_name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Payment & status guide */}
      {authUser && displayOrders.length > 0 && (
        <div className="card p-4 bg-surface-hover border-surface-border">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">How it works</p>
          <div className="grid sm:grid-cols-4 gap-3 text-xs text-slate-500">
            <div className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-brand-500/20 text-brand-400 font-bold flex items-center justify-center shrink-0 text-xs">1</span>
              <span><strong className="text-slate-300">Seller confirms</strong> the order and prepares goods</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-brand-500/20 text-brand-400 font-bold flex items-center justify-center shrink-0 text-xs">2</span>
              <span><strong className="text-slate-300">Buyer pays</strong> via Telebirr, bank transfer, or cash</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-brand-500/20 text-brand-400 font-bold flex items-center justify-center shrink-0 text-xs">3</span>
              <span><strong className="text-slate-300">Seller ships</strong> and marks order "In Transit"</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-brand-500/20 text-brand-400 font-bold flex items-center justify-center shrink-0 text-xs">4</span>
              <span><strong className="text-slate-300">Buyer confirms</strong> receipt and marks "Delivered"</span>
            </div>
          </div>
        </div>
      )}

      {/* Orders table */}
      {!authUser ? (
        <div className="card p-12 text-center">
          <BarChart2 size={40} className="text-slate-700 mx-auto mb-3" />
          <p className="text-slate-400 font-semibold">Sign in to view your orders</p>
          <p className="text-slate-600 text-sm mt-1">Your purchase and sales history will appear here</p>
        </div>
      ) : displayOrders.length === 0 ? (
        <div className="card p-12 text-center">
          <BarChart2 size={40} className="text-slate-700 mx-auto mb-3" />
          <p className="text-slate-400 font-semibold">No orders yet</p>
          <p className="text-slate-600 text-sm mt-1">Orders appear here after matching</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Commodity</th>
                  <th>Buyer</th>
                  <th>Seller</th>
                  <th>Qty</th>
                  <th>Total</th>
                  <th>Paid</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayOrders.map((o) => {
                  const total = Number(o.agreed_price_etb) * Number(o.matched_quantity);
                  const paid = Number(o.paid_amount || 0);
                  const isBuyer = authUser?.id === o.buyer_id;
                  const isSeller = authUser?.id === o.seller_id;
                  const isAdmin = authUser?.role === "admin";
                  // Role-based next statuses
                  const nextStatuses = isAdmin
                    ? [...(STATUS_FLOW_SELLER[o.status] || []), ...(STATUS_FLOW_BUYER[o.status] || [])].filter((v, i, a) => a.indexOf(v) === i)
                    : isSeller
                    ? (STATUS_FLOW_SELLER[o.status] || [])
                    : isBuyer
                    ? (STATUS_FLOW_BUYER[o.status] || [])
                    : [];
                  const canPay = isBuyer && o.status !== "cancelled" && o.status !== "delivered" && paid < total;
                  const canReview = (isBuyer || isSeller) && o.status === "delivered";

                  return (
                    <tr key={o.id}>
                      <td className="font-semibold text-slate-200">{o.commodity_name}</td>
                      <td className="text-slate-400 text-sm">{o.buyer_name}</td>
                      <td className="text-slate-400 text-sm">{o.seller_name}</td>
                      <td className="text-sm">{o.matched_quantity} {o.unit}</td>
                      <td className="text-brand-400 font-semibold text-sm">{total.toLocaleString()} ETB</td>
                      <td className="text-sm">
                        <span className={paid >= total ? "text-emerald-400 font-semibold" : "text-slate-500"}>
                          {paid.toLocaleString()} ETB
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${STATUS_CLS[o.status] || "badge-gray"}`}>
                          {o.status.replace("_", " ")}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center gap-1 flex-wrap">
                          {/* View full detail + chat */}
                          <button
                            onClick={() => setDetailOrderId(o.id)}
                            className="btn btn-ghost text-xs px-2 py-1 text-slate-400"
                            title="View details & chat"
                          >
                            <ExternalLink size={12} />
                          </button>
                          {/* Status transitions with clear labels */}
                          {nextStatuses.map((s) => {
                            const labels = {
                              confirmed:  "Accept Order",
                              in_transit: "Mark Shipped",
                              delivered:  "Confirm Receipt",
                              cancelled:  "Cancel",
                              disputed:   "Dispute",
                            };
                            return (
                              <button
                                key={s}
                                onClick={() => handleStatusUpdate(o.id, s)}
                                className={`btn text-xs px-2 py-1 ${
                                  s === "cancelled" || s === "disputed" ? "btn-danger" :
                                  s === "delivered" ? "btn-success" : "btn-secondary"
                                }`}
                              >
                                {labels[s] || s.replace("_", " ")}
                              </button>
                            );
                          })}
                          {/* Pay */}
                          {canPay && (
                            <button
                              onClick={() => setPaymentOrder(o)}
                              className="btn btn-ghost text-xs px-2 py-1 text-brand-400"
                            >
                              <CreditCard size={12} /> Pay
                            </button>
                          )}
                          {/* FIX #17: History */}
                          <button
                            onClick={() => setHistoryOrder(o)}
                            className="btn btn-ghost text-xs px-2 py-1 text-slate-400"
                          >
                            <Clock size={12} />
                          </button>
                          {/* FIX #7: Review */}
                          {canReview && (
                            <button
                              onClick={() => setReviewOrder(o)}
                              className="btn btn-ghost text-xs px-2 py-1 text-brand-400"
                            >
                              <Star size={12} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modals */}
      {detailOrderId && (
        <OrderDetailModal
          orderId={detailOrderId}
          authUser={authUser}
          token={token}
          notify={notify}
          onClose={() => setDetailOrderId(null)}
          onStatusUpdate={handleStatusUpdate}
        />
      )}
      {paymentOrder && (
        <PaymentModal
          order={paymentOrder}
          onClose={() => setPaymentOrder(null)}
          token={token}
          notify={notify}
          onRefresh={() => { refreshMyOrders(); refreshOrders(); }}
        />
      )}
      {historyOrder && (
        <HistoryModal
          order={historyOrder}
          onClose={() => setHistoryOrder(null)}
          token={token}
          notify={notify}
        />
      )}
      {reviewOrder && (
        <ReviewModal
          order={reviewOrder}
          authUser={authUser}
          onClose={() => setReviewOrder(null)}
          token={token}
          notify={notify}
        />
      )}
    </div>
  );
}
