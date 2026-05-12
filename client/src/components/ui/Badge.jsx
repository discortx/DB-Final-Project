export default function Badge({ variant = 'default', children, className = '' }) {
  const variants = {
    default: 'bg-black text-white',
    muted: 'bg-[#EFEFEF] text-[#404040]',
    success: 'bg-[#1A7A4A] text-white',
    danger: 'bg-[#CC0000] text-white',
  };

  return (
    <span
      className={`text-[10px] font-bold rounded-full px-1.5 py-0.5 min-w-[18px] text-center inline-flex items-center justify-center leading-none ${variants[variant] || variants.default} ${className}`}
    >
      {children}
    </span>
  );
}
