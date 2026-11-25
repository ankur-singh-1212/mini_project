export default function EmptyState({ title = "Nothing here yet", description, icon: Icon, action }) {
  return (
    <div className="empty-state">
      {Icon && <Icon className="text-ink-300 mb-3" size={26} strokeWidth={1.5} />}
      <div className="text-ink-900 font-medium">{title}</div>
      {description && <div className="text-sm text-ink-500 mt-1 max-w-md">{description}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
