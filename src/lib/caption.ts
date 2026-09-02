import { getPlatform } from "./platforms";

export type CaptionMap = Record<string, string>;

/** Coerces a stored JSON value into a `{ lang: text }` map, dropping empties. */
export function toCaptionMap(stored: unknown): CaptionMap {
  if (!stored || typeof stored !== "object") return {};
  const out: CaptionMap = {};
  for (const [key, value] of Object.entries(stored as Record<string, unknown>)) {
    if (typeof value === "string" && value.trim()) out[key] = value;
  }
  return out;
}

export type CaptionInput = {
  title: string;
  content: string;
  captions: CaptionMap;
  tags: string[];
};

/** Non-empty caption language codes on a post, in insertion order. */
export function captionLanguages(captions: CaptionMap): string[] {
  return Object.keys(captions).filter((code) => captions[code]?.trim());
}

/**
 * The best caption body for a target language:
 *   exact match → base-language match (`zh` for `zh-Hant`) → any caption →
 *   the post's own title + content.
 */
export function captionBody(post: CaptionInput, lang: string): string {
  const exact = post.captions[lang]?.trim();
  if (exact) return exact;

  const base = lang.split("-")[0];
  for (const [code, text] of Object.entries(post.captions)) {
    if (code.split("-")[0] === base && text.trim()) return text.trim();
  }

  const first = captionLanguages(post.captions)[0];
  if (first) return post.captions[first]!.trim();

  return [post.title.trim(), post.content.trim()].filter(Boolean).join("\n\n");
}

/** Formats hashtags for a platform, capped at its limit. */
export function hashtagLine(tags: string[], platformId: string): string {
  const platform = getPlatform(platformId);
  const limit = platform?.hashtagLimit ?? 10;
  return tags
    .slice(0, limit)
    .map((t) => `#${t}`)
    .join(" ");
}

/** The full caption a creator pastes into a platform: body + hashtag line. */
export function fullCaption(
  post: CaptionInput,
  platformId: string,
  lang: string,
): string {
  const body = captionBody(post, lang);
  const tags = hashtagLine(post.tags, platformId);
  return [body, tags].filter(Boolean).join("\n\n");
}
