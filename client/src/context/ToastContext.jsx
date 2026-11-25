import { createContext, useCallback, useContext, useRef, useState } from "react";
import { X, CheckCircle, AlertCircle, Info } from "lucide-react";
import { cn } from "../utils/cn";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());
  const push = useCallback((t) => {
    const id = Math.random().toString(36).slice(2);
    const toast = {
      id,
      type: t.type || "info",
      title: t.title || "",
      message: t.message || "",
      link: t.link,
      duration: t.duration ?? 4200,
    };
    setToasts((s) => [...s.slice(-3), toast]);
    const timer = setTimeout(() => {
      setToasts((s) => s.filter((x) => x.id !== id));
      timers.current.delete(id);
    }, toast.duration);
    timers.current.set(id, timer);
  }, []);

  const dismiss = useCallback((id) => {
    const timer = timers.current.get(id);
    if (timer) clearTimeout(timer);
    timers.current.delete(id);
    setToasts((s) => s.filter((x) => x.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ push, dismiss }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[70] flex flex-col gap-2 w-[min(24rem,calc(100vw-2rem))]">
        {toasts.map((t) => (
          <ToastItem key={t.id} id={t.id} type={t.type} title={t.title} message={t.message} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ id, type, title, message, onDismiss }) {
  const meta = {
    success: { icon: CheckCircle, iconClass: "text-success-600", border: "border-success-100" },
    error: { icon: AlertCircle, iconClass: "text-danger-600", border: "border-danger-100" },
    info: { icon: Info, iconClass: "text-brand", border: "border-brand-100" },
  }[type] || {
    icon: Info,
    iconClass: "text-brand",
    border: "border-edge",
  };
  const Icon = meta.icon;
  return (
    <div
      className={cn(
        "card flex items-start gap-3 p-3 shadow-lg border-l-4",
        meta.border
      )}
      role="status"
    >
      <Icon size={18} className={cn("mt-0.5 shrink-0", meta.iconClass)} />
      <div className="min-w-0 flex-1">
        {title && <div className="text-sm font-semibold text-ink-900">{title}</div>}
        {message && <div className="text-sm text-ink-500 mt-0.5 break-words">{message}</div>}
      </div>
      <button
        onClick={onDismiss}
        className="rounded-lg p-1 text-ink-400 hover:bg-canvas hover:text-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
        aria-label="Dismiss notification"
      >
        <X size={14} />
      </button>
    </div>
  );
}

export const useToast = () => useContext(ToastContext);
