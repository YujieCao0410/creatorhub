import { beforeEach, describe, expect, it } from "vitest";
import { AuthorizationError, NotFoundError } from "@/lib/errors";
import { prisma } from "@/lib/db";
import { resetDb } from "@/test/helpers";
import { registerUser } from "./auth-service";
import {
  createPost,
  deletePost,
  getPostBySlug,
  listPosts,
  updatePost,
} from "./post-service";

let alice: Awaited<ReturnType<typeof registerUser>>;
let bob: Awaited<ReturnType<typeof registerUser>>;

beforeEach(async () => {
  await resetDb();
  alice = await registerUser({
    email: "alice@example.com",
    handle: "alice",
    name: "Alice",
    password: "supersecret",
  });
  bob = await registerUser({
    email: "bob@example.com",
    handle: "bob",
    name: "Bob",
    password: "supersecret",
  });
});

describe("createPost", () => {
  it("creates a draft by default (no publishedAt)", async () => {
    const post = await createPost(alice.id, {
      title: "My Draft",
      content: "…",
      publish: false,
    });
    expect(post.published).toBe(false);
    expect(post.publishedAt).toBeNull();
    expect(post.slug).toMatch(/^my-draft-[a-z0-9]{6}$/);
  });

  it("stamps publishedAt when publish is true", async () => {
    const post = await createPost(alice.id, {
      title: "Live",
      content: "…",
      publish: true,
    });
    expect(post.published).toBe(true);
    expect(post.publishedAt).not.toBeNull();
  });
});

describe("getPostBySlug", () => {
  it("hides another user's draft (404)", async () => {
    const draft = await createPost(alice.id, {
      title: "Secret",
      content: "…",
      publish: false,
    });
    await expect(getPostBySlug(draft.slug, bob.id)).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it("shows the author their own draft", async () => {
    const draft = await createPost(alice.id, {
      title: "Secret",
      content: "…",
      publish: false,
    });
    const seen = await getPostBySlug(draft.slug, alice.id);
    expect(seen.slug).toBe(draft.slug);
  });

  it("reports viewerHasLiked", async () => {
    const post = await createPost(alice.id, {
      title: "Likeable",
      content: "…",
      publish: true,
    });
    await prisma.like.create({ data: { userId: bob.id, postId: post.id } });
    expect((await getPostBySlug(post.slug, bob.id)).viewerHasLiked).toBe(true);
    expect((await getPostBySlug(post.slug, alice.id)).viewerHasLiked).toBe(false);
  });
});

describe("listPosts", () => {
  beforeEach(async () => {
    for (let i = 0; i < 5; i++) {
      await createPost(alice.id, {
        title: `Post ${i}`,
        content: "…",
        publish: true,
      });
    }
    await createPost(alice.id, { title: "Draft", content: "…", publish: false });
    await createPost(bob.id, { title: "Bob post", content: "…", publish: true });
  });

  it("returns only published posts", async () => {
    const { data } = await listPosts({ limit: 20 });
    expect(data).toHaveLength(6);
    expect(data.every((p) => p.published)).toBe(true);
  });

  it("filters by authorHandle", async () => {
    const { data } = await listPosts({ limit: 20, authorHandle: "bob" });
    expect(data).toHaveLength(1);
    expect(data[0].author.handle).toBe("bob");
  });

  it("paginates with a cursor", async () => {
    const first = await listPosts({ limit: 4 });
    expect(first.data).toHaveLength(4);
    expect(first.nextCursor).not.toBeNull();

    const second = await listPosts({ limit: 4, cursor: first.nextCursor! });
    expect(second.data).toHaveLength(2);
    expect(second.nextCursor).toBeNull();

    const ids = new Set([
      ...first.data.map((p) => p.id),
      ...second.data.map((p) => p.id),
    ]);
    expect(ids.size).toBe(6);
  });
});

describe("updatePost / deletePost", () => {
  it("rejects edits from a non-author (403)", async () => {
    const post = await createPost(alice.id, {
      title: "Mine",
      content: "…",
      publish: true,
    });
    await expect(
      updatePost(post.slug, bob.id, { title: "Hacked" }),
    ).rejects.toBeInstanceOf(AuthorizationError);
  });

  it("keeps the slug stable when the title changes", async () => {
    const post = await createPost(alice.id, {
      title: "Original Title",
      content: "…",
      publish: true,
    });
    const updated = await updatePost(post.slug, alice.id, {
      title: "Completely New Title",
    });
    expect(updated.slug).toBe(post.slug);
    expect(updated.title).toBe("Completely New Title");
  });

  it("stamps publishedAt when a draft is published via update", async () => {
    const draft = await createPost(alice.id, {
      title: "Later",
      content: "…",
      publish: false,
    });
    const published = await updatePost(draft.slug, alice.id, {
      published: true,
    });
    expect(published.publishedAt).not.toBeNull();
  });

  it("deletes only the author's own post", async () => {
    const post = await createPost(alice.id, {
      title: "Temp",
      content: "…",
      publish: true,
    });
    await expect(deletePost(post.slug, bob.id)).rejects.toBeInstanceOf(
      AuthorizationError,
    );
    await deletePost(post.slug, alice.id);
    await expect(getPostBySlug(post.slug)).rejects.toBeInstanceOf(NotFoundError);
  });
});
