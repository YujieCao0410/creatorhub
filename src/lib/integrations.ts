import "server-only";
import * as facebook from "./facebook";
import * as instagram from "./instagram";
import * as threads from "./threads";
import * as tiktok from "./tiktok";
import type { TokenSet } from "./youtube";
import * as youtube from "./youtube";

/**
 * The external accounts a creator can connect for API publishing. Each entry
 * wraps its platform's OAuth flow so the `/api/integrations/[provider]/*`
 * routes stay provider-agnostic.
 */
export type ProviderId =
  | "youtube"
  | "tiktok"
  | "instagram"
  | "threads"
  | "facebook";

export type ProviderAuth = {
  id: ProviderId;
  label: string;
  configured: boolean;
  buildAuthUrl: (state: string) => string;
  exchangeCode: (code: string) => Promise<TokenSet>;
  refreshToken: (refreshToken: string) => Promise<TokenSet>;
  fetchAccountName: (accessToken: string) => Promise<string | null>;
};

export const PROVIDERS: Record<ProviderId, ProviderAuth> = {
  youtube: {
    id: "youtube",
    label: "YouTube",
    configured: youtube.youtubeConfigured,
    buildAuthUrl: youtube.buildAuthUrl,
    exchangeCode: youtube.exchangeCode,
    refreshToken: youtube.refreshAccessToken,
    fetchAccountName: youtube.getChannelName,
  },
  tiktok: {
    id: "tiktok",
    label: "TikTok",
    configured: tiktok.tiktokConfigured,
    buildAuthUrl: tiktok.buildAuthUrl,
    exchangeCode: tiktok.exchangeCode,
    refreshToken: tiktok.refreshAccessToken,
    fetchAccountName: tiktok.getDisplayName,
  },
  instagram: {
    id: "instagram",
    label: "Instagram",
    configured: instagram.instagramConfigured,
    buildAuthUrl: instagram.buildAuthUrl,
    exchangeCode: instagram.exchangeCode,
    refreshToken: instagram.refreshAccessToken,
    fetchAccountName: instagram.getUsername,
  },
  threads: {
    id: "threads",
    label: "Threads",
    configured: threads.threadsConfigured,
    buildAuthUrl: threads.buildAuthUrl,
    exchangeCode: threads.exchangeCode,
    refreshToken: threads.refreshAccessToken,
    fetchAccountName: threads.getUsername,
  },
  facebook: {
    id: "facebook",
    label: "Facebook",
    configured: facebook.facebookConfigured,
    buildAuthUrl: facebook.buildAuthUrl,
    exchangeCode: facebook.exchangeCode,
    refreshToken: facebook.refreshAccessToken,
    fetchAccountName: facebook.getPageName,
  },
};

const PROVIDER_IDS = new Set(Object.keys(PROVIDERS));

export function isProviderId(value: string): value is ProviderId {
  return PROVIDER_IDS.has(value);
}
