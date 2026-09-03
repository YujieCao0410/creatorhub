import "server-only";
import { env } from "./env";
import { ServiceUnavailableError } from "./errors";
import type { TokenSet } from "./youtube";

/**
 * Minimal TikTok Content Posting API v2 client (OAuth 2.0 + direct-post
 * FILE_UPLOAD), plain fetch.
 *
 * Unaudited apps: the app runs in sandbox, only added test users can connect,
 * and every post is forced to `SELF_ONLY` (private) regardless of the value we
 * send. The creator makes the video public in the TikTok app afterwards.
 */

const AUTH_BASE = "https://www.tiktok.com/v2/auth/authorize/";
const API = "https://open.tiktokapis.com";

export const tiktokConfigured = Boolean(
  env.TIKTOK_CLIENT_KEY && env.TIKTOK_CLIENT_SECRET,
);

function creds() {
  if (!env.TIKTOK_CLIENT_KEY || !env.TIKTOK_CLIENT_SECRET) {
    throw new ServiceUnavailableError("TikTok publishing is not configured");
  }
  return { key: env.TIKTOK_CLIENT_KEY, secret: env.TIKTOK_CLIENT_SECRET };
}

export function redirectUri(): string {
  return `${env.APP_URL}/api/integrations/tiktok/callback`;
}

const SCOPES = ["user.info.basic", "video.publish"];

export function buildAuthUrl(state: string): string {
  const { key } = creds();
  const params = new URLSearchParams({
    client_key: key,
    scope: SCOPES.join(","),
    response_type: "code",
    redirect_uri: redirectUri(),
    state,
  });
  return `${AUTH_BASE}?${params}`;
}

async function tokenRequest(body: URLSearchParams): Promise<TokenSet> {
  const res = await fetch(`${API}/v2/oauth/token/`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(
      `TikTok token request failed: ${data.error_description ?? data.error ?? res.status}`,
    );
  }
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? null,
    expiresAt: new Date(Date.now() + (data.expires_in ?? 86_400) * 1000),
    scope: data.scope ?? "",
  };
}

export function exchangeCode(code: string): Promise<TokenSet> {
  const { key, secret } = creds();
  return tokenRequest(
    new URLSearchParams({
      client_key: key,
      client_secret: secret,
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri(),
    }),
  );
}

export function refreshAccessToken(refreshToken: string): Promise<TokenSet> {
  const { key, secret } = creds();
  return tokenRequest(
    new URLSearchParams({
      client_key: key,
      client_secret: secret,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  );
}

export async function getDisplayName(
  accessToken: string,
): Promise<string | null> {
  const res = await fetch(
    `${API}/v2/user/info/?fields=display_name,username`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!res.ok) return null;
  const data = await res.json();
  const u = data.data?.user;
  if (!u) return null;
  return u.username ? `@${u.username}` : (u.display_name ?? null);
}

/** Direct-post a video via FILE_UPLOAD. Single chunk (our clips are small). */
export async function publishVideo(opts: {
  accessToken: string;
  bytes: Buffer;
  contentType: string;
  caption: string;
}): Promise<{ url: string | null }> {
  const size = opts.bytes.length;

  const init = await fetch(`${API}/v2/post/publish/video/init/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${opts.accessToken}`,
      "Content-Type": "application/json; charset=UTF-8",
    },
    body: JSON.stringify({
      post_info: {
        title: opts.caption.slice(0, 2200),
        privacy_level: "SELF_ONLY",
        disable_comment: false,
        disable_duet: false,
        disable_stitch: false,
      },
      source_info: {
        source: "FILE_UPLOAD",
        video_size: size,
        chunk_size: size,
        total_chunk_count: 1,
      },
    }),
  });
  const initData = await init.json();
  if (!init.ok || initData.error?.code !== "ok") {
    throw new Error(
      `TikTok init failed: ${initData.error?.message ?? init.status}`,
    );
  }
  const { publish_id, upload_url } = initData.data as {
    publish_id: string;
    upload_url: string;
  };

  const put = await fetch(upload_url, {
    method: "PUT",
    headers: {
      "Content-Type": opts.contentType,
      "Content-Length": String(size),
      "Content-Range": `bytes 0-${size - 1}/${size}`,
    },
    body: new Uint8Array(opts.bytes),
  });
  if (!put.ok) {
    throw new Error(`TikTok upload failed: ${await put.text()}`);
  }

  // Poll until TikTok finishes processing (or fails).
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 3000));
    const st = await fetch(`${API}/v2/post/publish/status/fetch/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${opts.accessToken}`,
        "Content-Type": "application/json; charset=UTF-8",
      },
      body: JSON.stringify({ publish_id }),
    });
    const stData = await st.json();
    const status = stData.data?.status as string | undefined;
    if (status === "PUBLISH_COMPLETE") {
      const ids = stData.data?.publicaly_available_post_id as
        | (string | number)[]
        | undefined;
      return {
        url: ids?.length
          ? `https://www.tiktok.com/video/${ids[0]}`
          : null,
      };
    }
    if (status === "FAILED") {
      throw new Error(
        `TikTok publish failed: ${stData.data?.fail_reason ?? "unknown"}`,
      );
    }
  }
  // Still processing after ~60s — treat as submitted.
  return { url: null };
}
