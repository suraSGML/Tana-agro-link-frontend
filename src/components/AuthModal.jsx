import { useState } from "react";
import { X, Phone, Mail, Lock, User, ChevronRight, ArrowLeft, KeyRound } from "lucide-react";
import { api } from "../api.js";

// ── Forgot / Reset password sub-component ────────────────────────────────────
function ForgotPassword({ notify, onBack }) {
  const [step, setStep] = useState("request"); // request | reset
  const [email, setEmail] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [devToken, setDevToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const requestReset = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.requestPasswordReset(email);
      if (res.dev_reset_token) setDevToken(res.dev_reset_token);
      setStep("reset");
      notify("Reset token sent (check dev preview below)", "success");
    } catch (err) { notify(err.message, "error"); }
    finally { setLoading(false); }
  };

  const doReset = async (e) => {
    e.preventDefault();
    if (newPassword !== confirm) { notify("Passwords do not match", "error"); return; }
    if (newPassword.length < 8) { notify("Password must be at least 8 characters", "error"); return; }
    setLoading(true);
    try {
      await api.resetPassword(resetToken, newPassword);
      notify("Password reset! You can now sign in.", "success");
      onBack();
    } catch (err) { notify(err.message, "error"); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="btn btn-ghost text-xs px-2 py-1 -ml-1">
        <ArrowLeft size={13} /> Back to login
      </button>
      <div className="flex items-center gap-2 mb-2">
        <KeyRound size={18} className="text-brand-400" />
        <h3 className="font-bold text-slate-200">Reset Password</h3>
      </div>

      {step === "request" ? (
        <form onSubmit={requestReset} className="space-y-4">
          <div className="form-group">
            <label className="form-label">Your Email Address</label>
            <div className="relative">
              <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input className="input pl-10" type="email" placeholder="you@example.com"
                value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
          </div>
          <button type="submit" disabled={loading || !email} className="btn btn-primary w-full">
            {loading ? "Sending…" : "Send Reset Token"} <ChevronRight size={16} />
          </button>
        </form>
      ) : (
        <form onSubmit={doReset} className="space-y-4">
          {devToken && (
            <div className="p-3 rounded-xl bg-brand-500/10 border border-brand-500/20">
              <p className="text-xs text-brand-300 mb-1">Dev Reset Token:</p>
              <p className="text-xs font-mono text-brand-400 break-all">{devToken}</p>
              <button type="button" onClick={() => setResetToken(devToken)}
                className="btn btn-ghost text-xs px-2 py-1 mt-1">
                Auto-fill token
              </button>
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Reset Token</label>
            <input className="input font-mono text-xs" placeholder="Paste token here…"
              value={resetToken} onChange={(e) => setResetToken(e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label">New Password</label>
            <div className="relative">
              <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input className="input pl-10" type="password" placeholder="Min 8 characters"
                value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Confirm Password</label>
            <div className="relative">
              <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input className="input pl-10" type="password" placeholder="Repeat password"
                value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
            </div>
          </div>
          <button type="submit" disabled={loading || !resetToken || !newPassword} className="btn btn-primary w-full">
            {loading ? "Resetting…" : "Set New Password"} <ChevronRight size={16} />
          </button>
        </form>
      )}
    </div>
  );
}

export default function AuthModal({ onClose, onLogin, notify }) {
  const [mode, setMode] = useState("otp");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [devOtp, setDevOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [reg, setReg] = useState({
    full_name: "", email: "", password: "",
    phone_number: "", role: "buyer", preferred_language: "en",
  });
  const [loading, setLoading] = useState(false);

  const wrap = async (fn) => {
    setLoading(true);
    try { await fn(); }
    catch (err) { notify(err.message, "error"); }
    finally { setLoading(false); }
  };

  const requestOtp = () => wrap(async () => {
    const res = await api.requestOtp(phone);
    setDevOtp(res.dev_otp || "");
    setOtpSent(true);
    notify("OTP sent!", "success");
  });

  const verifyOtp = () => wrap(async () => {
    const res = await api.verifyOtp(phone, otp);
    onLogin(res);
  });

  const loginEmail = () => wrap(async () => {
    const res = await api.login(email, password);
    onLogin(res);
  });

  const register = () => wrap(async () => {
    const res = await api.register(reg);
    onLogin(res);
  });

  const tabs = [
    { id: "otp",      label: "SMS OTP" },
    { id: "email",    label: "Email" },
    { id: "register", label: "Register" },
  ];

  // Don't show tabs when in forgot-password sub-mode
  const showTabs = mode !== "forgot";

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-100">Welcome to Tana-Agro Link</h2>
            <p className="text-sm text-slate-500 mt-0.5">Sign in to access your dashboard</p>
          </div>
          <button onClick={onClose} className="btn btn-icon btn-ghost">
            <X size={18} />
          </button>
        </div>

        {/* Mode tabs */}
        {showTabs && (
        <div className="flex gap-1 p-1 bg-surface rounded-xl mb-6">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setMode(t.id)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                mode === t.id
                  ? "bg-brand-500 text-slate-900 shadow"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        )}

        {/* OTP */}
        {mode === "otp" && (
          <div className="space-y-4">
            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <div className="relative">
                <Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  className="input pl-10"
                  placeholder="+251 9XX XXX XXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>
            {!otpSent ? (
              <button
                onClick={requestOtp}
                disabled={loading || !phone}
                className="btn btn-primary w-full"
              >
                {loading ? "Sending…" : "Send OTP"} <ChevronRight size={16} />
              </button>
            ) : (
              <>
                <div className="form-group">
                  <label className="form-label">Enter OTP Code</label>
                  <input
                    className="input text-center text-2xl tracking-[0.5em] font-mono"
                    placeholder="000000"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                  />
                  {devOtp && (
                    <p className="text-xs text-brand-400 mt-1 text-center">
                      Dev OTP: <span className="font-mono font-bold">{devOtp}</span>
                    </p>
                  )}
                </div>
                <button
                  onClick={verifyOtp}
                  disabled={loading || otp.length < 6}
                  className="btn btn-primary w-full"
                >
                  {loading ? "Verifying…" : "Verify & Sign In"} <ChevronRight size={16} />
                </button>
                <button onClick={() => setOtpSent(false)} className="btn btn-ghost w-full text-sm">
                  Change phone number
                </button>
              </>
            )}
          </div>
        )}

        {/* Email */}
        {mode === "email" && (
          <div className="space-y-4">
            <div className="form-group">
              <label className="form-label">Email</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  className="input pl-10"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  className="input pl-10"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>
            <button
              onClick={loginEmail}
              disabled={loading || !email || !password}
              className="btn btn-primary w-full"
            >
              {loading ? "Signing in…" : "Sign In"} <ChevronRight size={16} />
            </button>
            <button
              onClick={() => setMode("forgot")}
              className="btn btn-ghost w-full text-xs text-slate-500"
            >
              Forgot password?
            </button>
          </div>
        )}

        {/* Forgot password */}
        {mode === "forgot" && (
          <ForgotPassword notify={notify} onBack={() => setMode("email")} />
        )}

        {/* Register */}
        {mode === "register" && (
          <div className="space-y-3">
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <div className="relative">
                <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  className="input pl-10"
                  placeholder="Abebe Tilahun"
                  value={reg.full_name}
                  onChange={(e) => setReg({ ...reg, full_name: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="form-group">
                <label className="form-label">Email</label>
                <input
                  className="input"
                  type="email"
                  placeholder="you@example.com"
                  value={reg.email}
                  onChange={(e) => setReg({ ...reg, email: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input
                  className="input"
                  placeholder="+251..."
                  value={reg.phone_number}
                  onChange={(e) => setReg({ ...reg, phone_number: e.target.value })}
                />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                className="input"
                type="password"
                placeholder="••••••••"
                value={reg.password}
                onChange={(e) => setReg({ ...reg, password: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="form-group">
                <label className="form-label">Role</label>
                <select
                  className="input"
                  value={reg.role}
                  onChange={(e) => setReg({ ...reg, role: e.target.value })}
                >
                  <option value="buyer">Buyer</option>
                  <option value="seller">Seller</option>
                  <option value="field_agent">Field Agent</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Language</label>
                <select
                  className="input"
                  value={reg.preferred_language}
                  onChange={(e) => setReg({ ...reg, preferred_language: e.target.value })}
                >
                  <option value="en">English</option>
                  <option value="am">አማርኛ</option>
                </select>
              </div>
            </div>
            <button
              onClick={register}
              disabled={loading || !reg.full_name || !reg.email || !reg.password || !reg.phone_number}
              className="btn btn-primary w-full mt-2"
            >
              {loading ? "Creating account…" : "Create Account"} <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
