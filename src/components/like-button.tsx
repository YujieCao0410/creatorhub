"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useT } from "@/components/i18n-provider";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/cn";
import type { LikeState } from "@/lib/dto";

export function LikeButton({
  slug,
  initialLikes,
  initialLiked,
  canInteract,
}: {
  slug: string;
  initialLikes: number;
  initialLiked: boolean;
  canInteract: boolean;
}) {
  const t = useT();
  const router = useRouter();
  const pathname = usePathname();
  const [likes, setLikes] = useState(initialLikes);
  const [liked, setLiked] = useState(initialLiked);
  const [pending, setPending] = useState(false);

  async function toggle() {
    if (!canInteract) {
      router.push(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    if (pending) return;
    setPending(true);

    const next = !liked;
    setLiked(next);
    setLikes((n) => n + (next ? 1 : -1));

    try {
      const state = next
        ? await api.post<LikeState>(`/api/posts/${slug}/like`)
        : await api.delete<LikeState>(`/api/posts/${slug}/like`);
      setLikes(state.likes);
      setLiked(state.viewerHasLiked);
    } catch {
      setLiked(!next);
      setLikes((n) => n + (next ? -1 : 1));
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={liked}
      aria-label={liked ? t("post.unlike") : t("post.like")}
      className={cn(
        "inline-flex items-center gap-1.5 text-sm transition-colors",
        liked ? "text-red-600" : "text-muted hover:text-foreground",
      )}
    >
      <span aria-hidden>{liked ? "♥" : "♡"}</span>
      <span className="tabular-nums">{likes}</span>
    </button>
  );
}
