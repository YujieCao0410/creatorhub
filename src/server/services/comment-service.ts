import type { Comment as CommentRow } from "@/generated/prisma";
import { prisma } from "@/lib/db";
import type { Comment, CommentList } from "@/lib/dto";
import { AuthorizationError, NotFoundError } from "@/lib/errors";
import type { CreateCommentInput } from "@/lib/validation/comment";
import type { PaginationQuery } from "@/lib/validation/common";

export type { Comment, CommentList } from "@/lib/dto";

const authorSelect = {
  id: true,
  handle: true,
  name: true,
  avatarUrl: true,
} as const;

type Row = CommentRow & {
  author: { id: string; handle: string; name: string; avatarUrl: string | null };
};

async function publishedPost(slug: string) {
  const post = await prisma.post.findUnique({
    where: { slug },
    select: { id: true, published: true, authorId: true },
  });
  if (!post || !post.published) throw new NotFoundError("Post");
  return post;
}

function toComment(
  row: Row,
  viewerId: string | undefined,
  postAuthorId: string,
): Comment {
  return {
    id: row.id,
    body: row.body,
    createdAt: row.createdAt.toISOString(),
    author: row.author,
    canDelete: Boolean(
      viewerId && (viewerId === row.authorId || viewerId === postAuthorId),
    ),
  };
}

/** Comments on a published post, newest first, keyset-paginated. */
export async function listComments(
  slug: string,
  query: PaginationQuery,
  viewerId?: string,
): Promise<CommentList> {
  const post = await publishedPost(slug);

  const rows = await prisma.comment.findMany({
    where: { postId: post.id },
    include: { author: { select: authorSelect } },
    orderBy: { id: "desc" },
    take: query.limit + 1,
    ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
  });

  const hasMore = rows.length > query.limit;
  const page = hasMore ? rows.slice(0, query.limit) : rows;

  return {
    data: page.map((r) => toComment(r, viewerId, post.authorId)),
    nextCursor: hasMore ? page[page.length - 1]!.id : null,
  };
}

export async function createComment(
  userId: string,
  slug: string,
  input: CreateCommentInput,
): Promise<Comment> {
  const post = await publishedPost(slug);
  const row = await prisma.comment.create({
    data: { postId: post.id, authorId: userId, body: input.body },
    include: { author: { select: authorSelect } },
  });
  return toComment(row, userId, post.authorId);
}

/** Deletable by the comment's author or the post's author. */
export async function deleteComment(
  userId: string,
  commentId: string,
): Promise<void> {
  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: { authorId: true, post: { select: { authorId: true } } },
  });
  if (!comment) throw new NotFoundError("Comment");
  if (comment.authorId !== userId && comment.post.authorId !== userId) {
    throw new AuthorizationError("You can only delete your own comments");
  }
  await prisma.comment.delete({ where: { id: commentId } });
}
