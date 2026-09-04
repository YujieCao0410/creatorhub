import "server-only";
import { env } from "./env";
import { ServiceUnavailableError } from "./errors";
import type { TokenSet } from "./youtube";

/**
 * Minimal Instagram publishing client — "Instagram API with Instagram Login"
 * (no Facebook Page required, just an Instagram Business/Creator account).
 *
 * Instagram fetches the video from a public `video_url`, so this only works
 * when CreatorHub is deployed at a real, publicly reachable APP_URL — not
 * localhost. Before app review, only accounts added as testers can connect.
 */

const GRAPH = "https://graph.instagram.com/v21.0";

export const instagramConfigured = Boolean(
  env.INSTAGRAM_APP_ID && env.INSTAGRAM_APP_SECRET,
);

function creds() {
  if (!env.INSTAGRAM_APP_ID || !env.INSTAGRAM_APP_SECRET) {
    throw new ServiceUnavailableError("Instagram publishing is not configured");
  }
  return { id: env.INSTAGRAM_APP_ID, secret: env.INSTAGRAM_APP_SECRET };
}

export function redirectUri(): string {
  return `${env.APP_URL}/api/integrations/instagram/callback`;
}

const SCOPES = [
  "instagram_business_basic",
  "instagram_business_content_publish",
];

export function buildAuthUrl(state: string): string {
  const { id } = creds();
  const params = new URLSearchParams({
    client_id: id,
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: SCOPES.join(","),
    state,
  });
  return `https://www.instagram.com/oauth/authorize?${params}`;
}

/** Exchanges the code for a short token, then upgrades it to a 60-day one. */
export async function exchangeCode(code: string): Promise<TokenSet> {
  const { id, secret } = creds();

  const shortRes = await fetch("https://api.instagram.com/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: id,
      client_secret: secret,
      grant_type: "authorization_code",
      redirect_uri: redirectUri(),
      code,
    }),
  });
  const shortData = await shortRes.json();
  if (!shortRes.ok || !shortData.access_token) {
    throw new Error(
      `Instagram token exchange failed: ${shortData.error_message ?? shortRes.status}`,
    );
  }

  const longRes = await fetch(
    `${GRAPH.replace("/v21.0", "")}/access_token?` +
      new URLSearchParams({
        grant_type: "ig_exchange_token",
        client_secret: secret,
        access_token: shortData.access_token,
      }),
  );
  const longData = await longRes.json();
  const accessToken = longData.access_token ?? shortData.access_token;
  const expiresIn = longData.expires_in ?? 60 * 24 * 3600;

  return {
    accessToken,
    // IG long-lived tokens are refreshed by re-presenting the token itself.
    refreshToken: accessToken,
    expiresAt: new Date(Date.now() + expiresIn * 1000),
    scope: SCOPES.join(","),
  };
}

export async function refreshAccessToken(token: string): Promise<TokenSet> {
  const res = await fetch(
    "https://graph.instagram.com/refresh_access_token?" +
      new URLSearchParams({
        grant_type: "ig_refresh_token",
        access_token: token,
      }),
  );
  const data = await res.json();
  if (!res.ok || !data.access_token) {
    throw new Error(`Instagram token refresh failed: ${res.status}`);
  }
  return {
    accessToken: data.access_token,
    refreshToken: data.access_token,
    expiresAt: new Date(Date.now() + (data.expires_in ?? 60 * 24 * 3600) * 1000),
    scope: SCOPES.join(","),
  };
}

async function me(accessToken: string): Promise<{ id: string; username?: string }> {
  const res = await fetch(
    `${GRAPH}/me?` +
      new URLSearchParams({ fields: "user_id,username", access_token: accessToken }),
  );
  const data = await res.json();
  if (!res.ok) throw new Error(`Instagram /me failed: ${res.status}`);
  return { id: String(data.user_id ?? data.id), username: data.username };
}

export async function getUsername(accessToken: string): Promise<string | null> {
  try {
    const { username } = await me(accessToken);
    return username ? `@${username}` : null;
  } catch {
    return null;
  }
}

/** Publishes a Reel from a public video URL. */
export async function publishReel(opts: {
  accessToken: string;
  videoUrl: string;
  caption: string;
  /** Public HTTPS image URL to use as the Reel cover. Optional. */
  coverUrl?: string | null;
}): Promise<{ url: string }> {
  if (opts.videoUrl.includes("localhost") || opts.videoUrl.startsWith("http://")) {
    throw new Error(
      "Instagram needs the video at a public HTTPS URL — deploy CreatorHub first.",
    );
  }
  const { id: igUserId } = await me(opts.accessToken);

  const params = new URLSearchParams({
    media_type: "REELS",
    video_url: opts.videoUrl,
    caption: opts.caption.slice(0, 2200),
    access_token: opts.accessToken,
  });
  // Instagram fetches the cover image itself, so it must be a public HTTPS URL.
  if (opts.coverUrl && opts.coverUrl.startsWith("https://")) {
    params.set("cover_url", opts.coverUrl);
  }

  const create = await fetch(`${GRAPH}/${igUserId}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  });
  const createData = await create.json();
  if (!create.ok || !createData.id) {
    throw new Error(
      `Instagram container failed: ${createData.error?.message ?? create.status}`,
    );
  }
  const creationId = createData.id as string;

  // Poll the container until Instagram finishes ingesting the video.
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 4000));
    const st = await fetch(
      `${GRAPH}/${creationId}?` +
        new URLSearchParams({
          fields: "status_code",
          access_token: opts.accessToken,
        }),
    );
    const stData = await st.json();
    if (stData.status_code === "FINISHED") break;
    if (stData.status_code === "ERROR") {
      throw new Error("Instagram failed to process the video.");
    }
    if (i === 29) throw new Error("Instagram video processing timed out.");
  }

  const publish = await fetch(`${GRAPH}/${igUserId}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      creation_id: creationId,
      access_token: opts.accessToken,
    }),
  });
  const publishData = await publish.json();
  if (!publish.ok || !publishData.id) {
    throw new Error(
      `Instagram publish failed: ${publishData.error?.message ?? publish.status}`,
    );
  }

  const link = await fetch(
    `${GRAPH}/${publishData.id}?` +
      new URLSearchParams({ fields: "permalink", access_token: opts.accessToken }),
  );
  const linkData = await link.json();
  return { url: linkData.permalink ?? `https://www.instagram.com/reel/${publishData.id}/` };
}
