import { cn } from "../utils/cn";

export default function Spinner({ label = "Loading…" }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-14 text-ink-500" role="status" aria-live="polite">
      <span className={cn("spinner", "h-6 w-6")} />
      <span className="text-sm">{label}</span>
    </div>
  );
}
