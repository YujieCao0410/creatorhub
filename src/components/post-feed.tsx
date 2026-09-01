"use client";

import { useState } from "react";
import { PostCard } from "@/components/post-card";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api-client";
import type { PostList, PostSummary } from "@/lib/dto";

/**
 * Renders a list of posts with "Load more" keyset pagination.
 * `endpoint` is an API path returning `{ data, nextCursor }` (e.g. /api/posts).
 */
export function PostFeed({
  initialItems,
  initialCursor,
  endpoint,
  currentUserId,
}: {
  initialItems: PostSummary[];
  initialCursor: string | null;
  endpoint: string;
  currentUserId?: string;
}) {
  const [items, setItems] = useState(initialItems);
  const [cursor, setCursor] = useState(initialCursor);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadMore() {
    if (!cursor || loading) return;
    setLoading(true);
    setError(null);
    try {
      const sep = endpoint.includes("?") ? "&" : "?";
      const res = await api.get<PostList>(
        `${endpoint}${sep}cursor=${encodeURIComponent(cursor)}`,
      );
      setItems((prev) => [...prev, ...res.data]);
      setCursor(res.nextCursor);
    } catch {
      setError("Could not load more posts.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {items.map((post) => (
        <PostCard key={post.id} post={post} currentUserId={currentUserId} />
      ))}

      {error && <p className="text-sm text-red-600">{error}</p>}

      {cursor && (
        <div className="flex justify-center pt-2">
          <Button variant="secondary" onClick={loadMore} loading={loading}>
            Load more
          </Button>
        </div>
      )}
    </div>
  );
}
