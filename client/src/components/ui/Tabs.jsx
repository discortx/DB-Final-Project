import Badge from './Badge';

export default function Tabs({ tabs = [], activeTab, onChange }) {
  return (
    <div className="flex border-b border-[#E0E0E0] gap-1">
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
                  ? 'text-[#0A0A0A] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-black'
                  : 'text-[#888888] hover:text-[#0A0A0A]'
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
