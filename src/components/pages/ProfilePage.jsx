import { useState, useEffect } from "react";
import { User, Phone, Mail, MapPin, Globe, Star, Save, Edit2, Shield } from "lucide-react";
import { api } from "../../api.js";

export default function ProfilePage({ authUser, token, notify, setAuthUser }) {
  const [profile, setProfile] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ full_name: "", preferred_language: "en", address_text: "" });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authUser?.id || !token) return;
    setLoading(true);
    Promise.all([
      api.getUser(authUser.id, token),
      api.getReviews({ user_id: authUser.id }),
    ])
      .then(([p, r]) => {
        setProfile(p);
        setReviews(r);
        setForm({
          full_name: p.full_name || "",
          preferred_language: p.preferred_language || "en",
          address_text: p.address_text || "",
        });
      })
      .catch((e) => notify(e.message, "error"))
      .finally(() => setLoading(false));
  }, [authUser?.id, token]);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await api.updateProfile(authUser.id, form, token);
      setProfile((p) => ({ ...p, ...updated }));
      // Update the global authUser so the sidebar/topbar reflect the new name
      const newUser = { ...authUser, ...updated };
      setAuthUser(newUser);
      localStorage.setItem("tal_user", JSON.stringify(newUser));
      setEditing(false);
      notify("Profile updated!", "success");
    } catch (err) {
      notify(err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  if (!authUser) {
    return (
      <div className="card p-12 text-center max-w-md mx-auto">
        <User size={40} className="text-slate-700 mx-auto mb-3" />
        <p className="text-slate-400 font-semibold">Sign in to view your profile</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-2xl space-y-4">
        {[1, 2, 3].map((i) => <div key={i} className="skeleton h-24 rounded-2xl" />)}
      </div>
    );
  }

  const roleColor = {
    admin: "badge-yellow", buyer: "badge-blue",
    seller: "badge-green", field_agent: "badge-purple",
  }[profile?.role] || "badge-gray";

  return (
    <div className="max-w-2xl space-y-5 animate-slide-up">
      <div>
        <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          <User size={20} className="text-brand-400" /> My Profile
        </h1>
        <p className="text-sm text-slate-500 mt-1">Manage your account details and view your reputation.</p>
      </div>

      {/* Profile card */}
      <div className="card p-6">
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-brand-500/20 border-2 border-brand-500/30 flex items-center justify-center text-brand-400 font-extrabold text-2xl">
              {profile?.full_name?.[0]?.toUpperCase() || "?"}
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100">{profile?.full_name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className={`badge ${roleColor} capitalize`}>{profile?.role?.replace("_", " ")}</span>
                {profile?.reliability_score > 0 && (
                  <div className="flex items-center gap-1">
                    <Star size={12} className="text-brand-400 fill-brand-400" />
                    <span className="text-xs font-semibold text-brand-400">
                      {Number(profile.reliability_score).toFixed(1)}
                    </span>
                  </div>
                )}
                <span className={`badge ${profile?.is_active ? "badge-green" : "badge-red"}`}>
                  {profile?.is_active ? "Active" : "Inactive"}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={() => setEditing((v) => !v)}
            className={`btn text-xs px-3 py-2 ${editing ? "btn-secondary" : "btn-primary"}`}
          >
            <Edit2 size={13} /> {editing ? "Cancel" : "Edit Profile"}
          </button>
        </div>

        {/* Info grid */}
        {!editing ? (
          <div className="grid sm:grid-cols-2 gap-3">
            {[
              { icon: Mail,   label: "Email",    value: profile?.email || "—" },
              { icon: Phone,  label: "Phone",    value: profile?.phone_number },
              { icon: Globe,  label: "Language", value: profile?.preferred_language === "am" ? "አማርኛ" : "English" },
              { icon: MapPin, label: "Address",  value: profile?.address_text || "Not set" },
              { icon: Shield, label: "Member since", value: profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : "—" },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="bg-surface-hover rounded-xl p-3 flex items-center gap-3">
                <Icon size={15} className="text-slate-500 shrink-0" />
                <div>
                  <p className="text-xs text-slate-500">{label}</p>
                  <p className="text-sm font-semibold text-slate-200">{value}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <form onSubmit={save} className="space-y-4">
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input
                className="input"
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="form-group">
                <label className="form-label">Preferred Language</label>
                <select
                  className="input"
                  value={form.preferred_language}
                  onChange={(e) => setForm({ ...form, preferred_language: e.target.value })}
                >
                  <option value="en">English</option>
                  <option value="am">አማርኛ</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Address</label>
                <input
                  className="input"
                  placeholder="e.g. Bahir Dar, Kebele 1"
                  value={form.address_text}
                  onChange={(e) => setForm({ ...form, address_text: e.target.value })}
                />
              </div>
            </div>
            <div className="p-3 rounded-xl bg-surface-hover text-xs text-slate-500">
              Email and phone number can only be changed by an admin.
            </div>
            <button type="submit" disabled={saving} className="btn btn-primary w-full">
              <Save size={15} /> {saving ? "Saving…" : "Save Changes"}
            </button>
          </form>
        )}
      </div>

      {/* Reviews received */}
      <div className="card p-5">
        <h2 className="section-title mb-4">
          <Star size={16} className="text-brand-400" />
          Reviews Received
          <span className="ml-auto badge badge-gray">{reviews.length}</span>
        </h2>
        {reviews.length === 0 ? (
          <div className="text-center py-6">
            <Star size={28} className="text-slate-700 mx-auto mb-2" />
            <p className="text-sm text-slate-500">No reviews yet</p>
            <p className="text-xs text-slate-600 mt-1">Reviews appear after completed orders</p>
          </div>
        ) : (
          <div className="space-y-3">
            {reviews.map((r) => (
              <div key={r.id} className="bg-surface-hover rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-brand-500/20 flex items-center justify-center text-brand-400 font-bold text-xs">
                      {r.reviewer_name?.[0]?.toUpperCase()}
                    </div>
                    <span className="text-sm font-semibold text-slate-200">{r.reviewer_name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <span key={n} className={n <= r.rating ? "text-brand-400" : "text-slate-700"}>★</span>
                    ))}
                  </div>
                </div>
                {r.comment && <p className="text-sm text-slate-400 italic">"{r.comment}"</p>}
                <p className="text-xs text-slate-600 mt-1">{new Date(r.created_at).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
