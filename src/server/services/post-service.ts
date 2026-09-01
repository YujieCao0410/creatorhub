import { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/db";
import { AuthorizationError, NotFoundError } from "@/lib/errors";
import { uniqueSlug } from "@/lib/slug";
import type { PaginationQuery } from "@/lib/validation/common";
import type {
  CreatePostInput,
  ListPostsQuery,
  UpdatePostInput,
} from "@/lib/validation/post";

/* ---------- shapes returned to the client ---------- */

export type PostAuthor = {
  id: string;
  handle: string;
  name: string;
  avatarUrl: string | null;
};

export type PostSummary = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  coverImageUrl: string | null;
  published: boolean;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  author: PostAuthor;
  counts: { likes: number; comments: number };
  viewerHasLiked: boolean;
};

export type PostDetail = PostSummary & { content: string };

/* ---------- internal query helpers ---------- */

const postInclude = {
  author: {
    select: { id: true, handle: true, name: true, avatarUrl: true },
  },
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
    published: row.published,
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

export type PostList = {
  data: PostSummary[];
  nextCursor: string | null;
};

/** Shared keyset-paginated query over published posts. */
async function paginatePublishedPosts(
  where: Prisma.PostWhereInput,
  { cursor, limit }: PaginationQuery,
  viewerId?: string,
): Promise<PostList> {
  const rows = await prisma.post.findMany({
    where: { published: true, ...where },
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

/** Case-insensitive search over title, excerpt and content of published posts. */
export async function searchPosts(
  query: string,
  viewerId?: string,
  limit = 10,
): Promise<PostSummary[]> {
  const rows = await prisma.post.findMany({
    where: {
      published: true,
      OR: [
        { title: { contains: query } },
        { excerpt: { contains: query } },
        { content: { contains: query } },
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
