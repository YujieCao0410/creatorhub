/**
 * Seeds the database with a small, realistic dataset for local development
 * and manual testing. Safe to run repeatedly: it upserts by unique fields.
 *
 * Run with: npm run db:seed   (or automatically after `npm run db:migrate`)
 */
import { PrismaClient } from "../src/generated/prisma";
import { hashPassword } from "../src/lib/auth/password";

const prisma = new PrismaClient();

async function main() {
  const password = await hashPassword("password123");

  const alice = await prisma.user.upsert({
    where: { email: "alice@example.com" },
    update: { membership: "PRO" },
    create: {
      email: "alice@example.com",
      handle: "alice",
      name: "Alice Rivera",
      passwordHash: password,
      bio: "Design systems, typography, and slow mornings.",
      membership: "PRO",
    },
  });

  const bob = await prisma.user.upsert({
    where: { email: "bob@example.com" },
    update: {},
    create: {
      email: "bob@example.com",
      handle: "bob",
      name: "Bob Chen",
      passwordHash: password,
      bio: "Writing about backend engineering and databases.",
    },
  });

  const seedPosts = [
    {
      slug: "designing-a-consistent-api",
      title: "Designing a Consistent API",
      excerpt: "How one error shape keeps a codebase calm.",
      content:
        "A predictable API is mostly about boundaries. Validate at the edge, " +
        "throw typed errors, and let one handler translate them to HTTP.",
      authorId: bob.id,
    },
    {
      slug: "keyset-pagination-in-practice",
      title: "Keyset Pagination in Practice",
      excerpt: "Why cursors beat OFFSET once your data grows.",
      content:
        "OFFSET pagination re-scans every skipped row and drifts when data " +
        "changes under you. A cursor on (sortKey, id) stays correct and fast.",
      authorId: bob.id,
    },
    {
      slug: "a-note-on-slow-mornings",
      title: "A Note on Slow Mornings",
      excerpt: "Design work needs unhurried input.",
      content:
        "The best interface decisions I've made came from mornings with no " +
        "meetings — just coffee, a notebook, and one problem.",
      authorId: alice.id,
    },
  ];

  let post = null;
  for (const [i, data] of seedPosts.entries()) {
    post = await prisma.post.upsert({
      where: { slug: data.slug },
      update: {},
      create: {
        ...data,
        published: true,
        shareToCommunity: true,
        publishedAt: new Date(Date.now() - i * 3_600_000),
      },
    });
  }
  post = post!;

  await prisma.like.upsert({
    where: { userId_postId: { userId: alice.id, postId: post.id } },
    update: {},
    create: { userId: alice.id, postId: post.id },
  });

  await prisma.follow.upsert({
    where: {
      followerId_followingId: { followerId: alice.id, followingId: bob.id },
    },
    update: {},
    create: { followerId: alice.id, followingId: bob.id },
  });

  console.log(
    `Seeded: 2 users (alice=PRO), ${seedPosts.length} posts, 1 like, 1 follow`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
