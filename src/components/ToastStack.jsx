import { CheckCircle, XCircle, Info } from "lucide-react";

const icons = {
  success: <CheckCircle size={16} className="text-emerald-400 shrink-0 mt-0.5" />,
  error:   <XCircle     size={16} className="text-red-400 shrink-0 mt-0.5" />,
  info:    <Info        size={16} className="text-blue-400 shrink-0 mt-0.5" />,
};

export default function ToastStack({ toasts }) {
  if (!toasts.length) return null;
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div key={t.id} className={`toast-${t.type || "info"} pointer-events-auto`}>
          {icons[t.type] || icons.info}
          <span className="flex-1 text-sm">{t.message}</span>
        </div>
      ))}
    </div>
  );
}
