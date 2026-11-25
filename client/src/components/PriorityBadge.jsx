import { cn } from "../utils/cn";

const PRIORITY_TONES = {
  Low: "neutral",
  Medium: "warning",
  High: "danger",
  Critical: "danger",
};

export default function PriorityBadge({ priority, className }) {
  const tone = PRIORITY_TONES[priority] || "neutral";
  return (
    <span
      className={cn(
        "badge",
        `badge-${tone}`,
        className
      )}
    >
      {priority}
    </span>
  );
}
