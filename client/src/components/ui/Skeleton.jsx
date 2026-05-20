const SKELETON_CSS = `
  @keyframes skeletonShimmer {
    0%   { background-position: -400px 0; }
    100% { background-position:  400px 0; }
  }
  .skeleton-pulse {
    background: linear-gradient(
      90deg,
      rgba(255,255,255,0.06) 25%,
      rgba(255,255,255,0.10) 50%,
      rgba(255,255,255,0.06) 75%
    );
    background-size: 400px 100%;
    animation: skeletonShimmer 1.6s ease-in-out infinite;
  }
`;

export default function Skeleton({ className = '', width, height }) {
  const style = {};
  if (width)  style.width  = width;
  if (height) style.height = height;

  return (
    <>
      <style>{SKELETON_CSS}</style>
      <div
        className={`skeleton-pulse rounded ${className}`}
        style={Object.keys(style).length ? style : undefined}
      />
    </>
  );
}

export function SkeletonText({ className = '' }) {
  return <Skeleton className={`h-3 w-full rounded ${className}`} />;
}

export function SkeletonAvatar({ size = 'md', className = '' }) {
  const sizes = { xs: 'w-6 h-6', sm: 'w-8 h-8', md: 'w-10 h-10', lg: 'w-12 h-12' };
  const sizeClass = sizes[size] || sizes.md;
  return <Skeleton className={`rounded-full shrink-0 ${sizeClass} ${className}`} />;
}
