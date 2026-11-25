import { useState } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { cn } from "../utils/cn";

const tones = {
  success: { icon: CheckCircle2, iconClass: "text-success-600", ring: "border-success-100" },
  error: { icon: AlertCircle, iconClass: "text-danger-600", ring: "border-danger-100" },
  info: { icon: Info, iconClass: "text-brand", ring: "border-brand-100" },
};

export default function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  wide,
}) {
  const [closing, setClosing] = useState(false);
  if (!open) return null;

  const handleClose = () => {
    if (closing) return;
    setClosing(true);
    setTimeout(() => {
      setClosing(false);
      onClose();
    }, 160);
  };

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-navy-900/40 backdrop-blur-[2px] transition-opacity" onClick={handleClose} />
      <div
        className={cn(
          "relative card w-full max-w-md p-6 transition-all duration-200",
          closing ? "opacity-80 scale-[0.98]" : "opacity-100 scale-100",
          wide && "max-w-2xl"
        )}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-ink-900">{title}</h2>
            {description && <p className="text-sm text-ink-500 mt-1">{description}</p>}
          </div>
          <button
            onClick={handleClose}
            className="rounded-lg p-1.5 text-ink-400 hover:bg-canvas hover:text-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
            aria-label="Close dialog"
          >
            <X size={16} />
          </button>
        </div>
        <div className="mt-4 text-sm text-ink-700">{children}</div>
        {footer && <div className="mt-6 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}
