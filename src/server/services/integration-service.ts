import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Integration } from "@/generated/prisma";
import { prisma } from "@/lib/db";
import {
  AuthorizationError,
  NotFoundError,
  ValidationError,
} from "@/lib/errors";
import {
  refreshAccessToken,
  type TokenSet,
  uploadVideo,
} from "@/lib/youtube";

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
async function validAccessToken(integration: Integration): Promise<string> {
  const fresh =
    integration.expiresAt &&
    integration.expiresAt.getTime() - 60_000 > Date.now();
  if (fresh) return integration.accessToken;

  if (!integration.refreshToken) {
    throw new ValidationError(
      undefined,
      "Your YouTube connection expired — reconnect it.",
    );
  }
  const refreshed = await refreshAccessToken(integration.refreshToken);
  await prisma.integration.update({
    where: { id: integration.id },
    data: {
      accessToken: refreshed.accessToken,
      expiresAt: refreshed.expiresAt,
    },
  });
  return refreshed.accessToken;
}

const VIDEO_MIME: Record<string, string> = {
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
};

/** Uploads a post's video to the author's connected YouTube channel. */
export async function publishPostToYouTube(
  userId: string,
  slug: string,
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

  const integration = await getIntegration(userId, "youtube");
  if (!integration) {
    throw new ValidationError(
      undefined,
      "Connect your YouTube account first.",
    );
  }

  const accessToken = await validAccessToken(integration);
  const bytes = await readFile(
    path.join(process.cwd(), "public", post.videoUrl),
  );
  const contentType =
    VIDEO_MIME[path.extname(post.videoUrl).toLowerCase()] ?? "video/mp4";

  const tags = post.tags.split(" ").filter(Boolean);
  const description = [
    post.content,
    tags.length ? tags.map((t) => `#${t}`).join(" ") : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const { url } = await uploadVideo({
    accessToken,
    bytes,
    contentType,
    title: post.title,
    description,
    tags,
  });

  await prisma.post.update({
    where: { id: post.id },
    data: { youtubeUrl: url },
  });
  return { url };
}
