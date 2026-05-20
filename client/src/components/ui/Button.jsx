import { useState } from 'react';
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
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);

  const isDisabled = disabled || loading;

  const baseStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    fontFamily: "'DM Sans', sans-serif",
    fontSize: size === 'sm' ? '0.8rem' : size === 'lg' ? '0.95rem' : '0.875rem',
    padding: size === 'sm' ? '5px 14px' : size === 'lg' ? '11px 24px' : '9px 20px',
    borderRadius: '8px',
    cursor: isDisabled ? 'not-allowed' : 'pointer',
    transition: 'all 0.2s ease',
    userSelect: 'none',
    outline: 'none',
    whiteSpace: 'nowrap',
  };

  const variants = {
    primary: {
      normal: {
        background: 'linear-gradient(135deg, #A8192B 0%, #8B1520 100%)',
        color: '#F5F0EF',
        border: '1px solid rgba(196,30,51,0.4)',
        boxShadow: '0 2px 12px rgba(139,21,32,0.3)',
        fontWeight: 600,
        transform: 'translateY(0)',
      },
      hover: {
        background: 'linear-gradient(135deg, #C41E33 0%, #A8192B 100%)',
        color: '#F5F0EF',
        border: '1px solid rgba(196,30,51,0.4)',
        boxShadow: '0 4px 20px rgba(196,30,51,0.45)',
        fontWeight: 600,
        transform: 'translateY(-1px)',
      },
      pressed: {
        background: 'linear-gradient(135deg, #A8192B 0%, #8B1520 100%)',
        color: '#F5F0EF',
        border: '1px solid rgba(196,30,51,0.4)',
        boxShadow: '0 1px 6px rgba(139,21,32,0.3)',
        fontWeight: 600,
        transform: 'translateY(0) scale(0.98)',
      },
      disabled: {
        background: 'rgba(139,21,32,0.25)',
        color: 'rgba(245,240,239,0.35)',
        border: '1px solid rgba(139,21,32,0.15)',
        boxShadow: 'none',
        fontWeight: 600,
        transform: 'none',
      },
    },
    ghost: {
      normal: {
        background: 'transparent',
        color: 'rgba(245,240,239,0.75)',
        border: '1px solid rgba(255,255,255,0.12)',
        boxShadow: 'none',
        fontWeight: 500,
        transform: 'translateY(0)',
      },
      hover: {
        background: 'rgba(255,255,255,0.05)',
        color: '#F5F0EF',
        border: '1px solid rgba(255,255,255,0.2)',
        boxShadow: 'none',
        fontWeight: 500,
        transform: 'translateY(0)',
      },
      pressed: {
        background: 'rgba(255,255,255,0.05)',
        color: '#F5F0EF',
        border: '1px solid rgba(255,255,255,0.2)',
        boxShadow: 'none',
        fontWeight: 500,
        transform: 'scale(0.98)',
      },
      disabled: {
        background: 'transparent',
        color: 'rgba(245,240,239,0.3)',
        border: '1px solid rgba(255,255,255,0.07)',
        boxShadow: 'none',
        fontWeight: 500,
        opacity: 0.4,
        transform: 'none',
      },
    },
    danger: {
      normal: {
        background: 'transparent',
        color: '#E87080',
        border: '1px solid rgba(232,112,128,0.25)',
        boxShadow: 'none',
        fontWeight: 500,
        transform: 'translateY(0)',
      },
      hover: {
        background: 'rgba(232,112,128,0.08)',
        color: '#F08090',
        border: '1px solid rgba(232,112,128,0.4)',
        boxShadow: 'none',
        fontWeight: 500,
        transform: 'translateY(0)',
      },
      pressed: {
        background: 'rgba(232,112,128,0.08)',
        color: '#F08090',
        border: '1px solid rgba(232,112,128,0.4)',
        boxShadow: 'none',
        fontWeight: 500,
        transform: 'scale(0.98)',
      },
      disabled: {
        background: 'transparent',
        color: '#E87080',
        border: '1px solid rgba(232,112,128,0.15)',
        boxShadow: 'none',
        fontWeight: 500,
        opacity: 0.4,
        transform: 'none',
      },
    },
  };

  // secondary is an alias for ghost
  const resolvedVariant = variant === 'secondary' ? 'ghost' : (variant in variants ? variant : 'primary');
  const v = variants[resolvedVariant];
  const variantStyle = isDisabled ? v.disabled : pressed ? v.pressed : hovered ? v.hover : v.normal;

  const spinnerColor = resolvedVariant === 'danger' ? '#E87080'
    : resolvedVariant === 'primary' ? '#F5F0EF'
    : 'rgba(245,240,239,0.6)';

  return (
    <button
      type={type}
      onClick={!isDisabled ? onClick : undefined}
      disabled={isDisabled}
      onMouseEnter={() => !isDisabled && setHovered(true)}
      onMouseLeave={() => { setHovered(false); setPressed(false); }}
      onMouseDown={() => !isDisabled && setPressed(true)}
      onMouseUp={() => setPressed(false)}
      style={{ ...baseStyle, ...variantStyle }}
      className={className}
    >
      {loading && (
        <Loader2 size={14} className="animate-spin shrink-0" style={{ color: spinnerColor }} />
      )}
      {children}
    </button>
  );
}
