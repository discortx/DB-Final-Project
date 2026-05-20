import Skeleton, { SkeletonAvatar } from '../ui/Skeleton';

function SkeletonPostCard() {
  return (
    <div
      style={{
        background: 'rgba(23,18,20,0.65)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '10px',
      }}
    >
      <div className="flex items-center gap-3">
        <SkeletonAvatar size="md" />
        <div className="flex flex-col gap-2 flex-1">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-2.5 w-20" />
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-4/5" />
        <Skeleton className="h-3 w-2/3" />
      </div>

      <div
        className="mt-4 pt-3 flex gap-4"
        style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
      >
        <Skeleton className="h-6 w-14 rounded-md" />
        <Skeleton className="h-6 w-14 rounded-md" />
      </div>
    </div>
  );
}

export default function FeedSkeleton() {
  return (
    <>
      <SkeletonPostCard />
      <SkeletonPostCard />
      <SkeletonPostCard />
    </>
  );
}
