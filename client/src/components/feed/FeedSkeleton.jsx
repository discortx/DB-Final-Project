import Skeleton, { SkeletonAvatar } from '../ui/Skeleton';

function SkeletonPostCard() {
  return (
    <div className="bg-[#F7F7F7] border border-[#E0E0E0] rounded-lg p-4 mb-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <SkeletonAvatar size="md" />
        <div className="flex flex-col gap-1.5 flex-1">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>

      {/* Body */}
      <div className="mt-3 space-y-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-4/5" />
        <Skeleton className="h-3 w-2/3" />
      </div>

      {/* Footer */}
      <div className="mt-3 pt-3 border-t border-[#E0E0E0] flex gap-4">
        <Skeleton className="h-6 w-16 rounded-md" />
        <Skeleton className="h-6 w-16 rounded-md" />
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
