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
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className={`bg-white border border-[#E0E0E0] rounded-lg w-full ${maxWidth} p-6 shadow-xl`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          {title && (
            <h2 className="text-xl font-semibold text-[#0A0A0A]">{title}</h2>
          )}
          <button
            type="button"
            onClick={onClose}
            className="ml-auto bg-transparent text-[#0A0A0A] rounded-md p-1 hover:bg-[#EFEFEF] transition-colors cursor-pointer focus:outline-none focus:ring-1 focus:ring-black"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div>{children}</div>

        {/* Footer */}
        {footer && (
          <div className="mt-4 flex justify-end gap-2 border-t border-[#E0E0E0] pt-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
