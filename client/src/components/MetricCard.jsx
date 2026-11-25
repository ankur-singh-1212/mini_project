import { cn } from "../utils/cn";

export default function MetricCard({ label, value, hint, icon: Icon, tone = "brand" }) {
  const toneClass =
    tone === "success" ? "text-success-600 bg-success-50" :
    tone === "warning" ? "text-warning-600 bg-warning-50" :
    tone === "danger" ? "text-danger-600 bg-danger-50" :
    "text-brand bg-brand-50";
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="label">{label}</div>
          <div className="metric-value mt-3 truncate">{value}</div>
          {hint && <div className="text-xs text-ink-500 mt-2">{hint}</div>}
        </div>
        {Icon && (
          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", toneClass)}>
            <Icon size={18} />
          </div>
        )}
      </div>
    </div>
  );
}
