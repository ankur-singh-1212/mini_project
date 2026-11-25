import { cn } from "../utils/cn";

const STATUS_TONES = {
  Submitted: "neutral",
  "Under Review": "info",
  Assigned: "primary",
  "In Progress": "info",
  "Awaiting User": "warning",
  Resolved: "success",
  Closed: "neutral",
  Reopened: "danger",
};

export default function StatusBadge({ status, className }) {
  const tone = STATUS_TONES[status] || "neutral";
  return (
    <span
      className={cn(
        "badge",
        `badge-${tone}`,
        className
      )}
    >
      <span
        className={cn(
          "inline-block h-1.5 w-1.5 rounded-full mr-1.5",
          tone === "success" && "bg-success-600",
          tone === "neutral" && "bg-ink-300",
          tone === "info" && "bg-info-400",
          tone === "primary" && "bg-brand",
          tone === "warning" && "bg-warning-500",
          tone === "danger" && "bg-danger-500"
        )}
      />
      {status}
    </span>
  );
}
