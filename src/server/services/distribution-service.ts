import { fullCaption, toCaptionMap } from "@/lib/caption";
import { prisma } from "@/lib/db";
import type { DistributionPlan, PublishTargetDTO } from "@/lib/dto";
import {
  AuthorizationError,
  NotFoundError,
  ValidationError,
} from "@/lib/errors";
import { isLanguageCode } from "@/lib/languages";
import { getPlatform, isPlatformId, PLATFORMS } from "@/lib/platforms";
import { publishPostToYouTube } from "./integration-service";

export type { DistributionPlan } from "@/lib/dto";

/** One platform the creator wants to publish to, in a chosen language. */
export type DistributeTarget = { platform: string; lang: string };

type TargetRow = {
  platform: string;
  lang: string;
  status: string;
  externalUrl: string | null;
  error: string | null;
  publishedAt: Date | null;
};

function toTargetDTO(row: TargetRow): PublishTargetDTO {
  return {
    platform: row.platform,
    lang: row.lang,
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

/** The language a platform's caption is composed in: its target's, or default. */
function langFor(post: OwnedPost, platformId: string): string {
  const target = post.publishTargets.find((t) => t.platform === platformId);
  return target?.lang ?? getPlatform(platformId)?.defaultLang ?? "en";
}

function captionsFor(post: OwnedPost): DistributionPlan["captions"] {
  const input = {
    title: post.title,
    content: post.content,
    captions: toCaptionMap(post.captions),
    tags: post.tags.split(" ").filter(Boolean),
  };
  return PLATFORMS.map((p) => {
    const lang = langFor(post, p.id);
    return { platform: p.id, lang, caption: fullCaption(input, p.id, lang) };
  });
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
 * Sends a post's video to the chosen platforms, each in a chosen language.
 * YouTube goes through its API; every other platform is recorded as `manual` —
 * the creator uploads by hand and calls {@link markTargetPublished} once done.
 */
export async function distributePost(
  userId: string,
  slug: string,
  targets: DistributeTarget[],
): Promise<DistributionPlan> {
  const post = await loadOwnedPost(slug, userId);
  if (!post.videoUrl) {
    throw new ValidationError(undefined, "This post has no video to distribute.");
  }

  const chosen = new Map<string, string>();
  for (const { platform, lang } of targets) {
    if (!isPlatformId(platform)) continue;
    const resolved = isLanguageCode(lang)
      ? lang
      : (getPlatform(platform)?.defaultLang ?? "en");
    chosen.set(platform, resolved);
  }
  if (chosen.size === 0) {
    throw new ValidationError(undefined, "Pick at least one platform.");
  }

  for (const [id, lang] of chosen) {
    const platform = getPlatform(id)!;
    const existing = post.publishTargets.find((t) => t.platform === id);
    if (existing?.status === "published") continue;

    if (id === "youtube" && platform.api) {
      await runYouTube(userId, slug, post.id, lang);
    } else {
      await prisma.publishTarget.upsert({
        where: { postId_platform: { postId: post.id, platform: id } },
        create: { postId: post.id, platform: id, lang, status: "manual" },
        update: { lang, status: "manual", error: null },
      });
    }
  }

  return planFrom(await loadOwnedPost(slug, userId));
}

async function runYouTube(
  userId: string,
  slug: string,
  postId: string,
  lang: string,
) {
  await prisma.publishTarget.upsert({
    where: { postId_platform: { postId, platform: "youtube" } },
    create: { postId, platform: "youtube", lang, status: "publishing" },
    update: { lang, status: "publishing", error: null },
  });
  try {
    const { url } = await publishPostToYouTube(userId, slug, lang);
    await prisma.publishTarget.update({
      where: { postId_platform: { postId, platform: "youtube" } },
      data: {
        status: "published",
        externalUrl: url,
        publishedAt: new Date(),
        error: null,
      },
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
