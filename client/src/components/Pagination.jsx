import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "../utils/cn";

export default function Pagination({ page, pages, onChange }) {
  if (pages <= 1) return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
      <span className="text-sm text-ink-500">
        Page <span className="font-medium text-ink-900">{page}</span> of {pages}
      </span>
      <div className="flex items-center gap-2">
        <button className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>
          <ChevronLeft size={14} /> Prev
        </button>
        <button
          className="btn btn-secondary btn-sm"
          disabled={page >= pages}
          onClick={() => onChange(page + 1)}
        >
          Next <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
