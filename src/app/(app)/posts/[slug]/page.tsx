import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CommentSection } from "@/components/comment-section";
import { LikeButton } from "@/components/like-button";
import { buttonClasses } from "@/components/ui/button";
import { Avatar, Badge } from "@/components/ui/misc";
import { getCurrentUser } from "@/lib/auth/session";
import { AppError } from "@/lib/errors";
import { formatRelativeDate } from "@/lib/format";
import { listComments } from "@/server/services/comment-service";
import { getPostBySlug } from "@/server/services/post-service";

export const dynamic = "force-dynamic";

async function loadPost(slug: string, viewerId?: string) {
  try {
    return await getPostBySlug(slug, viewerId);
  } catch (error) {
    if (error instanceof AppError && error.status === 404) notFound();
    throw error;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await loadPost(slug);
  return { title: post.title, description: post.excerpt ?? undefined };
}

export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const viewer = await getCurrentUser();
  const post = await loadPost(slug, viewer?.id);
  const comments = await listComments(slug, { limit: 20 }, viewer?.id).catch(
    () => ({ data: [], nextCursor: null }),
  );
  const canManage = viewer?.id === post.author.id;

  return (
    <article className="mx-auto max-w-2xl space-y-8">
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href={`/creators/${post.author.handle}`}>
              <Avatar
                name={post.author.name}
                src={post.author.avatarUrl}
                size={40}
              />
            </Link>
            <div className="text-sm">
              <Link
                href={`/creators/${post.author.handle}`}
                className="font-medium hover:underline"
              >
                {post.author.name}
              </Link>
              <p className="text-muted">
                @{post.author.handle} ·{" "}
                {post.published
                  ? formatRelativeDate(post.publishedAt)
                  : "draft"}
              </p>
            </div>
          </div>
          {canManage && (
            <div className="flex items-center gap-2">
              {!post.published && <Badge>Draft</Badge>}
              <Link
                href={`/dashboard/posts/${post.slug}/edit`}
                className={buttonClasses({ variant: "secondary", size: "sm" })}
              >
                Edit
              </Link>
            </div>
          )}
        </div>

        <h1 className="text-3xl font-semibold leading-tight">{post.title}</h1>
      </div>

      {post.coverImageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={post.coverImageUrl}
          alt=""
          className="w-full rounded-xl object-cover"
        />
      )}

      <div className="whitespace-pre-wrap text-[15px] leading-7">
        {post.content}
      </div>

      <div className="flex items-center gap-5 border-y border-border py-3">
        <LikeButton
          slug={post.slug}
          initialLikes={post.counts.likes}
          initialLiked={post.viewerHasLiked}
          canInteract={Boolean(viewer)}
        />
        <span className="text-sm text-muted">
          💬 {post.counts.comments} comments
        </span>
      </div>

      <CommentSection
        slug={post.slug}
        initialItems={comments.data}
        initialCursor={comments.nextCursor}
        isAuthenticated={Boolean(viewer)}
      />
    </article>
  );
}
