import { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/db";
import type { LikeState } from "@/lib/dto";
import { NotFoundError } from "@/lib/errors";

export type { LikeState } from "@/lib/dto";

async function publishedPostId(slug: string): Promise<string> {
  const post = await prisma.post.findUnique({
    where: { slug },
    select: { id: true, published: true },
  });
  if (!post || !post.published) throw new NotFoundError("Post");
  return post.id;
}

async function likeState(postId: string, userId: string): Promise<LikeState> {
  const [likes, mine] = await Promise.all([
    prisma.like.count({ where: { postId } }),
    prisma.like.findUnique({
      where: { userId_postId: { userId, postId } },
      select: { id: true },
    }),
  ]);
  return { likes, viewerHasLiked: mine !== null };
}

/** Idempotent: liking an already-liked post is a no-op, not an error. */
export async function likePost(
  userId: string,
  slug: string,
): Promise<LikeState> {
  const postId = await publishedPostId(slug);
  try {
    await prisma.like.create({ data: { userId, postId } });
  } catch (error) {
    if (
      !(
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      )
    ) {
      throw error;
    }
  }
  return likeState(postId, userId);
}

/** Idempotent: unliking a post that isn't liked is a no-op. */
export async function unlikePost(
  userId: string,
  slug: string,
): Promise<LikeState> {
  const postId = await publishedPostId(slug);
  await prisma.like.deleteMany({ where: { userId, postId } });
  return likeState(postId, userId);
}
