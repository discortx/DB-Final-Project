export default function Skeleton({ className = '', width, height }) {
  const style = {};
  if (width) style.width = width;
  if (height) style.height = height;

  return (
    <div
      className={`bg-[#EFEFEF] animate-pulse rounded ${className}`}
      style={Object.keys(style).length ? style : undefined}
    />
  );
}

export function SkeletonText({ className = '' }) {
  return <Skeleton className={`h-3 w-full rounded ${className}`} />;
}

export function SkeletonAvatar({ size = 'md', className = '' }) {
  const sizes = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  };
  const sizeClass = sizes[size] || sizes.md;
  return <Skeleton className={`rounded-full shrink-0 ${sizeClass} ${className}`} />;
}
