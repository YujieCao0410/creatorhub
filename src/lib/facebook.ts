import "server-only";
import { env } from "./env";
import { ServiceUnavailableError } from "./errors";
import type { TokenSet } from "./youtube";

/**
 * Facebook Page publishing — same Meta app as Instagram/Threads, classic
 * Facebook Login (not "Login for Business"). Posting requires a **Page**
 * (not a personal profile/timeline) — the API has no way to post to a
 * personal profile on a user's behalf.
 *
 * A user can manage multiple Pages; for now we auto-pick the first one
 * `/me/accounts` returns. The stored "access token" packs the page id and
 * that page's own access token (`<page_id>:<page_token>`), and the stored
 * "refresh token" is the long-lived *user* token, which is what lets us
 * re-derive a page token later.
 */

const GRAPH = "https://graph.facebook.com/v21.0";

export const facebookConfigured = Boolean(
  env.FACEBOOK_APP_ID && env.FACEBOOK_APP_SECRET,
);

function creds() {
  if (!env.FACEBOOK_APP_ID || !env.FACEBOOK_APP_SECRET) {
    throw new ServiceUnavailableError("Facebook publishing is not configured");
  }
  return { id: env.FACEBOOK_APP_ID, secret: env.FACEBOOK_APP_SECRET };
}

export function redirectUri(): string {
  return `${env.APP_URL}/api/integrations/facebook/callback`;
}

const SCOPES = ["pages_show_list", "pages_manage_posts", "pages_read_engagement"];

export function buildAuthUrl(state: string): string {
  const { id } = creds();
  const params = new URLSearchParams({
    client_id: id,
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: SCOPES.join(","),
    state,
  });
  return `https://www.facebook.com/v21.0/dialog/oauth?${params}`;
}

/** Picks the creator's first Facebook Page and packs its id + page token. */
async function firstPageToken(userAccessToken: string): Promise<{ accessToken: string }> {
  const res = await fetch(
    `${GRAPH}/me/accounts?` +
      new URLSearchParams({ access_token: userAccessToken }),
  );
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Facebook /me/accounts failed: ${data.error?.message ?? res.status}`);
  }
  const page = data.data?.[0];
  if (!page) {
    throw new Error(
      "No Facebook Page found on this account — create a Page first (a personal profile can't be posted to).",
    );
  }
  return { accessToken: `${page.id}:${page.access_token}` };
}

function unpack(accessToken: string): { pageId: string; pageToken: string } {
  const i = accessToken.indexOf(":");
  if (i < 0) throw new Error("Malformed Facebook access token");
  return { pageId: accessToken.slice(0, i), pageToken: accessToken.slice(i + 1) };
}

/** Exchanges the code for a user token, upgrades it to long-lived, then picks a Page. */
export async function exchangeCode(code: string): Promise<TokenSet> {
  const { id, secret } = creds();

  const shortRes = await fetch(
    `${GRAPH}/oauth/access_token?` +
      new URLSearchParams({
        client_id: id,
        client_secret: secret,
        redirect_uri: redirectUri(),
        code,
      }),
  );
  const shortData = await shortRes.json();
  if (!shortRes.ok || !shortData.access_token) {
    throw new Error(
      `Facebook token exchange failed: ${shortData.error?.message ?? shortRes.status}`,
    );
  }

  const longRes = await fetch(
    `${GRAPH}/oauth/access_token?` +
      new URLSearchParams({
        grant_type: "fb_exchange_token",
        client_id: id,
        client_secret: secret,
        fb_exchange_token: shortData.access_token,
      }),
  );
  const longData = await longRes.json();
  const userToken = longData.access_token ?? shortData.access_token;
  const expiresIn = longData.expires_in ?? 60 * 24 * 3600;

  const { accessToken } = await firstPageToken(userToken);
  return {
    accessToken,
    // The long-lived *user* token is what we need to re-derive a page token.
    refreshToken: userToken,
    expiresAt: new Date(Date.now() + expiresIn * 1000),
    scope: SCOPES.join(","),
  };
}

/** "Refresh" re-derives a page token from the stored long-lived user token. */
export async function refreshAccessToken(userToken: string): Promise<TokenSet> {
  const { accessToken } = await firstPageToken(userToken);
  return {
    accessToken,
    refreshToken: userToken,
    expiresAt: new Date(Date.now() + 60 * 24 * 3600 * 1000),
    scope: SCOPES.join(","),
  };
}

export async function getPageName(accessToken: string): Promise<string | null> {
  try {
    const { pageId, pageToken } = unpack(accessToken);
    const res = await fetch(
      `${GRAPH}/${pageId}?` +
        new URLSearchParams({ fields: "name", access_token: pageToken }),
    );
    const data = await res.json();
    return data.name ?? null;
  } catch {
    return null;
  }
}

/** Posts a video to the Page from a public video URL. */
export async function publishVideo(opts: {
  accessToken: string;
  videoUrl: string;
  caption: string;
}): Promise<{ url: string | null }> {
  if (opts.videoUrl.includes("localhost") || opts.videoUrl.startsWith("http://")) {
    throw new Error(
      "Facebook needs the video at a public HTTPS URL — deploy CreatorHub first.",
    );
  }
  const { pageId, pageToken } = unpack(opts.accessToken);

  const res = await fetch(`${GRAPH}/${pageId}/videos`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      file_url: opts.videoUrl,
      description: opts.caption.slice(0, 5000),
      access_token: pageToken,
    }),
  });
  const data = await res.json();
  if (!res.ok || !data.id) {
    throw new Error(`Facebook video post failed: ${data.error?.message ?? res.status}`);
  }
  return { url: `https://www.facebook.com/${pageId}/videos/${data.id}` };
}
