import { useState, useEffect, useRef, useCallback } from "react";
import {
  X, Phone, MapPin, Package, Send, MessageSquare,
  User, Truck, CreditCard, Calendar, CheckCircle2,
} from "lucide-react";
import { api } from "../api.js";

const STATUS_CLS = {
  pending:    "badge-yellow",
  confirmed:  "badge-blue",
  in_transit: "badge-purple",
  delivered:  "badge-green",
  cancelled:  "badge-red",
  disputed:   "badge-red",
};

// ── Chat thread ───────────────────────────────────────────────────────────────
function ChatThread({ orderId, authUser, token, notify }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef(null);

  const loadMessages = useCallback(async () => {
    try {
      const rows = await api.getOrderMessages(orderId, token);
      setMessages(rows);
    } catch (e) { notify(e.message, "error"); }
    finally { setLoading(false); }
  }, [orderId, token, notify]);

  useEffect(() => { loadMessages(); }, [loadMessages]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Poll for new messages every 10s
  useEffect(() => {
    const interval = setInterval(loadMessages, 10000);
    return () => clearInterval(interval);
  }, [loadMessages]);

  const send = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setSending(true);
    try {
      await api.sendOrderMessage(orderId, text.trim(), token);
      setText("");
      await loadMessages();
    } catch (err) { notify(err.message, "error"); }
    finally { setSending(false); }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 mb-3">
        <MessageSquare size={15} className="text-brand-400" />
        <p className="text-sm font-bold text-slate-200">Order Chat</p>
        <p className="text-xs text-slate-500 ml-auto">Messages are private between buyer and seller</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 min-h-[200px] max-h-[300px] pr-1">
        {loading ? (
          <div className="space-y-2">
            {[1,2,3].map(i => <div key={i} className="skeleton h-10 rounded-xl" />)}
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8">
            <MessageSquare size={28} className="text-slate-700 mx-auto mb-2" />
            <p className="text-sm text-slate-500">No messages yet</p>
            <p className="text-xs text-slate-600 mt-1">Start the conversation to coordinate delivery</p>
          </div>
        ) : (
          messages.map((m) => {
            const isMe = m.sender_id === authUser?.id;
            return (
              <div key={m.id} className={`flex gap-2 ${isMe ? "flex-row-reverse" : ""}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                  isMe ? "bg-brand-500/20 text-brand-400" : "bg-slate-500/20 text-slate-400"
                }`}>
                  {m.sender_name?.[0]?.toUpperCase()}
                </div>
                <div className={`max-w-[75%] ${isMe ? "items-end" : "items-start"} flex flex-col gap-0.5`}>
                  <div className={`px-3 py-2 rounded-2xl text-sm ${
                    isMe
                      ? "bg-brand-500/20 text-brand-100 rounded-tr-sm"
                      : "bg-surface-hover text-slate-200 rounded-tl-sm"
                  }`}>
                    {m.message}
                  </div>
                  <p className="text-xs text-slate-600 px-1">
                    {m.sender_name} · {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={send} className="flex gap-2 mt-3 pt-3 border-t border-surface-border">
        <input
          className="input flex-1 text-sm py-2"
          placeholder="Type a message… (delivery address, timing, etc.)"
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={1000}
        />
        <button type="submit" disabled={sending || !text.trim()} className="btn btn-primary px-3 py-2">
          <Send size={15} />
        </button>
      </form>
    </div>
  );
}

// ── Main modal ────────────────────────────────────────────────────────────────
export default function OrderDetailModal({ orderId, authUser, token, notify, onClose, onStatusUpdate }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("info");

  useEffect(() => {
    api.getOrderDetail(orderId, token)
      .then(setDetail)
      .catch((e) => notify(e.message, "error"))
      .finally(() => setLoading(false));
  }, [orderId, token, notify]);

  if (!detail && loading) {
    return (
      <div className="modal-backdrop">
        <div className="modal max-w-2xl">
          <div className="space-y-3">
            {[1,2,3,4].map(i => <div key={i} className="skeleton h-16 rounded-xl" />)}
          </div>
        </div>
      </div>
    );
  }

  if (!detail) return null;

  const total = Number(detail.agreed_price_etb) * Number(detail.matched_quantity);
  const paid = Number(detail.paid_amount || 0);
  const isBuyer = authUser?.id === detail.buyer_id;
  const isSeller = authUser?.id === detail.seller_id;

  // What the current user sees about the OTHER party
  const counterparty = isBuyer
    ? { label: "Seller", name: detail.seller_name, phone: detail.seller_phone, email: detail.seller_email, address: detail.pickup_location || detail.seller_address }
    : { label: "Buyer", name: detail.buyer_name, phone: detail.buyer_phone, email: detail.buyer_email, address: detail.delivery_location_text };

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal max-w-2xl max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-100">{detail.commodity_name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className={`badge ${STATUS_CLS[detail.status] || "badge-gray"}`}>
                {detail.status.replace("_", " ")}
              </span>
              <span className="text-xs text-slate-500">
                {new Date(detail.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="btn btn-icon btn-ghost"><X size={18} /></button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-surface rounded-xl mb-5">
          {[
            { id: "info", label: "Order Info", icon: Package },
            { id: "contact", label: "Contact & Delivery", icon: Truck },
            { id: "chat", label: "Chat", icon: MessageSquare },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === id ? "bg-brand-500 text-slate-900 shadow" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Icon size={13} /> {label}
            </button>
          ))}
        </div>

        {/* ── Info tab ── */}
        {activeTab === "info" && (
          <div className="space-y-4">
            {/* Order summary */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Quantity", value: `${detail.matched_quantity} ${detail.unit}`, icon: Package },
                { label: "Price / unit", value: `${Number(detail.agreed_price_etb).toLocaleString()} ETB`, icon: CreditCard },
                { label: "Order Total", value: `${total.toLocaleString()} ETB`, icon: CreditCard },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="bg-surface-hover rounded-xl p-3 text-center">
                  <p className="text-xs text-slate-500 mb-1">{label}</p>
                  <p className="text-sm font-bold text-slate-200">{value}</p>
                </div>
              ))}
            </div>

            {/* Payment status */}
            <div className={`p-4 rounded-xl border ${paid >= total ? "bg-emerald-500/5 border-emerald-500/20" : "bg-brand-500/5 border-brand-500/20"}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {paid >= total
                    ? <CheckCircle2 size={16} className="text-emerald-400" />
                    : <CreditCard size={16} className="text-brand-400" />}
                  <p className="text-sm font-semibold text-slate-200">
                    {paid >= total ? "Fully Paid" : "Payment Pending"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-emerald-400">{paid.toLocaleString()} ETB paid</p>
                  {paid < total && (
                    <p className="text-xs text-brand-400">{(total - paid).toLocaleString()} ETB remaining</p>
                  )}
                </div>
              </div>
              {isBuyer && paid < total && detail.status !== "cancelled" && (
                <p className="text-xs text-slate-500 mt-2">
                  Pay via <strong className="text-slate-300">Telebirr, bank transfer, or cash</strong> and record it in the Orders page using the Pay button.
                </p>
              )}
            </div>

            {/* Commodity details */}
            <div className="card p-4 space-y-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Commodity Details</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-slate-500">Quality:</span> <span className="text-slate-200 capitalize ml-1">{detail.quality || "standard"}</span></div>
                <div><span className="text-slate-500">Harvest date:</span> <span className="text-slate-200 ml-1">{detail.harvest_or_catch_date ? new Date(detail.harvest_or_catch_date).toLocaleDateString() : "—"}</span></div>
                {detail.quality_notes && (
                  <div className="col-span-2"><span className="text-slate-500">Notes:</span> <span className="text-slate-300 ml-1">{detail.quality_notes}</span></div>
                )}
              </div>
            </div>

            {/* Delivery timing */}
            <div className="card p-4 space-y-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar size={12} /> Delivery Schedule
              </p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-xs text-slate-500">Preferred delivery</p>
                  <p className="text-slate-200">{detail.preferred_delivery_datetime ? new Date(detail.preferred_delivery_datetime).toLocaleString() : "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Deadline</p>
                  <p className="text-slate-200">{detail.deadline_datetime ? new Date(detail.deadline_datetime).toLocaleString() : "—"}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Contact & Delivery tab ── */}
        {activeTab === "contact" && (
          <div className="space-y-4">
            {/* Counterparty contact */}
            <div className="card p-5 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <User size={15} className="text-brand-400" />
                <p className="text-sm font-bold text-slate-200">{counterparty.label} Contact</p>
              </div>
              <div className="flex items-center gap-3 p-3 bg-surface-hover rounded-xl">
                <div className="w-10 h-10 rounded-full bg-brand-500/20 flex items-center justify-center text-brand-400 font-bold text-lg shrink-0">
                  {counterparty.name?.[0]?.toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-slate-200">{counterparty.name}</p>
                  {counterparty.email && <p className="text-xs text-slate-500">{counterparty.email}</p>}
                </div>
              </div>
              {counterparty.phone && (
                <a
                  href={`tel:${counterparty.phone}`}
                  className="flex items-center gap-3 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl hover:bg-emerald-500/15 transition-colors"
                >
                  <Phone size={16} className="text-emerald-400 shrink-0" />
                  <div>
                    <p className="text-xs text-slate-500">Phone (tap to call)</p>
                    <p className="font-semibold text-emerald-400">{counterparty.phone}</p>
                  </div>
                </a>
              )}
            </div>

            {/* Delivery location */}
            <div className="card p-5 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <MapPin size={15} className="text-brand-400" />
                <p className="text-sm font-bold text-slate-200">
                  {isBuyer ? "Pickup Location (Seller)" : "Delivery Location (Buyer)"}
                </p>
              </div>
              <div className="p-3 bg-surface-hover rounded-xl">
                <p className="text-sm text-slate-200">
                  {isBuyer ? (detail.pickup_location || "Contact seller for pickup location") : (detail.delivery_location_text || "Contact buyer for delivery address")}
                </p>
              </div>
              {isBuyer && detail.pickup_location && (
                <p className="text-xs text-slate-500">
                  Coordinate with the seller via the Chat tab to arrange pickup or delivery time.
                </p>
              )}
              {isSeller && detail.delivery_location_text && (
                <p className="text-xs text-slate-500">
                  Deliver to the buyer's location or arrange a meeting point via the Chat tab.
                </p>
              )}
            </div>

            {/* Logistics suggestion */}
            <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20">
              <div className="flex items-start gap-2">
                <Truck size={15} className="text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-blue-300">Need transport?</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Check the <strong className="text-slate-300">Services</strong> tab for cold chain, refrigerated trucks, and motorbike couriers in Bahir Dar.
                  </p>
                </div>
              </div>
            </div>

            {/* Both parties info for admin */}
            {authUser?.role === "admin" && (
              <div className="card p-4 space-y-3">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">All Parties (Admin View)</p>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="space-y-1">
                    <p className="text-slate-400 font-semibold">Buyer</p>
                    <p className="text-slate-200">{detail.buyer_name}</p>
                    <p className="text-slate-400">{detail.buyer_phone}</p>
                    <p className="text-slate-400">{detail.delivery_location_text}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-slate-400 font-semibold">Seller</p>
                    <p className="text-slate-200">{detail.seller_name}</p>
                    <p className="text-slate-400">{detail.seller_phone}</p>
                    <p className="text-slate-400">{detail.pickup_location}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Chat tab ── */}
        {activeTab === "chat" && (
          <ChatThread
            orderId={orderId}
            authUser={authUser}
            token={token}
            notify={notify}
          />
        )}
      </div>
    </div>
  );
}
