import { PostCardSkeleton } from "@/components/ui/misc";

export default function Loading() {
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="h-8 w-40 animate-pulse rounded-md bg-black/[0.06] dark:bg-white/[0.08]" />
      <PostCardSkeleton />
      <PostCardSkeleton />
      <PostCardSkeleton />
    </div>
  );
}
