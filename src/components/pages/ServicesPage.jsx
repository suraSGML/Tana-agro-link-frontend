import { useState } from "react";
import { Truck, Phone, MapPin, BookOpen, CheckCircle, Star, Plus, X, Edit2, Trash2 } from "lucide-react";
import { api } from "../../api.js";

const SERVICE_ICONS = {
  cold_storage:       { emoji: "🧊", color: "text-blue-400",   bg: "bg-blue-500/10",   border: "border-blue-500/20" },
  refrigerated_truck: { emoji: "🚛", color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/20" },
  motorbike_courier:  { emoji: "🏍️", color: "text-green-400",  bg: "bg-green-500/10",  border: "border-green-500/20" },
};
const getStyle = (type) => SERVICE_ICONS[type] || { emoji: "🚚", color: "text-slate-400", bg: "bg-slate-500/10", border: "border-slate-500/20" };

function LogisticsCard({ provider, canManage, onEdit, onDelete, onToggle }) {
  const style = getStyle(provider.service_type);
  return (
    <div className="card-hover p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div className={`w-12 h-12 rounded-2xl ${style.bg} border ${style.border} flex items-center justify-center text-2xl`}>
          {style.emoji}
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`badge border ${style.border} ${style.color} text-xs`}>
            {provider.service_type.replace(/_/g, " ")}
          </span>
          <span className={`badge ${provider.is_available ? "badge-green" : "badge-red"}`}>
            {provider.is_available ? "Available" : "Unavailable"}
          </span>
        </div>
      </div>
      <div>
        <h3 className="font-bold text-slate-100">{provider.provider_name}</h3>
        {provider.location_text && (
          <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
            <MapPin size={11} /><span>{provider.location_text}</span>
          </div>
        )}
      </div>
      {provider.price_notes && (
        <p className="text-xs text-slate-400 bg-surface-hover rounded-lg px-3 py-2">{provider.price_notes}</p>
      )}
      <div className="flex items-center justify-between mt-auto pt-2 border-t border-surface-border">
        <a
          href={`tel:${provider.phone_number}`}
          className="flex items-center gap-1.5 text-sm font-semibold text-brand-400 hover:text-brand-300 transition-colors"
        >
          <Phone size={13} />{provider.phone_number}
        </a>
        {/* FIX #10: management actions */}
        {canManage && (
          <div className="flex gap-1">
            <button onClick={() => onToggle(provider)} className={`btn text-xs px-2 py-1 ${provider.is_available ? "btn-danger" : "btn-success"}`}>
              {provider.is_available ? "Disable" : "Enable"}
            </button>
            <button onClick={() => onEdit(provider)} className="btn btn-secondary text-xs px-2 py-1">
              <Edit2 size={11} />
            </button>
            <button onClick={() => onDelete(provider.id)} className="btn btn-danger text-xs px-2 py-1">
              <Trash2 size={11} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// FIX #10: Add/Edit logistics modal
function LogisticsFormModal({ initial, onClose, onSave, notify }) {
  const [form, setForm] = useState(initial || {
    provider_name: "", service_type: "cold_storage",
    phone_number: "", location_text: "", price_notes: "",
  });
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.provider_name || !form.phone_number) {
      notify("Provider name and phone are required", "error"); return;
    }
    setLoading(true);
    try { await onSave(form); onClose(); }
    catch (err) { notify(err.message, "error"); }
    finally { setLoading(false); }
  };

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-100">{initial ? "Edit Provider" : "Add Provider"}</h2>
          <button onClick={onClose} className="btn btn-icon btn-ghost"><X size={18} /></button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <div className="form-group">
            <label className="form-label">Provider Name</label>
            <input className="input" placeholder="Blue Nile Cold Chain" value={form.provider_name}
              onChange={(e) => setForm({ ...form, provider_name: e.target.value })} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="form-group">
              <label className="form-label">Service Type</label>
              <select className="input" value={form.service_type}
                onChange={(e) => setForm({ ...form, service_type: e.target.value })}>
                <option value="cold_storage">Cold Storage</option>
                <option value="refrigerated_truck">Refrigerated Truck</option>
                <option value="motorbike_courier">Motorbike Courier</option>
                <option value="van_delivery">Van Delivery</option>
                <option value="boat_transport">Boat Transport</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <input className="input" placeholder="+251..." value={form.phone_number}
                onChange={(e) => setForm({ ...form, phone_number: e.target.value })} required />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Location</label>
            <input className="input" placeholder="Near Abay Market, Bahir Dar" value={form.location_text}
              onChange={(e) => setForm({ ...form, location_text: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Price Notes</label>
            <input className="input" placeholder="From 250 ETB/day per crate" value={form.price_notes}
              onChange={(e) => setForm({ ...form, price_notes: e.target.value })} />
          </div>
          <button type="submit" disabled={loading} className="btn btn-primary w-full">
            {loading ? "Saving…" : initial ? "Update Provider" : "Add Provider"}
          </button>
        </form>
      </div>
    </div>
  );
}

function ResourceCard({ resource }) {
  return (
    <div className="card-hover p-5 flex flex-col gap-3">
      <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center">
        <BookOpen size={18} className="text-brand-400" />
      </div>
      <div>
        <h3 className="font-bold text-slate-100">{resource.title_en}</h3>
        <p className="text-xs text-slate-500 mt-0.5">{resource.title_am}</p>
      </div>
      <p className="text-sm text-slate-400 leading-relaxed flex-1">{resource.summary_en}</p>
      <button className="btn btn-secondary text-xs w-full">Read Guide</button>
    </div>
  );
}

export default function ServicesPage({ logistics, resources, token, authUser, notify, setLogistics }) {
  const [showForm, setShowForm] = useState(false);
  const [editingProvider, setEditingProvider] = useState(null);

  const canManage = authUser?.role === "admin" || authUser?.role === "field_agent";

  const handleAdd = async (form) => {
    const created = await api.createLogistics(form, token);
    setLogistics((prev) => [...prev, created]);
    notify("Provider added!", "success");
  };

  const handleEdit = async (form) => {
    const updated = await api.updateLogistics(editingProvider.id, form, token);
    setLogistics((prev) => prev.map((p) => p.id === updated.id ? updated : p));
    notify("Provider updated!", "success");
    setEditingProvider(null);
  };

  const handleToggle = async (provider) => {
    const updated = await api.updateLogistics(provider.id, { is_available: !provider.is_available }, token);
    setLogistics((prev) => prev.map((p) => p.id === updated.id ? updated : p));
    notify(`Provider ${updated.is_available ? "enabled" : "disabled"}`, "success");
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this logistics provider?")) return;
    try {
      await api.deleteLogistics(id, token);
      setLogistics((prev) => prev.filter((p) => p.id !== id));
      notify("Provider deleted", "success");
    } catch (err) { notify(err.message, "error"); }
  };

  return (
    <div className="space-y-8 animate-slide-up">
      <div>
        <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          <Truck size={20} className="text-brand-400" /> Services & Trust
        </h1>
        <p className="text-sm text-slate-500 mt-1">Logistics providers and farmer resources in the Bahir Dar region.</p>
      </div>

      {/* Trust indicators */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: Star,        label: "Reliability Scores",  desc: "Every seller rated by buyers" },
          { icon: CheckCircle, label: "Verified Listings",   desc: "Field agent verified inventory" },
          { icon: Truck,       label: "Cold Chain Network",  desc: "Refrigerated transport options" },
          { icon: Phone,       label: "Direct Contact",      desc: "Call providers directly" },
        ].map(({ icon: Icon, label, desc }) => (
          <div key={label} className="card p-4 flex flex-col gap-2">
            <div className="w-9 h-9 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center">
              <Icon size={16} className="text-brand-400" />
            </div>
            <p className="text-sm font-bold text-slate-200">{label}</p>
            <p className="text-xs text-slate-500">{desc}</p>
          </div>
        ))}
      </div>

      {/* Logistics */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-title">
            <Truck size={17} className="text-brand-400" />
            Logistics Directory
            <span className="ml-auto badge badge-gray">{logistics.length} providers</span>
          </h2>
          {/* FIX #10: add button for admin/field_agent */}
          {canManage && (
            <button onClick={() => setShowForm(true)} className="btn btn-primary text-xs px-3 py-2">
              <Plus size={13} /> Add Provider
            </button>
          )}
        </div>
        {logistics.length === 0 ? (
          <div className="card p-10 text-center">
            <Truck size={36} className="text-slate-700 mx-auto mb-3" />
            <p className="text-slate-500">No logistics providers listed yet</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {logistics.map((p) => (
              <LogisticsCard
                key={p.id}
                provider={p}
                canManage={canManage}
                onEdit={(prov) => setEditingProvider(prov)}
                onDelete={handleDelete}
                onToggle={handleToggle}
              />
            ))}
          </div>
        )}
      </div>

      {/* Resources */}
      <div>
        <h2 className="section-title mb-4">
          <BookOpen size={17} className="text-brand-400" />
          Farmer Resources
        </h2>
        {resources.length === 0 ? (
          <div className="card p-10 text-center">
            <BookOpen size={36} className="text-slate-700 mx-auto mb-3" />
            <p className="text-slate-500">No resources available</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {resources.map((r) => <ResourceCard key={r.id} resource={r} />)}
          </div>
        )}
      </div>

      {/* Modals */}
      {showForm && (
        <LogisticsFormModal
          onClose={() => setShowForm(false)}
          onSave={handleAdd}
          notify={notify}
        />
      )}
      {editingProvider && (
        <LogisticsFormModal
          initial={editingProvider}
          onClose={() => setEditingProvider(null)}
          onSave={handleEdit}
          notify={notify}
        />
      )}
    </div>
  );
}
