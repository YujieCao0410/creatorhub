import { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/db";
import type { FollowState, UserPage } from "@/lib/dto";
import { NotFoundError, ValidationError } from "@/lib/errors";
import type { PaginationQuery } from "@/lib/validation/common";
import { toPublicUser } from "./user-service";

export type { FollowState, UserPage } from "@/lib/dto";

async function creatorIdByHandle(handle: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { handle },
    select: { id: true },
  });
  if (!user) throw new NotFoundError("Creator");
  return user.id;
}

async function followState(
  targetId: string,
  followerId: string,
): Promise<FollowState> {
  const [followerCount, mine] = await Promise.all([
    prisma.follow.count({ where: { followingId: targetId } }),
    prisma.follow.findUnique({
      where: {
        followerId_followingId: { followerId, followingId: targetId },
      },
      select: { id: true },
    }),
  ]);
  return { following: mine !== null, followerCount };
}

/** Idempotent. Rejects following yourself. */
export async function followCreator(
  followerId: string,
  handle: string,
): Promise<FollowState> {
  const targetId = await creatorIdByHandle(handle);
  if (targetId === followerId) {
    throw new ValidationError(undefined, "You cannot follow yourself");
  }
  try {
    await prisma.follow.create({
      data: { followerId, followingId: targetId },
    });
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
  return followState(targetId, followerId);
}

/** Idempotent. */
export async function unfollowCreator(
  followerId: string,
  handle: string,
): Promise<FollowState> {
  const targetId = await creatorIdByHandle(handle);
  await prisma.follow.deleteMany({
    where: { followerId, followingId: targetId },
  });
  return followState(targetId, followerId);
}

async function paginateFollows(
  where: Prisma.FollowWhereInput,
  pick: "follower" | "following",
  { cursor, limit }: PaginationQuery,
): Promise<UserPage> {
  const rows = await prisma.follow.findMany({
    where,
    include: { [pick]: true },
    orderBy: { id: "desc" },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  return {
    data: page.map((r) =>
      toPublicUser(pick === "follower" ? r.follower : r.following),
    ),
    nextCursor: hasMore ? page[page.length - 1]!.id : null,
  };
}

/** Users who follow this creator. */
export async function listFollowers(
  handle: string,
  query: PaginationQuery,
): Promise<UserPage> {
  const targetId = await creatorIdByHandle(handle);
  return paginateFollows({ followingId: targetId }, "follower", query);
}

/** Users this creator follows. */
export async function listFollowing(
  handle: string,
  query: PaginationQuery,
): Promise<UserPage> {
  const targetId = await creatorIdByHandle(handle);
  return paginateFollows({ followerId: targetId }, "following", query);
}
