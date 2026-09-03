import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Integration } from "@/generated/prisma";
import { prisma } from "@/lib/db";
import {
  AuthorizationError,
  NotFoundError,
  ValidationError,
} from "@/lib/errors";
import { fullCaption, toCaptionMap } from "@/lib/caption";
import { env } from "@/lib/env";
import { publishReel } from "@/lib/instagram";
import { PROVIDERS, type ProviderId } from "@/lib/integrations";
import { publishVideo as publishTikTokVideo } from "@/lib/tiktok";
import { setThumbnail, type TokenSet, uploadVideo } from "@/lib/youtube";

export type IntegrationSummary = {
  provider: string;
  accountName: string | null;
  connectedAt: string;
};

export async function listIntegrations(
  userId: string,
): Promise<IntegrationSummary[]> {
  const rows = await prisma.integration.findMany({ where: { userId } });
  return rows.map((r) => ({
    provider: r.provider,
    accountName: r.accountName,
    connectedAt: r.createdAt.toISOString(),
  }));
}

export function getIntegration(userId: string, provider: string) {
  return prisma.integration.findUnique({
    where: { userId_provider: { userId, provider } },
  });
}

export async function saveIntegration(
  userId: string,
  provider: string,
  tokens: TokenSet,
  accountName: string | null,
): Promise<void> {
  const data = {
    accountName,
    accessToken: tokens.accessToken,
    scope: tokens.scope,
    expiresAt: tokens.expiresAt,
    // Google only returns a refresh token on the first consent; keep the old
    // one if this re-auth didn't include a new one.
    ...(tokens.refreshToken ? { refreshToken: tokens.refreshToken } : {}),
  };
  await prisma.integration.upsert({
    where: { userId_provider: { userId, provider } },
    create: { userId, provider, refreshToken: tokens.refreshToken, ...data },
    update: data,
  });
}

export async function disconnectIntegration(
  userId: string,
  provider: string,
): Promise<void> {
  await prisma.integration.deleteMany({ where: { userId, provider } });
}

/** A valid access token, refreshed if it's within a minute of expiry. */
async function validAccessToken(
  integration: Integration,
  provider: ProviderId,
): Promise<string> {
  const fresh =
    integration.expiresAt &&
    integration.expiresAt.getTime() - 60_000 > Date.now();
  if (fresh) return integration.accessToken;

  if (!integration.refreshToken) {
    throw new ValidationError(
      undefined,
      `Your ${PROVIDERS[provider].label} connection expired — reconnect it.`,
    );
  }
  const refreshed = await PROVIDERS[provider].refreshToken(
    integration.refreshToken,
  );
  await prisma.integration.update({
    where: { id: integration.id },
    data: {
      accessToken: refreshed.accessToken,
      expiresAt: refreshed.expiresAt,
      ...(refreshed.refreshToken
        ? { refreshToken: refreshed.refreshToken }
        : {}),
    },
  });
  return refreshed.accessToken;
}

/** Loads a post the user owns that has an uploaded video, or throws. */
async function loadVideoPost(userId: string, slug: string) {
  const post = await prisma.post.findUnique({ where: { slug } });
  if (!post) throw new NotFoundError("Post");
  if (post.authorId !== userId) {
    throw new AuthorizationError("You can only publish your own posts");
  }
  if (!post.videoUrl?.startsWith("/uploads/")) {
    throw new ValidationError(
      undefined,
      "Only uploaded videos can be published to platforms.",
    );
  }
  return post;
}

function composedCaption(
  post: { title: string; content: string; captions: unknown; tags: string },
  platform: string,
  lang: string,
  override: string | null,
): string {
  const tags = post.tags.split(" ").filter(Boolean);
  return (
    override?.trim() ||
    fullCaption(
      {
        title: post.title,
        content: post.content,
        captions: toCaptionMap(post.captions),
        tags,
      },
      platform,
      lang,
    )
  );
}

async function connectedIntegration(userId: string, provider: ProviderId) {
  const integration = await getIntegration(userId, provider);
  if (!integration) {
    throw new ValidationError(
      undefined,
      `Connect your ${PROVIDERS[provider].label} account first.`,
    );
  }
  return integration;
}

const VIDEO_MIME: Record<string, string> = {
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
};

const IMAGE_MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

/** Uploads a post's video to the author's connected YouTube channel. */
export async function publishPostToYouTube(
  userId: string,
  slug: string,
  lang = "en",
  captionOverride: string | null = null,
): Promise<{ url: string }> {
  const post = await prisma.post.findUnique({ where: { slug } });
  if (!post) throw new NotFoundError("Post");
  if (post.authorId !== userId) {
    throw new AuthorizationError("You can only publish your own posts");
  }
  if (post.youtubeUrl) return { url: post.youtubeUrl };
  if (!post.videoUrl) {
    throw new ValidationError(undefined, "This post has no video to publish.");
  }
  if (!post.videoUrl.startsWith("/uploads/")) {
    throw new ValidationError(
      undefined,
      "Only uploaded videos can be published to YouTube.",
    );
  }

  const integration = await connectedIntegration(userId, "youtube");
  const accessToken = await validAccessToken(integration, "youtube");
  const bytes = await readFile(
    path.join(process.cwd(), "public", post.videoUrl),
  );
  const contentType =
    VIDEO_MIME[path.extname(post.videoUrl).toLowerCase()] ?? "video/mp4";

  const tags = post.tags.split(" ").filter(Boolean);
  const description = composedCaption(post, "youtube", lang, captionOverride);

  const { videoId, url } = await uploadVideo({
    accessToken,
    bytes,
    contentType,
    title: post.title,
    description,
    tags,
    privacy: "public",
  });

  // Best-effort: reuse the post's cover image as the YouTube thumbnail.
  // YouTube rejects thumbnails.set while the freshly-uploaded video is still
  // transcoding, so retry a few times with a delay. Failure is non-fatal
  // (unverified channel, persistent processing) — the video keeps publishing.
  if (post.coverImageUrl?.startsWith("/uploads/")) {
    const ext = path.extname(post.coverImageUrl).toLowerCase();
    const coverType = IMAGE_MIME[ext];
    if (coverType) {
      try {
        const coverBytes = await readFile(
          path.join(process.cwd(), "public", post.coverImageUrl),
        );
        for (let attempt = 1; attempt <= 5; attempt++) {
          try {
            await setThumbnail({
              accessToken,
              videoId,
              bytes: coverBytes,
              contentType: coverType,
            });
            break;
          } catch (err) {
            if (attempt === 5) throw err;
            await new Promise((r) => setTimeout(r, 5000));
          }
        }
      } catch (err) {
        console.warn("YouTube thumbnail not set:", err);
      }
    }
  }

  await prisma.post.update({
    where: { id: post.id },
    data: { youtubeUrl: url },
  });
  return { url };
}

/** Publishes a post's video to the author's connected TikTok account. */
export async function publishPostToTikTok(
  userId: string,
  slug: string,
  lang = "en",
  captionOverride: string | null = null,
): Promise<{ url: string | null }> {
  const post = await loadVideoPost(userId, slug);
  const integration = await connectedIntegration(userId, "tiktok");
  const accessToken = await validAccessToken(integration, "tiktok");

  const bytes = await readFile(
    path.join(process.cwd(), "public", post.videoUrl!),
  );
  const contentType =
    VIDEO_MIME[path.extname(post.videoUrl!).toLowerCase()] ?? "video/mp4";

  return publishTikTokVideo({
    accessToken,
    bytes,
    contentType,
    caption: composedCaption(post, "tiktok", lang, captionOverride),
  });
}

/** Publishes a post's video as an Instagram Reel (needs a public APP_URL). */
export async function publishPostToInstagram(
  userId: string,
  slug: string,
  lang = "en",
  captionOverride: string | null = null,
): Promise<{ url: string }> {
  const post = await loadVideoPost(userId, slug);
  const integration = await connectedIntegration(userId, "instagram");
  const accessToken = await validAccessToken(integration, "instagram");

  return publishReel({
    accessToken,
    videoUrl: `${env.APP_URL}${post.videoUrl}`,
    caption: composedCaption(post, "instagram", lang, captionOverride),
  });
}
