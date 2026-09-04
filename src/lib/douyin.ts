import "server-only";
import { env } from "./env";
import { ServiceUnavailableError } from "./errors";
import type { TokenSet } from "./youtube";

/**
 * Douyin (抖音) Open Platform client — OAuth + direct video publish.
 *
 * Individual developers can register at open.douyin.com, but the
 * `video.create` scope needs a separate app review before it's granted, and
 * an unaudited app only works for accounts added as testers. There is no
 * sandbox like TikTok's — testing happens against the real API with a real
 * (tester) Douyin account, and posts land for real on that account, so treat
 * every publish here as live until the app is audited.
 */

const AUTH_BASE = "https://open.douyin.com/platform/oauth/connect/";
const API = "https://open.douyin.com";

export const douyinConfigured = Boolean(
  env.DOUYIN_CLIENT_KEY && env.DOUYIN_CLIENT_SECRET,
);

function creds() {
  if (!env.DOUYIN_CLIENT_KEY || !env.DOUYIN_CLIENT_SECRET) {
    throw new ServiceUnavailableError("Douyin publishing is not configured");
  }
  return { key: env.DOUYIN_CLIENT_KEY, secret: env.DOUYIN_CLIENT_SECRET };
}

export function redirectUri(): string {
  return `${env.APP_URL}/api/integrations/douyin/callback`;
}

const SCOPES = ["user_info", "video.create"];

export function buildAuthUrl(state: string): string {
  const { key } = creds();
  const params = new URLSearchParams({
    client_key: key,
    response_type: "code",
    scope: SCOPES.join(","),
    redirect_uri: redirectUri(),
    state,
  });
  return `${AUTH_BASE}?${params}`;
}

type DouyinResponse<T> = {
  data?: T & { error_code?: number; description?: string };
  extra?: { error_code?: number; description?: string; logid?: string };
};

function assertOk<T>(body: DouyinResponse<T>, action: string): T {
  const data = body.data;
  const code = data?.error_code ?? body.extra?.error_code;
  if (code && code !== 0) {
    throw new Error(
      `Douyin ${action} failed (${code}): ${data?.description ?? body.extra?.description ?? "unknown error"}`,
    );
  }
  if (!data) throw new Error(`Douyin ${action} failed: empty response`);
  return data;
}

async function tokenRequest(body: URLSearchParams): Promise<TokenSet> {
  const res = await fetch(`${API}/oauth/access_token/`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const json = await res.json();
  const data = assertOk<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
    open_id: string;
    scope: string;
  }>(json, "token request");
  return {
    accessToken: `${data.open_id}:${data.access_token}`,
    refreshToken: data.refresh_token,
    expiresAt: new Date(Date.now() + data.expires_in * 1000),
    scope: data.scope ?? SCOPES.join(","),
  };
}

// Douyin scopes an access token to one open_id, and every call needs both —
// so the stored "access token" packs `<open_id>:<token>` and this splits it.
function unpack(accessToken: string): { openId: string; token: string } {
  const i = accessToken.indexOf(":");
  if (i < 0) throw new Error("Malformed Douyin access token");
  return { openId: accessToken.slice(0, i), token: accessToken.slice(i + 1) };
}

export function exchangeCode(code: string): Promise<TokenSet> {
  const { key, secret } = creds();
  return tokenRequest(
    new URLSearchParams({
      client_key: key,
      client_secret: secret,
      code,
      grant_type: "authorization_code",
    }),
  );
}

export async function refreshAccessToken(refreshToken: string): Promise<TokenSet> {
  const { key } = creds();
  const res = await fetch(`${API}/oauth/refresh_token/`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_key: key,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });
  const json = await res.json();
  const data = assertOk<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
    open_id: string;
    scope: string;
  }>(json, "token refresh");
  return {
    accessToken: `${data.open_id}:${data.access_token}`,
    refreshToken: data.refresh_token,
    expiresAt: new Date(Date.now() + data.expires_in * 1000),
    scope: data.scope ?? SCOPES.join(","),
  };
}

export async function getDisplayName(accessToken: string): Promise<string | null> {
  try {
    const { openId, token } = unpack(accessToken);
    const res = await fetch(
      `${API}/oauth/userinfo/?` +
        new URLSearchParams({ access_token: token, open_id: openId }),
    );
    const json = await res.json();
    const data = assertOk<{ nickname?: string }>(json, "userinfo");
    return data.nickname ?? null;
  } catch {
    return null;
  }
}

/** Direct-publishes a video: upload the file, then create the post. */
export async function publishVideo(opts: {
  accessToken: string;
  bytes: Buffer;
  caption: string;
}): Promise<{ url: string | null }> {
  const { openId, token } = unpack(opts.accessToken);

  const form = new FormData();
  form.append(
    "video_file",
    new Blob([new Uint8Array(opts.bytes)], { type: "video/mp4" }),
    "video.mp4",
  );

  const upload = await fetch(
    `${API}/video/upload/?` +
      new URLSearchParams({ access_token: token, open_id: openId }),
    { method: "POST", body: form },
  );
  const uploadJson = await upload.json();
  const { video_id } = assertOk<{ video_id: string }>(uploadJson, "video upload");

  const create = await fetch(
    `${API}/video/create/?` +
      new URLSearchParams({ access_token: token, open_id: openId }),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        video_id,
        text: opts.caption.slice(0, 1000),
      }),
    },
  );
  const createJson = await create.json();
  const { item_id } = assertOk<{ item_id?: string }>(createJson, "publish");

  return { url: item_id ? `https://www.douyin.com/video/${item_id}` : null };
}
