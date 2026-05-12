import { useState, useEffect, useRef } from 'react';

export function DropdownItem({ onClick, danger = false, icon: Icon, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 text-sm hover:bg-[#F7F7F7] cursor-pointer flex items-center gap-2 w-full text-left transition-colors ${
        danger ? 'text-[#CC0000] hover:bg-[#FFF5F5]' : 'text-[#0A0A0A]'
      }`}
    >
      {Icon && <Icon size={14} className="shrink-0" />}
      {children}
    </button>
  );
}

export function DropdownDivider() {
  return <hr className="border-t border-[#E0E0E0] my-1" />;
}

export default function Dropdown({ trigger, children, align = 'right' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  return (
    <div className="relative inline-block" ref={ref}>
      <div onClick={() => setOpen((prev) => !prev)}>{trigger}</div>
      {open && (
        <div
          className={`absolute ${align === 'right' ? 'right-0' : 'left-0'} top-full mt-1 z-50 bg-white border border-[#E0E0E0] rounded-lg shadow-md py-1 min-w-[160px]`}
          onClick={() => setOpen(false)}
        >
          {children}
        </div>
      )}
    </div>
  );
}
