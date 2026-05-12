export default function Input({ label, error, className = '', ...rest }) {
  const inputBase =
    'w-full border bg-white rounded-md px-3 py-2 text-sm placeholder:text-[#888888] focus:outline-none transition-colors';

  const inputNormal = 'border-[#E0E0E0] focus:border-black focus:ring-1 focus:ring-black';
  const inputError = 'border-[#CC0000] focus:ring-1 focus:ring-[#CC0000] focus:border-[#CC0000]';

  return (
    <div className="w-full">
      {label && (
        <label className="text-xs font-semibold text-[#404040] mb-1 block">
          {label}
        </label>
      )}
      <input
        className={`${inputBase} ${error ? inputError : inputNormal} ${className}`}
        {...rest}
      />
      {error && (
        <p className="text-xs text-[#CC0000] mt-1">{error}</p>
      )}
    </div>
  );
}
