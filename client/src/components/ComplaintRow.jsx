import { Link } from "react-router-dom";
import { CalendarClock, ChevronRight } from "lucide-react";
import { cn } from "../utils/cn";
import StatusBadge from "./StatusBadge";
import PriorityBadge from "./PriorityBadge";

function formatDate(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

export function ComplaintRow({ complaint: c }) {
  const updated = new Date(c.updatedAt).getTime();
  const isOverdue = Boolean(
    c.dueDate && new Date(c.dueDate).getTime() < Date.now() && !["Resolved", "Closed"].includes(c.status)
  );
  return (
    <Link
      to={`/complaints/${c._id}`}
      className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3.5 hover:bg-canvas/70 transition-colors rounded-lg"
    >
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-xs font-medium text-brand">{c.complaintId}</span>
          {isOverdue && (
            <span className="badge badge-danger">Overdue</span>
          )}
        </div>
        <div className="font-medium text-ink-900 truncate mt-0.5">{c.title}</div>
        <div className="text-xs text-ink-500 mt-1 flex flex-wrap gap-x-3">
          <span>{c.category}</span>
          <span>{formatDate(c.createdAt)}</span>
          <span>Updated {formatDate(c.updatedAt)}</span>
        </div>
      </div>
      <div className="flex flex-col items-start sm:items-end gap-2 sm:min-w-[190px]">
        <div className="flex items-center gap-2">
          <StatusBadge status={c.status} />
          <PriorityBadge priority={c.priority} />
        </div>
        <div className="flex items-center gap-3 text-xs text-ink-500">
          <span className={cn(isOverdue && "text-danger-600 font-medium")}>
            <CalendarClock size={12} className="inline mr-1" />
            {c.dueDate ? new Date(c.dueDate).toLocaleDateString(undefined, { day: "numeric", month: "short" }) : "No due date"}
          </span>
          <span className="inline-flex items-center gap-1 font-medium text-brand">
            View details <ChevronRight size={13} />
          </span>
        </div>
      </div>
    </Link>
  );
}
