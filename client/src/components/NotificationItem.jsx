import { Link } from "react-router-dom";
import { Bell } from "lucide-react";
import { cn } from "../utils/cn";

const TYPE_LABELS = {
  complaint_submitted: "Submitted",
  assigned: "Assigned",
  status_update: "Status update",
  new_comment: "New reply",
  sla_breach: "SLA breach",
  escalation: "Escalated",
};

export function NotificationItem({ notification: n }) {
  const Icon = Bell;
  return (
    <div className={cn("flex items-start gap-3", !n.read && "opacity-100")}>
      <span className="mt-0.5 w-8 h-8 rounded-lg bg-brand/10 text-brand flex items-center justify-center shrink-0">
        <Icon size={14} />
      </span>
      <div className="min-w-0 flex-1">        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium text-ink-900 truncate">{n.title}</span>
          {!n.read && <span className="badge badge-primary">New</span>}
        </div>
        <p className="text-sm text-ink-500 mt-0.5 break-words">{n.message}</p>
        <div className="text-xs text-ink-300 mt-1 flex items-center gap-2">
          <span>{new Date(n.createdAt).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
          {n.type && <span>· {TYPE_LABELS[n.type] || n.type}</span>}
        </div>
        {n.link && (
          <Link to={n.link} className="text-xs font-medium text-brand hover:underline">
            Open related complaint →
          </Link>
        )}
      </div>
    </div>
  );
}
