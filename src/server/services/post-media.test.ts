import { beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "@/test/helpers";
import { registerUser } from "./auth-service";
import {
  createPost,
  getPostBySlug,
  searchPosts,
  updatePost,
} from "./post-service";

let author: Awaited<ReturnType<typeof registerUser>>;

beforeEach(async () => {
  await resetDb();
  author = await registerUser({
    email: "a@example.com",
    handle: "a",
    name: "A",
    password: "supersecret",
  });
});

describe("post video + tags", () => {
  it("stores videoUrl and normalized, de-duplicated tags", async () => {
    const post = await createPost(author.id, {
      title: "My clip",
      content: "watch this",
      videoUrl: "/uploads/abc.mp4",
      tags: ["Design", "design", "Workflow", "  typography "],
      publish: true,
    });

    expect(post.videoUrl).toBe("/uploads/abc.mp4");
    expect(post.tags).toEqual(["design", "workflow", "typography"]);
  });

  it("caps tags at 10", async () => {
    const post = await createPost(author.id, {
      title: "Many tags",
      content: "…",
      tags: Array.from({ length: 15 }, (_, i) => `tag${i}`),
      publish: false,
    });
    expect(post.tags).toHaveLength(10);
  });

  it("round-trips through getPostBySlug", async () => {
    const created = await createPost(author.id, {
      title: "Roundtrip",
      content: "…",
      tags: ["alpha", "beta"],
      publish: true,
    });
    const fetched = await getPostBySlug(created.slug);
    expect(fetched.tags).toEqual(["alpha", "beta"]);
  });

  it("updatePost can replace and clear tags", async () => {
    const post = await createPost(author.id, {
      title: "Editable",
      content: "…",
      tags: ["one", "two"],
      publish: true,
    });
    const updated = await updatePost(post.slug, author.id, { tags: ["three"] });
    expect(updated.tags).toEqual(["three"]);

    const cleared = await updatePost(post.slug, author.id, { tags: [] });
    expect(cleared.tags).toEqual([]);
  });

  it("search matches a tag", async () => {
    await createPost(author.id, {
      title: "Tagged post",
      content: "nothing relevant in body",
      tags: ["kubernetes"],
      publish: true,
    });
    const hits = await searchPosts("kubernetes");
    expect(hits.map((p) => p.title)).toContain("Tagged post");
  });
});
