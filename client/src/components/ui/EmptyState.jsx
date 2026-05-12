export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center gap-3">
      {Icon && <Icon size={48} className="text-[#C0C0C0]" />}
      {title && (
        <p className="text-base font-semibold text-[#404040]">{title}</p>
      )}
      {description && (
        <p className="text-sm text-[#888888] max-w-sm">{description}</p>
      )}
      {action && <div>{action}</div>}
    </div>
  );
}
