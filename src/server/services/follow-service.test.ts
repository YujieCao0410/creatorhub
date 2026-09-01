import { beforeEach, describe, expect, it } from "vitest";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { resetDb } from "@/test/helpers";
import { registerUser } from "./auth-service";
import {
  followCreator,
  listFollowers,
  listFollowing,
  unfollowCreator,
} from "./follow-service";

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

describe("followCreator / unfollowCreator", () => {
  it("follows and reports state", async () => {
    const state = await followCreator(bob.id, "alice");
    expect(state).toEqual({ following: true, followerCount: 1 });
  });

  it("is idempotent", async () => {
    await followCreator(bob.id, "alice");
    expect((await followCreator(bob.id, "alice")).followerCount).toBe(1);
  });

  it("rejects following yourself", async () => {
    await expect(followCreator(alice.id, "alice")).rejects.toBeInstanceOf(
      ValidationError,
    );
  });

  it("404s for an unknown creator", async () => {
    await expect(followCreator(bob.id, "ghost")).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it("unfollows and is idempotent", async () => {
    await followCreator(bob.id, "alice");
    expect((await unfollowCreator(bob.id, "alice")).following).toBe(false);
    expect((await unfollowCreator(bob.id, "alice")).followerCount).toBe(0);
  });
});

describe("listFollowers / listFollowing", () => {
  it("lists followers and the creators a user follows", async () => {
    await followCreator(bob.id, "alice");

    const followers = await listFollowers("alice", { limit: 20 });
    expect(followers.data.map((u) => u.handle)).toEqual(["bob"]);

    const following = await listFollowing("bob", { limit: 20 });
    expect(following.data.map((u) => u.handle)).toEqual(["alice"]);

    // Public user shape only — no email.
    expect(JSON.stringify(followers)).not.toContain("@example.com");
  });

  it("paginates", async () => {
    for (let i = 0; i < 5; i++) {
      const u = await registerUser({
        email: `f${i}@example.com`,
        handle: `follower${i}`,
        name: `F${i}`,
        password: "supersecret",
      });
      await followCreator(u.id, "alice");
    }
    const first = await listFollowers("alice", { limit: 3 });
    expect(first.data).toHaveLength(3);
    expect(first.nextCursor).not.toBeNull();
    const second = await listFollowers("alice", {
      limit: 3,
      cursor: first.nextCursor!,
    });
    expect(second.data).toHaveLength(2);
    expect(second.nextCursor).toBeNull();
  });
});
