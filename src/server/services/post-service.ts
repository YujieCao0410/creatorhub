import { Prisma } from "@/generated/prisma";
import { toCaptionMap } from "@/lib/caption";
import { prisma } from "@/lib/db";
import { parseTags, serializeTags } from "@/lib/tags";
import type { PostDetail, PostList, PostSummary } from "@/lib/dto";
import {
  AuthorizationError,
  NotFoundError,
  PaymentRequiredError,
} from "@/lib/errors";
import { FREE_DRAFT_LIMIT, toMembership } from "@/lib/membership";
import { uniqueSlug } from "@/lib/slug";
import type { PaginationQuery } from "@/lib/validation/common";
import type {
  CreatePostInput,
  ListPostsQuery,
  UpdatePostInput,
} from "@/lib/validation/post";

export type {
  PostAuthor,
  PostDetail,
  PostList,
  PostSummary,
} from "@/lib/dto";

/* ---------- internal query helpers ---------- */

const postInclude = {
  author: {
    select: { id: true, handle: true, name: true, avatarUrl: true },
  },
  publishTargets: true,
  _count: { select: { likes: true, comments: true } },
} satisfies Prisma.PostInclude;

type PostRow = Prisma.PostGetPayload<{ include: typeof postInclude }>;


function toSummary(row: PostRow, viewerHasLiked: boolean): PostSummary {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    coverImageUrl: row.coverImageUrl,
    videoUrl: row.videoUrl,
    youtubeUrl: row.youtubeUrl,
    tags: parseTags(row.tags),
    captions: toCaptionMap(row.captions),
    publishTargets: row.publishTargets
      .map((t) => ({
        platform: t.platform,
        lang: t.lang,
        caption: t.caption,
        status: t.status as PostSummary["publishTargets"][number]["status"],
        externalUrl: t.externalUrl,
        error: t.error,
        publishedAt: t.publishedAt?.toISOString() ?? null,
      }))
      .sort((a, b) => a.platform.localeCompare(b.platform)),
    published: row.published,
    shareToCommunity: row.shareToCommunity,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    author: row.author,
    counts: { likes: row._count.likes, comments: row._count.comments },
    viewerHasLiked,
  };
}

/** Which of the given post ids the viewer has liked. */
async function likedPostIds(
  viewerId: string | undefined,
  postIds: string[],
): Promise<Set<string>> {
  if (!viewerId || postIds.length === 0) return new Set();
  const likes = await prisma.like.findMany({
    where: { userId: viewerId, postId: { in: postIds } },
    select: { postId: true },
  });
  return new Set(likes.map((l) => l.postId));
}

/* ---------- public API ---------- */

export async function createPost(
  authorId: string,
  input: CreatePostInput,
): Promise<PostDetail> {
  // FREE accounts are capped on unpublished drafts. PRO is unlimited.
  if (!input.publish) {
    const author = await prisma.user.findUnique({
      where: { id: authorId },
      select: { membership: true },
    });
    if (toMembership(author?.membership) !== "PRO") {
      const drafts = await prisma.post.count({
        where: { authorId, published: false },
      });
      if (drafts >= FREE_DRAFT_LIMIT) {
        throw new PaymentRequiredError(
          `Free accounts can keep ${FREE_DRAFT_LIMIT} drafts. Upgrade to Pro for unlimited drafts.`,
        );
      }
    }
  }

  const publishedAt = input.publish ? new Date() : null;

  // Retry on the astronomically unlikely slug collision.
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const row = await prisma.post.create({
        data: {
          slug: uniqueSlug(input.title),
          title: input.title,
          content: input.content,
          excerpt: input.excerpt ?? null,
          coverImageUrl: input.coverImageUrl ?? null,
          videoUrl: input.videoUrl ?? null,
          tags: serializeTags(input.tags),
          captions: input.captions ?? {},
          // Default: a post published to CreatorHub shows in the community
          // feed. Uncheck to publish/distribute without joining the feed.
          shareToCommunity: input.shareToCommunity ?? input.publish,
          published: input.publish,
          publishedAt,
          authorId,
        },
        include: postInclude,
      });
      return { ...toSummary(row, false), content: row.content };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002" &&
        attempt < 3
      ) {
        continue;
      }
      throw error;
    }
  }
  // Unreachable: the loop either returns or throws.
  throw new Error("Failed to generate a unique slug");
}

export async function getPostBySlug(
  slug: string,
  viewerId?: string,
): Promise<PostDetail> {
  const row = await prisma.post.findUnique({
    where: { slug },
    include: postInclude,
  });
  if (!row) throw new NotFoundError("Post");

  // Drafts are visible only to their author.
  if (!row.published && row.authorId !== viewerId) {
    throw new NotFoundError("Post");
  }

  const liked = await likedPostIds(viewerId, [row.id]);
  return { ...toSummary(row, liked.has(row.id)), content: row.content };
}

/** Shared keyset-paginated query over published posts. */
async function paginatePublishedPosts(
  where: Prisma.PostWhereInput,
  { cursor, limit }: PaginationQuery,
  viewerId?: string,
): Promise<PostList> {
  const rows = await prisma.post.findMany({
    where: { published: true, shareToCommunity: true, ...where },
    include: postInclude,
    orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;

  const liked = await likedPostIds(
    viewerId,
    page.map((r) => r.id),
  );

  return {
    data: page.map((r) => toSummary(r, liked.has(r.id))),
    nextCursor: hasMore ? page[page.length - 1]!.id : null,
  };
}

/**
 * Published posts, newest first, keyset-paginated. `authorHandle` narrows to
 * one creator. Drafts are never returned here, even the viewer's own.
 */
export function listPosts(
  query: ListPostsQuery,
  viewerId?: string,
): Promise<PostList> {
  return paginatePublishedPosts(
    query.authorHandle ? { author: { handle: query.authorHandle } } : {},
    query,
    viewerId,
  );
}

/**
 * The signed-in user's personalized feed: published posts by the creators
 * they follow, newest first.
 */
export function listFeed(
  viewerId: string,
  query: PaginationQuery,
): Promise<PostList> {
  return paginatePublishedPosts(
    { author: { followers: { some: { followerId: viewerId } } } },
    query,
    viewerId,
  );
}

/**
 * All of a user's own posts (drafts included), newest first. For the author's
 * own dashboard — never exposed as another creator's post list.
 */
export async function listAuthoredPosts(
  authorId: string,
): Promise<PostSummary[]> {
  const rows = await prisma.post.findMany({
    where: { authorId },
    include: postInclude,
    orderBy: { createdAt: "desc" },
  });
  const liked = await likedPostIds(
    authorId,
    rows.map((r) => r.id),
  );
  return rows.map((r) => toSummary(r, liked.has(r.id)));
}

/** Case-insensitive search over title, excerpt and content of published posts. */
export async function searchPosts(
  query: string,
  viewerId?: string,
  limit = 10,
): Promise<PostSummary[]> {
  const rows = await prisma.post.findMany({
    where: {
      published: true,
      shareToCommunity: true,
      OR: [
        { title: { contains: query } },
        { excerpt: { contains: query } },
        { content: { contains: query } },
        { tags: { contains: query.toLowerCase() } },
      ],
    },
    include: postInclude,
    orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
    take: limit,
  });

  const liked = await likedPostIds(
    viewerId,
    rows.map((r) => r.id),
  );
  return rows.map((r) => toSummary(r, liked.has(r.id)));
}

async function loadOwnedPost(slug: string, userId: string) {
  const row = await prisma.post.findUnique({ where: { slug } });
  if (!row) throw new NotFoundError("Post");
  if (row.authorId !== userId) {
    throw new AuthorizationError("You can only modify your own posts");
  }
  return row;
}

export async function updatePost(
  slug: string,
  userId: string,
  input: UpdatePostInput,
): Promise<PostDetail> {
  const existing = await loadOwnedPost(slug, userId);

  // Stamp publishedAt the first time a post goes public; keep it stable after.
  const goingPublic =
    input.published === true && !existing.published && !existing.publishedAt;

  const row = await prisma.post.update({
    where: { id: existing.id },
    data: {
      title: input.title,
      content: input.content,
      excerpt: input.excerpt,
      coverImageUrl: input.coverImageUrl,
      videoUrl: input.videoUrl,
      ...(input.tags !== undefined ? { tags: serializeTags(input.tags) } : {}),
      ...(input.captions !== undefined ? { captions: input.captions } : {}),
      ...(input.shareToCommunity !== undefined
        ? { shareToCommunity: input.shareToCommunity }
        : {}),
      published: input.published,
      ...(goingPublic ? { publishedAt: new Date() } : {}),
    },
    include: postInclude,
  });

  const liked = await likedPostIds(userId, [row.id]);
  return { ...toSummary(row, liked.has(row.id)), content: row.content };
}

export async function deletePost(slug: string, userId: string): Promise<void> {
  const existing = await loadOwnedPost(slug, userId);
  await prisma.post.delete({ where: { id: existing.id } });
}
