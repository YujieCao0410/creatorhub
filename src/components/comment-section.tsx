"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/field";
import { Avatar } from "@/components/ui/misc";
import { api, ApiError } from "@/lib/api-client";
import type { Comment, CommentList } from "@/lib/dto";
import { formatRelativeDate } from "@/lib/format";

export function CommentSection({
  slug,
  initialItems,
  initialCursor,
  isAuthenticated,
}: {
  slug: string;
  initialItems: Comment[];
  initialCursor: string | null;
  isAuthenticated: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [cursor, setCursor] = useState(initialCursor);
  const [body, setBody] = useState("");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim() || posting) return;
    setPosting(true);
    setError(null);
    try {
      const { comment } = await api.post<{ comment: Comment }>(
        `/api/posts/${slug}/comments`,
        { body },
      );
      setItems((prev) => [comment, ...prev]);
      setBody("");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not post comment.");
    } finally {
      setPosting(false);
    }
  }

  async function remove(id: string) {
    const snapshot = items;
    setItems((prev) => prev.filter((c) => c.id !== id));
    try {
      await api.delete(`/api/comments/${id}`);
      router.refresh();
    } catch {
      setItems(snapshot);
    }
  }

  async function loadMore() {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await api.get<CommentList>(
        `/api/posts/${slug}/comments?cursor=${encodeURIComponent(cursor)}`,
      );
      setItems((prev) => [...prev, ...res.data]);
      setCursor(res.nextCursor);
    } catch {
      /* leave the button; user can retry */
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <section id="comments" className="scroll-mt-20">
      <h2 className="text-lg font-semibold">
        Comments {items.length > 0 && `(${items.length})`}
      </h2>

      {isAuthenticated ? (
        <form onSubmit={submit} className="mt-4 space-y-2">
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Add a comment…"
            maxLength={2000}
            aria-label="Add a comment"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" size="sm" loading={posting} disabled={!body.trim()}>
            Comment
          </Button>
        </form>
      ) : (
        <p className="mt-4 text-sm text-muted">
          <Link
            href={`/login?next=${encodeURIComponent(pathname)}`}
            className="font-medium text-brand-600"
          >
            Log in
          </Link>{" "}
          to join the conversation.
        </p>
      )}

      <ul className="mt-6 space-y-5">
        {items.map((comment) => (
          <li key={comment.id} className="flex gap-3">
            <Link href={`/creators/${comment.author.handle}`}>
              <Avatar
                name={comment.author.name}
                src={comment.author.avatarUrl}
                size={32}
              />
            </Link>
            <div className="min-w-0 flex-1">
              <p className="text-sm">
                <Link
                  href={`/creators/${comment.author.handle}`}
                  className="font-medium hover:underline"
                >
                  {comment.author.name}
                </Link>{" "}
                <span className="text-muted">
                  · {formatRelativeDate(comment.createdAt)}
                </span>
              </p>
              <p className="mt-0.5 whitespace-pre-wrap text-sm">{comment.body}</p>
              {comment.canDelete && (
                <button
                  onClick={() => remove(comment.id)}
                  className="mt-1 text-xs text-muted hover:text-red-600"
                >
                  Delete
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>

      {items.length === 0 && (
        <p className="mt-6 text-sm text-muted">No comments yet.</p>
      )}

      {cursor && (
        <div className="mt-4">
          <Button
            variant="secondary"
            size="sm"
            onClick={loadMore}
            loading={loadingMore}
          >
            Load more comments
          </Button>
        </div>
      )}
    </section>
  );
}
