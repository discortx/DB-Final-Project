export default function Card({ className = '', children, hover = false }) {
  const base = 'bg-[#F7F7F7] border border-[#E0E0E0] rounded-lg';
  const hoverClass = hover
    ? 'hover:shadow-sm hover:border-[#C0C0C0] transition-all cursor-pointer'
    : '';

  return (
    <div className={`${base} ${hoverClass} ${className}`}>
      {children}
    </div>
  );
}
