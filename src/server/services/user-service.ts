import type { User } from "@/generated/prisma";
import { prisma } from "@/lib/db";
import type { UpdateProfileInput } from "@/lib/validation/user";

/**
 * User serializers and lookups.
 *
 * The database `User` row contains `passwordHash` and `email`. Neither should
 * ever reach the client by accident, so nothing outside this module returns a
 * raw `User`:
 *   - `PublicUser`  — safe to show to anyone (a creator profile)
 *   - `SelfUser`    — `PublicUser` plus `email`, only for the signed-in user
 */

export type PublicUser = {
  id: string;
  handle: string;
  name: string;
  bio: string | null;
  avatarUrl: string | null;
  createdAt: string;
};

export type SelfUser = PublicUser & {
  email: string;
};

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
  return { ...toPublicUser(user), email: user.email };
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

export type CreatorProfile = PublicUser & {
  counts: {
    posts: number;
    followers: number;
    following: number;
  };
  /** Whether the requesting user follows this creator (false when anonymous). */
  isFollowing: boolean;
};

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
    },
  });
  return toSelfUser(user);
}
