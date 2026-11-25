import { cn } from "../utils/cn";

export default function PageHeader({ title, description, actions, eyebrow }) {
  return (
    <div className="page-header">
      <div className="min-w-0">
        {eyebrow && (
          <div className="text-[11px] font-semibold uppercase tracking-wider text-brand mb-1">{eyebrow}</div>
        )}
        <h1 className="page-title">{title}</h1>
        {description && <p className="page-subtitle">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}
