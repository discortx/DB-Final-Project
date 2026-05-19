const DARK_COLORS = [
  { bg: '#2C4A7A', text: '#A8C4F0' },
  { bg: '#8B1520', text: '#F0A8AD' },
  { bg: '#2A6040', text: '#A8F0C4' },
  { bg: '#7A5A2C', text: '#F0DCA8' },
  { bg: '#5A2C7A', text: '#D4A8F0' },
  { bg: '#7A3A2C', text: '#F0BEA8' },
];

function hashName(name) {
  if (!name) return 0;
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return hash % DARK_COLORS.length;
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
  userId,
  size = 'md',
  online = false,
  src,
  className = '',
}) {
  const fullName = `${firstName}${lastName}`.trim();
  const colorIndex = typeof userId === 'number'
    ? userId % DARK_COLORS.length
    : hashName(fullName);
  const { bg, text } = DARK_COLORS[colorIndex];

  const initials =
    (firstName ? firstName[0].toUpperCase() : '') +
    (lastName ? lastName[0].toUpperCase() : '');

  const sizeClass = SIZE_CLASSES[size] || SIZE_CLASSES.md;

  return (
    <div
      style={{
        backgroundColor: !src ? bg : undefined,
        borderColor: 'rgba(255,255,255,0.12)',
        borderWidth: '1px',
        borderStyle: 'solid',
      }}
      className={`relative rounded-full overflow-hidden flex items-center justify-center shrink-0 ${sizeClass} ${className}`}
    >
      {src ? (
        <img src={src} alt={fullName || 'Avatar'} className="w-full h-full object-cover" />
      ) : (
        <span style={{ color: text }} className="font-semibold leading-none">{initials || '?'}</span>
      )}
      {online && (
        <span
          className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full"
          style={{ background: '#1A7A4A', border: '2px solid #100D0E' }}
        />
      )}
    </div>
  );
}
