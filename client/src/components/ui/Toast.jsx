import { useState, useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import useToastStore from '../../store/toastStore';

// Named export for convenience — callers can do: const { addToast } = useToast()
export function useToast() {
  return useToastStore();
}

function ToastItem({ toast }) {
  const removeToast = useToastStore((s) => s.removeToast);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Trigger slide-in on mount
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => setVisible(true));
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  const icons = {
    success: <CheckCircle2 size={16} className="text-[#1A7A4A] shrink-0 mt-0.5" />,
    error: <AlertCircle size={16} className="text-[#CC0000] shrink-0 mt-0.5" />,
    info: <Info size={16} className="text-[#404040] shrink-0 mt-0.5" />,
  };

  const icon = icons[toast.type] || icons.info;

  return (
    <div
      className={`pointer-events-auto bg-white border border-[#E0E0E0] rounded-lg shadow-lg px-4 py-3 flex gap-3 items-start min-w-[300px] max-w-[380px] transition-all duration-300 ease-out ${
        visible
          ? 'translate-x-0 opacity-100'
          : 'translate-x-full opacity-0'
      }`}
    >
      {icon}
      <p className="text-sm text-[#0A0A0A] flex-1">{toast.message}</p>
      <button
        type="button"
        onClick={() => removeToast(toast.id)}
        className="bg-transparent text-[#888888] rounded-md p-0.5 hover:bg-[#EFEFEF] hover:text-[#0A0A0A] transition-colors cursor-pointer focus:outline-none focus:ring-1 focus:ring-black shrink-0"
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  );
}

export default function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  );
}
