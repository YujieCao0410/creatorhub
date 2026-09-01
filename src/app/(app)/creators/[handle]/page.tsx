import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FollowButton } from "@/components/follow-button";
import { PostFeed } from "@/components/post-feed";
import { buttonClasses } from "@/components/ui/button";
import { Avatar, EmptyState } from "@/components/ui/misc";
import { getCurrentUser } from "@/lib/auth/session";
import { listPosts } from "@/server/services/post-service";
import { getCreatorProfile } from "@/server/services/user-service";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string }>;
}): Promise<Metadata> {
  const { handle } = await params;
  const creator = await getCreatorProfile(handle.toLowerCase());
  return creator
    ? { title: `${creator.name} (@${creator.handle})` }
    : { title: "Creator not found" };
}

export default async function CreatorProfilePage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const viewer = await getCurrentUser();
  const creator = await getCreatorProfile(handle.toLowerCase(), viewer?.id);
  if (!creator) notFound();

  const isSelf = viewer?.id === creator.id;
  const posts = await listPosts(
    { limit: 15, authorHandle: creator.handle },
    viewer?.id,
  );

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <header className="flex items-start gap-4">
        <Avatar name={creator.name} src={creator.avatarUrl} size={72} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold">{creator.name}</h1>
            {isSelf ? (
              <div className="flex gap-2">
                <Link
                  href="/dashboard"
                  className={buttonClasses({ variant: "secondary", size: "sm" })}
                >
                  Dashboard
                </Link>
                <Link
                  href="/dashboard/profile"
                  className={buttonClasses({ variant: "secondary", size: "sm" })}
                >
                  Edit profile
                </Link>
              </div>
            ) : (
              <FollowButton
                handle={creator.handle}
                initialFollowing={creator.isFollowing}
                canInteract={Boolean(viewer)}
              />
            )}
          </div>
          <p className="text-sm text-muted">@{creator.handle}</p>
          {creator.bio && <p className="mt-2 text-sm">{creator.bio}</p>}
          <dl className="mt-3 flex gap-5 text-sm">
            <div className="flex gap-1">
              <dt className="font-semibold">{creator.counts.posts}</dt>
              <dd className="text-muted">posts</dd>
            </div>
            <div className="flex gap-1">
              <dt className="font-semibold">{creator.counts.followers}</dt>
              <dd className="text-muted">followers</dd>
            </div>
            <div className="flex gap-1">
              <dt className="font-semibold">{creator.counts.following}</dt>
              <dd className="text-muted">following</dd>
            </div>
          </dl>
        </div>
      </header>

      {posts.data.length === 0 ? (
        <EmptyState
          title={isSelf ? "You haven't published anything yet" : "No posts yet"}
          action={
            isSelf ? (
              <Link
                href="/dashboard/posts/new"
                className={buttonClasses({ size: "sm" })}
              >
                Write a post
              </Link>
            ) : undefined
          }
        />
      ) : (
        <PostFeed
          initialItems={posts.data}
          initialCursor={posts.nextCursor}
          endpoint={`/api/posts?authorHandle=${encodeURIComponent(creator.handle)}`}
          currentUserId={viewer?.id}
        />
      )}
    </div>
  );
}
