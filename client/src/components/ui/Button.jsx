import { Loader2 } from 'lucide-react';

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  onClick,
  type = 'button',
  className = '',
  children,
}) {
  const base =
    'inline-flex items-center justify-center gap-2 font-semibold active:scale-[0.98] transition-all cursor-pointer select-none';

  const variants = {
    primary:
      'bg-black text-white rounded-none text-sm hover:bg-[#222] active:bg-[#444] transition-colors disabled:opacity-50',
    secondary:
      'bg-white text-black border border-black rounded-none text-sm hover:bg-[#F0F0F0] transition-colors disabled:opacity-50',
    ghost:
      'bg-transparent text-[#0A0A0A] rounded-md text-sm hover:bg-[#EFEFEF] transition-colors disabled:opacity-50',
    danger:
      'bg-[#CC0000] text-white rounded-none text-sm hover:bg-[#AA0000] transition-colors disabled:opacity-50',
  };

  const sizes = {
    sm: 'px-3 py-1 text-xs',
    md: 'px-5 py-2',
    lg: 'px-7 py-3 text-base',
  };

  // Ghost size overrides
  const ghostSizes = {
    sm: 'px-3 py-1 text-xs',
    md: 'px-3 py-1.5',
    lg: 'px-5 py-2.5 text-base',
  };

  const sizeClass = variant === 'ghost' ? (ghostSizes[size] || ghostSizes.md) : (sizes[size] || sizes.md);

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${base} ${variants[variant] || variants.primary} ${sizeClass} ${className}`}
    >
      {loading && (
        <Loader2 size={14} className="animate-spin shrink-0" />
      )}
      {children}
    </button>
  );
}
