import "server-only";
import { env } from "./env";
import { ServiceUnavailableError } from "./errors";

/**
 * Minimal YouTube Data API v3 client (OAuth 2.0 + resumable video upload),
 * implemented with plain fetch to avoid the heavy `googleapis` dependency.
 *
 * Uploads request `privacyStatus: "public"`, but Google overrides this to
 * `private` for any API project that has not passed the YouTube API audit.
 * Until then the creator flips the video public in YouTube Studio.
 */

const SCOPES = [
  "https://www.googleapis.com/auth/youtube.upload",
  "https://www.googleapis.com/auth/youtube.readonly",
];

export const youtubeConfigured = Boolean(
  env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET,
);

function credentials() {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    throw new ServiceUnavailableError("YouTube publishing is not configured");
  }
  return { id: env.GOOGLE_CLIENT_ID, secret: env.GOOGLE_CLIENT_SECRET };
}

export function redirectUri(): string {
  return `${env.APP_URL}/api/integrations/youtube/callback`;
}

export function buildAuthUrl(state: string): string {
  const { id } = credentials();
  const params = new URLSearchParams({
    client_id: id,
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

export type TokenSet = {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date;
  scope: string;
};

async function tokenRequest(body: URLSearchParams): Promise<TokenSet> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(
      `Google token request failed: ${data.error_description ?? data.error ?? res.status}`,
    );
  }
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? null,
    expiresAt: new Date(Date.now() + (data.expires_in ?? 3600) * 1000),
    scope: data.scope ?? "",
  };
}

export function exchangeCode(code: string): Promise<TokenSet> {
  const { id, secret } = credentials();
  return tokenRequest(
    new URLSearchParams({
      code,
      client_id: id,
      client_secret: secret,
      redirect_uri: redirectUri(),
      grant_type: "authorization_code",
    }),
  );
}

export function refreshAccessToken(refreshToken: string): Promise<TokenSet> {
  const { id, secret } = credentials();
  return tokenRequest(
    new URLSearchParams({
      refresh_token: refreshToken,
      client_id: id,
      client_secret: secret,
      grant_type: "refresh_token",
    }),
  );
}

export async function getChannelName(
  accessToken: string,
): Promise<string | null> {
  const res = await fetch(
    "https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true",
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!res.ok) return null;
  const data = await res.json();
  return data.items?.[0]?.snippet?.title ?? null;
}

export type YouTubePrivacy = "public" | "unlisted" | "private";

export async function uploadVideo(opts: {
  accessToken: string;
  bytes: Buffer;
  contentType: string;
  title: string;
  description: string;
  tags: string[];
  privacy?: YouTubePrivacy;
}): Promise<{ videoId: string; url: string }> {
  const metadata = {
    snippet: {
      title: opts.title.slice(0, 100),
      description: opts.description.slice(0, 4900),
      tags: opts.tags.slice(0, 15),
      categoryId: "22", // People & Blogs
    },
    status: {
      // Note: Google forces videos from an unaudited API project to `private`
      // regardless of this value until the project passes the YouTube API audit.
      privacyStatus: opts.privacy ?? "public",
      selfDeclaredMadeForKids: false,
    },
  };

  const init = await fetch(
    "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${opts.accessToken}`,
        "Content-Type": "application/json",
        "X-Upload-Content-Type": opts.contentType,
        "X-Upload-Content-Length": String(opts.bytes.length),
      },
      body: JSON.stringify(metadata),
    },
  );
  if (!init.ok) {
    throw new Error(`YouTube upload init failed: ${await init.text()}`);
  }
  const uploadUrl = init.headers.get("location");
  if (!uploadUrl) throw new Error("YouTube did not return an upload URL");

  const put = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": opts.contentType },
    body: new Uint8Array(opts.bytes),
  });
  if (!put.ok) {
    throw new Error(`YouTube video upload failed: ${await put.text()}`);
  }
  const result = await put.json();
  const videoId = result.id as string;
  return { videoId, url: `https://www.youtube.com/watch?v=${videoId}` };
}
