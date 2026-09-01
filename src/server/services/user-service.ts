import type { User } from "@/generated/prisma";
import { prisma } from "@/lib/db";

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
