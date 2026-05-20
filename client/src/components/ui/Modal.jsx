import { useEffect } from 'react';
import { X } from 'lucide-react';

export default function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  maxWidth = 'max-w-md',
}) {
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        className={`w-full ${maxWidth}`}
        style={{
          background: 'rgba(23,18,20,0.92)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          {title && (
            <h2 style={{ color: '#F5F0EF', fontSize: '1rem', fontWeight: 600 }}>{title}</h2>
          )}
          <button
            type="button"
            onClick={onClose}
            className="ml-auto flex items-center justify-center w-7 h-7 rounded-md transition-colors hover:bg-white/8 cursor-pointer"
            style={{ background: 'rgba(255,255,255,0.06)', border: 'none', color: 'rgba(245,240,239,0.55)' }}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div>{children}</div>

        {footer && (
          <div
            className="mt-4 flex justify-end gap-2 pt-4"
            style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
