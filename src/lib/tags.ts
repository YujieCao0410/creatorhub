import { z } from "zod";

/** Hashtag rules: letters (any script), digits, `_`, `-`; 1–30 chars. */
export const TAG_RE = /^[\p{L}\p{N}_-]{1,30}$/u;

// 5, not the 10-15 some platforms allow — Threads caps at 5 hashtags and we'd
// rather a creator's tag list already fit everywhere than get silently
// truncated per platform (see hashtagLine() in caption.ts).
export const MAX_TAGS = 5;

/** "design typography" → ["design", "typography"] */
export function parseTags(stored: string | null | undefined): string[] {
  return (stored ?? "").split(" ").filter(Boolean);
}

/** Normalizes and joins tags for storage: lowercase, trim, dedupe, cap. */
export function serializeTags(tags: string[] | undefined): string {
  if (!tags) return "";
  return [
    ...new Set(
      tags
        .map((t) => t.trim().toLowerCase().replace(/^#+/, ""))
        .filter((t) => TAG_RE.test(t)),
    ),
  ]
    .slice(0, MAX_TAGS)
    .join(" ");
}

/** Zod schema for a tag array coming from a request body. */
export const tagArraySchema = z
  .array(
    z
      .string()
      .trim()
      .toLowerCase()
      .regex(TAG_RE, "Tags can only contain letters, numbers, - and _"),
  )
  .max(MAX_TAGS, `At most ${MAX_TAGS} tags`);
