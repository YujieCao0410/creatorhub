import { getPlatform, type PlatformLocale } from "./platforms";

export type CaptionInput = {
  title: string;
  content: string;
  captionEn: string;
  captionZh: string;
  tags: string[];
};

/** The body text for a platform, before hashtags. */
export function captionBody(post: CaptionInput, locale: PlatformLocale): string {
  const preferred = locale === "zh" ? post.captionZh : post.captionEn;
  if (preferred.trim()) return preferred.trim();
  // Fall back to the post's own title + body.
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
export function fullCaption(post: CaptionInput, platformId: string): string {
  const platform = getPlatform(platformId);
  const locale: PlatformLocale = platform?.locale ?? "en";
  const body = captionBody(post, locale);
  const tags = hashtagLine(post.tags, platformId);
  return [body, tags].filter(Boolean).join("\n\n");
}
