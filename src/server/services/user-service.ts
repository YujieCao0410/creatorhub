import type { User } from "@/generated/prisma";
import { prisma } from "@/lib/db";
import type {
  CreatorProfile,
  PublicUser,
  SelfUser,
} from "@/lib/dto";
import { aiCreditsLeft, toMembership } from "@/lib/membership";
import { parseTags, serializeTags } from "@/lib/tags";
import type { UpdateProfileInput } from "@/lib/validation/user";

export type { CreatorProfile, PublicUser, SelfUser } from "@/lib/dto";

/**
 * User serializers and lookups.
 *
 * The database `User` row contains `passwordHash` and `email`. Neither should
 * ever reach the client by accident, so nothing outside this module returns a
 * raw `User`:
 *   - `PublicUser`  — safe to show to anyone (a creator profile)
 *   - `SelfUser`    — `PublicUser` plus `email`, only for the signed-in user
 */

export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    handle: user.handle,
    name: user.name,
    bio: user.bio,
    avatarUrl: user.avatarUrl,
    createdAt: user.createdAt.toISOString(),
  };
}

export function toSelfUser(user: User): SelfUser {
  return {
    ...toPublicUser(user),
    email: user.email,
    membership: toMembership(user.membership),
    locale: user.locale ?? "",
    defaultTags: parseTags(user.defaultTags),
    aiCreditsLeft: aiCreditsLeft(user),
  };
}

export async function getUserById(id: string): Promise<SelfUser | null> {
  const user = await prisma.user.findUnique({ where: { id } });
  return user ? toSelfUser(user) : null;
}

export async function getUserByHandle(
  handle: string,
): Promise<PublicUser | null> {
  const user = await prisma.user.findUnique({ where: { handle } });
  return user ? toPublicUser(user) : null;
}

/** A public creator profile with aggregate counts (published posts only). */
export async function getCreatorProfile(
  handle: string,
  viewerId?: string,
): Promise<CreatorProfile | null> {
  const user = await prisma.user.findUnique({
    where: { handle },
    include: {
      _count: {
        select: {
          posts: { where: { published: true } },
          followers: true,
          following: true,
        },
      },
    },
  });
  if (!user) return null;

  const isFollowing =
    viewerId != null &&
    viewerId !== user.id &&
    (await prisma.follow.findUnique({
      where: {
        followerId_followingId: { followerId: viewerId, followingId: user.id },
      },
      select: { id: true },
    })) !== null;

  return {
    ...toPublicUser(user),
    counts: {
      posts: user._count.posts,
      followers: user._count.followers,
      following: user._count.following,
    },
    isFollowing,
  };
}

export type DashboardStats = {
  posts: { total: number; published: number; drafts: number };
  followers: number;
  following: number;
  likesReceived: number;
};

/** Aggregate numbers for the signed-in user's dashboard overview. */
export async function getDashboardStats(
  userId: string,
): Promise<DashboardStats> {
  const [total, published, followers, following, likesReceived] =
    await Promise.all([
      prisma.post.count({ where: { authorId: userId } }),
      prisma.post.count({ where: { authorId: userId, published: true } }),
      prisma.follow.count({ where: { followingId: userId } }),
      prisma.follow.count({ where: { followerId: userId } }),
      prisma.like.count({ where: { post: { authorId: userId } } }),
    ]);

  return {
    posts: { total, published, drafts: total - published },
    followers,
    following,
    likesReceived,
  };
}

/** Case-insensitive search over handle and name. */
export async function searchCreators(
  query: string,
  limit = 10,
): Promise<PublicUser[]> {
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { handle: { contains: query } },
        { name: { contains: query } },
        { bio: { contains: query } },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return users.map(toPublicUser);
}

/** Updates the signed-in user's own profile. Undefined fields are left as-is. */
export async function updateProfile(
  userId: string,
  input: UpdateProfileInput,
): Promise<SelfUser> {
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      name: input.name,
      bio: input.bio,
      avatarUrl: input.avatarUrl,
      ...(input.locale !== undefined ? { locale: input.locale } : {}),
      ...(input.defaultTags !== undefined
        ? { defaultTags: serializeTags(input.defaultTags) }
        : {}),
    },
  });
  return toSelfUser(user);
}
