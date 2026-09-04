/**
 * Resets the e2e database to a known state without deleting the file (which
 * would orphan a running server's connection). Run by e2e/global-setup.ts.
 */
import { PrismaClient } from "../src/generated/prisma";
import { hashPassword } from "../src/lib/auth/password";

const prisma = new PrismaClient();

async function main() {
  await prisma.like.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.follow.deleteMany();
  await prisma.post.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.user.deleteMany();

  const password = await hashPassword("password123");

  const alice = await prisma.user.create({
    data: {
      email: "alice@example.com",
      handle: "alice",
      name: "Alice Rivera",
      passwordHash: password,
      bio: "Design systems, typography, and slow mornings.",
      membership: "PRO",
    },
  });
  const bob = await prisma.user.create({
    data: {
      email: "bob@example.com",
      handle: "bob",
      name: "Bob Chen",
      passwordHash: password,
      bio: "Writing about backend engineering and databases.",
    },
  });

  const posts = [
    {
      slug: "designing-a-consistent-api",
      title: "Designing a Consistent API",
      excerpt: "How one error shape keeps a codebase calm.",
      content: "Validate at the edge, throw typed errors, translate once.",
      authorId: bob.id,
    },
    {
      slug: "keyset-pagination-in-practice",
      title: "Keyset Pagination in Practice",
      excerpt: "Why cursors beat OFFSET once your data grows.",
      content: "A cursor on (sortKey, id) stays correct and fast.",
      authorId: bob.id,
    },
    {
      slug: "a-note-on-slow-mornings",
      title: "A Note on Slow Mornings",
      excerpt: "Design work needs unhurried input.",
      content: "The best interface decisions come from quiet mornings.",
      authorId: alice.id,
    },
  ];

  for (const [i, data] of posts.entries()) {
    await prisma.post.create({
      data: {
        ...data,
        published: true,
        shareToCommunity: true,
        publishedAt: new Date(Date.now() - i * 3_600_000),
      },
    });
  }

  await prisma.follow.create({
    data: { followerId: alice.id, followingId: bob.id },
  });

  console.log("e2e db reset: 2 users, 3 posts, 1 follow");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
