import { useState, useEffect, useRef } from 'react';

export function DropdownItem({ onClick, danger = false, icon: Icon, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm transition-colors cursor-pointer hover:bg-white/5"
      style={{ color: danger ? '#E87080' : 'rgba(245,240,239,0.85)', background: 'none', border: 'none' }}
    >
      {Icon && <Icon size={14} className="shrink-0" style={{ opacity: 0.7 }} />}
      {children}
    </button>
  );
}

export function DropdownDivider() {
  return <div style={{ height: '1px', background: 'rgba(255,255,255,0.07)', margin: '4px 0' }} />;
}

export default function Dropdown({ trigger, children, align = 'right' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div className="relative inline-block" ref={ref}>
      <div onClick={() => setOpen((prev) => !prev)}>{trigger}</div>
      {open && (
        <div
          className={`absolute ${align === 'right' ? 'right-0' : 'left-0'} top-full mt-1 z-50 py-1 min-w-[160px]`}
          style={{
            background: 'rgba(23,18,20,0.95)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '10px',
            boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
          }}
          onClick={() => setOpen(false)}
        >
          {children}
        </div>
      )}
    </div>
  );
}
