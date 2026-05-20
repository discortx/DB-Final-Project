import Badge from './Badge';

export default function Tabs({ tabs = [], activeTab, onChange }) {
  return (
    <div className="flex border-b border-[rgba(255,255,255,0.08)] gap-1">
      {tabs.map((tab) => {
        const isActive = tab.key === activeTab;
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onChange && onChange(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium cursor-pointer transition-colors whitespace-nowrap relative focus:outline-none
              ${
                isActive
                  ? 'text-[#F5F0EF] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-[#8B1520]'
                  : 'text-[rgba(245,240,239,0.45)] hover:text-[#F5F0EF]'
              }`}
          >
            {tab.label}
            {tab.badge !== undefined && tab.badge !== null && (
              <Badge variant="muted" className="ml-1.5">
                {tab.badge}
              </Badge>
            )}
          </button>
        );
      })}
    </div>
  );
}
