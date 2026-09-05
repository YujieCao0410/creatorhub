import "server-only";
import { env } from "./env";
import { ServiceUnavailableError } from "./errors";
import type { TokenSet } from "./youtube";

/**
 * Threads API client — same "Meta app" as Instagram (developers.facebook.com),
 * just a different product added to it ("Access Threads API"). OAuth and
 * publishing both mirror instagram.ts closely: a two-step container →
 * publish flow, long-lived tokens refreshed by re-presenting them.
 */

const GRAPH = "https://graph.threads.net/v1.0";

export const threadsConfigured = Boolean(
  env.THREADS_APP_ID && env.THREADS_APP_SECRET,
);

function creds() {
  if (!env.THREADS_APP_ID || !env.THREADS_APP_SECRET) {
    throw new ServiceUnavailableError("Threads publishing is not configured");
  }
  return { id: env.THREADS_APP_ID, secret: env.THREADS_APP_SECRET };
}

export function redirectUri(): string {
  return `${env.APP_URL}/api/integrations/threads/callback`;
}

const SCOPES = ["threads_basic", "threads_content_publish"];

export function buildAuthUrl(state: string): string {
  const { id } = creds();
  const params = new URLSearchParams({
    client_id: id,
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: SCOPES.join(","),
    state,
  });
  return `https://www.threads.net/oauth/authorize?${params}`;
}

/** Exchanges the code for a short-lived token, then upgrades to a 60-day one. */
export async function exchangeCode(code: string): Promise<TokenSet> {
  const { id, secret } = creds();

  const shortRes = await fetch("https://graph.threads.net/oauth/access_token", {
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
    console.error("[threads] token exchange response:", JSON.stringify(shortData));
    throw new Error(
      `Threads token exchange failed: ${shortData.error_message ?? shortData.error?.message ?? shortRes.status}`,
    );
  }

  const longRes = await fetch(
    "https://graph.threads.net/access_token?" +
      new URLSearchParams({
        grant_type: "th_exchange_token",
        client_secret: secret,
        access_token: shortData.access_token,
      }),
  );
  const longData = await longRes.json();
  const accessToken = longData.access_token ?? shortData.access_token;
  const expiresIn = longData.expires_in ?? 60 * 24 * 3600;

  return {
    accessToken,
    // Threads long-lived tokens are refreshed by re-presenting the token.
    refreshToken: accessToken,
    expiresAt: new Date(Date.now() + expiresIn * 1000),
    scope: SCOPES.join(","),
  };
}

export async function refreshAccessToken(token: string): Promise<TokenSet> {
  const res = await fetch(
    "https://graph.threads.net/refresh_access_token?" +
      new URLSearchParams({ grant_type: "th_refresh_token", access_token: token }),
  );
  const data = await res.json();
  if (!res.ok || !data.access_token) {
    throw new Error(`Threads token refresh failed: ${res.status}`);
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
      new URLSearchParams({ fields: "id,username", access_token: accessToken }),
  );
  if (!res.ok) throw new Error(`Threads /me failed: ${res.status}`);
  return res.json();
}

export async function getUsername(accessToken: string): Promise<string | null> {
  try {
    const { username } = await me(accessToken);
    return username ? `@${username}` : null;
  } catch {
    return null;
  }
}

/** Publishes a video post from a public video URL. */
export async function publishVideo(opts: {
  accessToken: string;
  videoUrl: string;
  caption: string;
}): Promise<{ url: string }> {
  if (opts.videoUrl.includes("localhost") || opts.videoUrl.startsWith("http://")) {
    throw new Error(
      "Threads needs the video at a public HTTPS URL — deploy CreatorHub first.",
    );
  }
  const { id: threadsUserId } = await me(opts.accessToken);

  const create = await fetch(`${GRAPH}/${threadsUserId}/threads`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      media_type: "VIDEO",
      video_url: opts.videoUrl,
      text: opts.caption.slice(0, 500),
      access_token: opts.accessToken,
    }),
  });
  const createData = await create.json();
  if (!create.ok || !createData.id) {
    throw new Error(
      `Threads container failed: ${createData.error?.message ?? create.status}`,
    );
  }
  const creationId = createData.id as string;

  // Poll the container until Threads finishes ingesting the video.
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 4000));
    const st = await fetch(
      `${GRAPH}/${creationId}?` +
        new URLSearchParams({ fields: "status", access_token: opts.accessToken }),
    );
    const stData = await st.json();
    if (stData.status === "FINISHED") break;
    if (stData.status === "ERROR") {
      throw new Error("Threads failed to process the video.");
    }
    if (i === 29) throw new Error("Threads video processing timed out.");
  }

  const publish = await fetch(`${GRAPH}/${threadsUserId}/threads_publish`, {
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
      `Threads publish failed: ${publishData.error?.message ?? publish.status}`,
    );
  }

  const link = await fetch(
    `${GRAPH}/${publishData.id}?` +
      new URLSearchParams({ fields: "permalink", access_token: opts.accessToken }),
  );
  const linkData = await link.json();
  return {
    url: linkData.permalink ?? `https://www.threads.net/t/${publishData.id}`,
  };
}
