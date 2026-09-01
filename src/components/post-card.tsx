"use client";

import Link from "next/link";
import { useI18n } from "@/components/i18n-provider";
import { LikeButton } from "@/components/like-button";
import { Avatar } from "@/components/ui/misc";
import type { PostSummary } from "@/lib/dto";
import { formatRelativeDate } from "@/lib/format";

export function PostCard({
  post,
  currentUserId,
}: {
  post: PostSummary;
  currentUserId?: string;
}) {
  const { locale } = useI18n();

  return (
    <article className="rounded-xl border border-border bg-surface p-5">
      <div className="flex items-center gap-3">
        <Link href={`/creators/${post.author.handle}`}>
          <Avatar name={post.author.name} src={post.author.avatarUrl} size={36} />
        </Link>
        <div className="min-w-0 text-sm">
          <Link
            href={`/creators/${post.author.handle}`}
            className="font-medium hover:underline"
          >
            {post.author.name}
          </Link>
          <p className="text-muted">
            @{post.author.handle} ·{" "}
            {formatRelativeDate(post.publishedAt, locale)}
          </p>
        </div>
      </div>

      <Link href={`/posts/${post.slug}`} className="mt-3 block">
        <h2 className="text-lg font-semibold leading-snug">{post.title}</h2>
        {post.excerpt && (
          <p className="mt-1 line-clamp-2 text-sm text-muted">{post.excerpt}</p>
        )}
      </Link>

      {post.coverImageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={post.coverImageUrl}
          alt=""
          className="mt-3 max-h-80 w-full rounded-lg object-cover"
        />
      )}

      <div className="mt-4 flex items-center gap-5">
        <LikeButton
          slug={post.slug}
          initialLikes={post.counts.likes}
          initialLiked={post.viewerHasLiked}
          canInteract={Boolean(currentUserId)}
        />
        <Link
          href={`/posts/${post.slug}#comments`}
          className="text-sm text-muted hover:text-foreground"
        >
          💬 {post.counts.comments}
        </Link>
      </div>
    </article>
  );
}
