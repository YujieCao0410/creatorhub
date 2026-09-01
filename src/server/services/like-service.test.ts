import { beforeEach, describe, expect, it } from "vitest";
import { NotFoundError } from "@/lib/errors";
import { resetDb } from "@/test/helpers";
import { registerUser } from "./auth-service";
import { likePost, unlikePost } from "./like-service";
import { createPost } from "./post-service";

let alice: Awaited<ReturnType<typeof registerUser>>;
let bob: Awaited<ReturnType<typeof registerUser>>;
let slug: string;

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
  slug = (
    await createPost(alice.id, { title: "Post", content: "…", publish: true })
  ).slug;
});

describe("likePost / unlikePost", () => {
  it("likes a post and reports state", async () => {
    const state = await likePost(bob.id, slug);
    expect(state).toEqual({ likes: 1, viewerHasLiked: true });
  });

  it("is idempotent when liking twice", async () => {
    await likePost(bob.id, slug);
    const state = await likePost(bob.id, slug);
    expect(state.likes).toBe(1);
  });

  it("counts likes from multiple users", async () => {
    await likePost(alice.id, slug);
    const state = await likePost(bob.id, slug);
    expect(state.likes).toBe(2);
  });

  it("unlikes and is idempotent", async () => {
    await likePost(bob.id, slug);
    expect((await unlikePost(bob.id, slug)).likes).toBe(0);
    expect((await unlikePost(bob.id, slug)).viewerHasLiked).toBe(false);
  });

  it("404s for an unknown slug", async () => {
    await expect(likePost(bob.id, "nope")).rejects.toBeInstanceOf(NotFoundError);
  });

  it("404s for a draft post", async () => {
    const draft = await createPost(alice.id, {
      title: "Draft",
      content: "…",
      publish: false,
    });
    await expect(likePost(bob.id, draft.slug)).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });
});
