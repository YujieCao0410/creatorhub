/**
 * The publishing destinations CreatorHub can distribute a video to.
 *
 * `api: true`  — we push the video through the platform's official API.
 * `api: false` — no usable public upload API (or it needs an approved dev app),
 *                so we generate a ready-to-paste caption package and the creator
 *                uploads by hand, then marks the target done.
 *
 * `defaultLang` is the caption language a platform gets unless the creator picks
 * another — it's only a default, every target's language is editable.
 */

export type PlatformId =
  | "youtube"
  | "tiktok"
  | "instagram"
  | "x"
  | "douyin"
  | "bilibili"
  | "xiaohongshu";

export type Platform = {
  id: PlatformId;
  label: string;
  defaultLang: string;
  api: boolean;
  /** Soft caption length guidance shown in the UI. */
  captionLimit: number;
  /** Max hashtags that platform rewards before it looks spammy. */
  hashtagLimit: number;
};

export const PLATFORMS: Platform[] = [
  { id: "youtube", label: "YouTube", defaultLang: "en", api: true, captionLimit: 4900, hashtagLimit: 15 },
  { id: "tiktok", label: "TikTok", defaultLang: "en", api: true, captionLimit: 2200, hashtagLimit: 10 },
  { id: "instagram", label: "Instagram", defaultLang: "en", api: true, captionLimit: 2200, hashtagLimit: 10 },
  { id: "x", label: "X", defaultLang: "en", api: false, captionLimit: 280, hashtagLimit: 3 },
  { id: "douyin", label: "抖音", defaultLang: "zh", api: false, captionLimit: 1000, hashtagLimit: 6 },
  { id: "bilibili", label: "哔哩哔哩", defaultLang: "zh", api: false, captionLimit: 2000, hashtagLimit: 10 },
  { id: "xiaohongshu", label: "小红书", defaultLang: "zh", api: false, captionLimit: 1000, hashtagLimit: 10 },
];

const BY_ID = new Map(PLATFORMS.map((p) => [p.id, p]));

export function getPlatform(id: string): Platform | undefined {
  return BY_ID.get(id as PlatformId);
}

export function isPlatformId(id: string): id is PlatformId {
  return BY_ID.has(id as PlatformId);
}
