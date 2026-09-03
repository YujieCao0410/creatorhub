import "server-only";
import * as instagram from "./instagram";
import * as tiktok from "./tiktok";
import type { TokenSet } from "./youtube";
import * as youtube from "./youtube";

/**
 * The external accounts a creator can connect for API publishing. Each entry
 * wraps its platform's OAuth flow so the `/api/integrations/[provider]/*`
 * routes stay provider-agnostic.
 */
export type ProviderId = "youtube" | "tiktok" | "instagram";

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
};

export function isProviderId(value: string): value is ProviderId {
  return value === "youtube" || value === "tiktok" || value === "instagram";
}
