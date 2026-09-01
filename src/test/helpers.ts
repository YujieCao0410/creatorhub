import { prisma } from "@/lib/db";

/**
 * Deletes all rows in foreign-key-safe order. Call in `beforeEach` so each
 * test starts from an empty database.
 */
export async function resetDb(): Promise<void> {
  await prisma.like.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.follow.deleteMany();
  await prisma.post.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.user.deleteMany();
}
