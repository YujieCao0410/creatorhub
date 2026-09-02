import { fullCaption } from "@/lib/caption";
import { prisma } from "@/lib/db";
import type { DistributionPlan, PublishTargetDTO } from "@/lib/dto";
import {
  AuthorizationError,
  NotFoundError,
  ValidationError,
} from "@/lib/errors";
import { getPlatform, isPlatformId, PLATFORMS } from "@/lib/platforms";
import { publishPostToYouTube } from "./integration-service";

export type { DistributionPlan } from "@/lib/dto";

type TargetRow = {
  platform: string;
  locale: string;
  status: string;
  externalUrl: string | null;
  error: string | null;
  publishedAt: Date | null;
};

function toTargetDTO(row: TargetRow): PublishTargetDTO {
  return {
    platform: row.platform,
    locale: row.locale,
    status: row.status as PublishTargetDTO["status"],
    externalUrl: row.externalUrl,
    error: row.error,
    publishedAt: row.publishedAt?.toISOString() ?? null,
  };
}

async function loadOwnedPost(slug: string, userId: string) {
  const post = await prisma.post.findUnique({
    where: { slug },
    include: { publishTargets: true },
  });
  if (!post) throw new NotFoundError("Post");
  if (post.authorId !== userId) {
    throw new AuthorizationError("You can only distribute your own posts");
  }
  return post;
}

type OwnedPost = Awaited<ReturnType<typeof loadOwnedPost>>;

function captionsFor(post: OwnedPost): DistributionPlan["captions"] {
  const input = {
    title: post.title,
    content: post.content,
    captionEn: post.captionEn,
    captionZh: post.captionZh,
    tags: post.tags.split(" ").filter(Boolean),
  };
  return PLATFORMS.map((p) => ({
    platform: p.id,
    caption: fullCaption(input, p.id),
  }));
}

function planFrom(post: OwnedPost): DistributionPlan {
  return {
    slug: post.slug,
    targets: post.publishTargets
      .map(toTargetDTO)
      .sort((a, b) => a.platform.localeCompare(b.platform)),
    captions: captionsFor(post),
  };
}

/** The distribute panel's initial data: existing targets + per-platform caption. */
export async function getDistributionPlan(
  userId: string,
  slug: string,
): Promise<DistributionPlan> {
  return planFrom(await loadOwnedPost(slug, userId));
}

/**
 * Sends a post's video to the chosen platforms. YouTube goes through its API;
 * every other platform is recorded as `manual` — the creator uploads by hand
 * and calls {@link markTargetPublished} once done.
 */
export async function distributePost(
  userId: string,
  slug: string,
  platforms: string[],
): Promise<DistributionPlan> {
  const post = await loadOwnedPost(slug, userId);
  if (!post.videoUrl) {
    throw new ValidationError(undefined, "This post has no video to distribute.");
  }
  const chosen = [...new Set(platforms)].filter(isPlatformId);
  if (chosen.length === 0) {
    throw new ValidationError(undefined, "Pick at least one platform.");
  }

  for (const id of chosen) {
    const platform = getPlatform(id)!;
    const existing = post.publishTargets.find((t) => t.platform === id);
    if (existing?.status === "published") continue;

    if (id === "youtube" && platform.api) {
      await runYouTube(userId, slug, post.id);
    } else {
      await prisma.publishTarget.upsert({
        where: { postId_platform: { postId: post.id, platform: id } },
        create: {
          postId: post.id,
          platform: id,
          locale: platform.locale,
          status: "manual",
        },
        update: { locale: platform.locale, status: "manual", error: null },
      });
    }
  }

  return planFrom(await loadOwnedPost(slug, userId));
}

async function runYouTube(userId: string, slug: string, postId: string) {
  await prisma.publishTarget.upsert({
    where: { postId_platform: { postId, platform: "youtube" } },
    create: { postId, platform: "youtube", locale: "en", status: "publishing" },
    update: { status: "publishing", error: null },
  });
  try {
    const { url } = await publishPostToYouTube(userId, slug);
    await prisma.publishTarget.update({
      where: { postId_platform: { postId, platform: "youtube" } },
      data: { status: "published", externalUrl: url, publishedAt: new Date(), error: null },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    await prisma.publishTarget.update({
      where: { postId_platform: { postId, platform: "youtube" } },
      data: { status: "failed", error: message.slice(0, 500) },
    });
    throw err;
  }
}

/** Marks a `manual` target done, optionally with the live URL the creator got. */
export async function markTargetPublished(
  userId: string,
  slug: string,
  platform: string,
  externalUrl: string | null,
): Promise<DistributionPlan> {
  const post = await loadOwnedPost(slug, userId);
  if (!isPlatformId(platform)) {
    throw new ValidationError(undefined, "Unknown platform.");
  }
  const target = post.publishTargets.find((t) => t.platform === platform);
  if (!target) {
    throw new NotFoundError("Publish target");
  }
  await prisma.publishTarget.update({
    where: { postId_platform: { postId: post.id, platform } },
    data: {
      status: "published",
      externalUrl: externalUrl?.trim() || null,
      publishedAt: new Date(),
      error: null,
    },
  });
  return planFrom(await loadOwnedPost(slug, userId));
}
