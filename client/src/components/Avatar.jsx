export default function Avatar({ firstName = '', lastName = '', size = 'md' }) {
  const initials = `${firstName[0] || ''}${lastName[0] || ''}`.toUpperCase();
  const sizes = { sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-14 h-14 text-lg' };
  return (
    <div className={`${sizes[size]} rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold flex-shrink-0`}>
      {initials || '?'}
    </div>
  );
}
