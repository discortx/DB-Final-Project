const BG_COLORS = [
  { bg: 'bg-[#E8F0FE]', text: 'text-[#1967D2]' },
  { bg: 'bg-[#FCE8E6]', text: 'text-[#C5221F]' },
  { bg: 'bg-[#E6F4EA]', text: 'text-[#1E7E34]' },
  { bg: 'bg-[#FEF7E0]', text: 'text-[#B06000]' },
  { bg: 'bg-[#F3E8FD]', text: 'text-[#7B1FA2]' },
  { bg: 'bg-[#E8F5E9]', text: 'text-[#2E7D32]' },
];

function hashName(name) {
  if (!name) return 0;
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return hash % BG_COLORS.length;
}

const SIZE_CLASSES = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-24 h-24 text-2xl',
};

export default function Avatar({
  firstName = '',
  lastName = '',
  size = 'md',
  online = false,
  src,
  className = '',
}) {
  const fullName = `${firstName}${lastName}`.trim();
  const colorIndex = hashName(fullName);
  const { bg, text } = BG_COLORS[colorIndex];

  const initials =
    (firstName ? firstName[0].toUpperCase() : '') +
    (lastName ? lastName[0].toUpperCase() : '');

  const sizeClass = SIZE_CLASSES[size] || SIZE_CLASSES.md;

  return (
    <div
      className={`relative rounded-full border border-[#E0E0E0] overflow-hidden flex items-center justify-center shrink-0 ${sizeClass} ${!src ? bg : ''} ${className}`}
    >
      {src ? (
        <img src={src} alt={fullName || 'Avatar'} className="w-full h-full object-cover" />
      ) : (
        <span className={`font-semibold leading-none ${text}`}>{initials || '?'}</span>
      )}
      {online && (
        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[#1A7A4A] border-2 border-white" />
      )}
    </div>
  );
}
