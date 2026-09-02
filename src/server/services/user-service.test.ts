import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { resetDb } from "@/test/helpers";
import { registerUser } from "./auth-service";
import { getCreatorProfile, updateProfile } from "./user-service";

beforeEach(async () => {
  await resetDb();
});

async function makeUser(handle: string) {
  return registerUser({
    email: `${handle}@example.com`,
    handle,
    name: handle,
    password: "supersecret",
  });
}

describe("updateProfile", () => {
  it("updates provided fields and leaves others untouched", async () => {
    const user = await makeUser("alice");
    const updated = await updateProfile(user.id, { bio: "Hello world" });
    expect(updated.bio).toBe("Hello world");
    expect(updated.name).toBe("alice");
  });

  it("clears a field when passed null", async () => {
    const user = await makeUser("bob");
    await updateProfile(user.id, { bio: "temp" });
    const cleared = await updateProfile(user.id, { bio: null });
    expect(cleared.bio).toBeNull();
  });

  it("normalizes and stores default tags", async () => {
    const user = await makeUser("carol");
    const updated = await updateProfile(user.id, {
      defaultTags: ["FYP", "fyp", "  Dance ", "#foxc"],
    });
    expect(updated.defaultTags).toEqual(["fyp", "dance", "foxc"]);
  });
});

describe("getCreatorProfile", () => {
  it("returns null for an unknown handle", async () => {
    expect(await getCreatorProfile("ghost")).toBeNull();
  });

  it("counts followers, following and published posts only", async () => {
    const alice = await makeUser("alice");
    const bob = await makeUser("bob");

    await prisma.follow.create({
      data: { followerId: bob.id, followingId: alice.id },
    });
    await prisma.post.createMany({
      data: [
        {
          authorId: alice.id,
          slug: "published-1",
          title: "P1",
          content: "x",
          published: true,
          publishedAt: new Date(),
        },
        { authorId: alice.id, slug: "draft-1", title: "D1", content: "x" },
      ],
    });

    const profile = await getCreatorProfile("alice");
    expect(profile).not.toBeNull();
    expect(profile?.counts).toEqual({ posts: 1, followers: 1, following: 0 });
    // Public profile must not leak the email.
    expect(JSON.stringify(profile)).not.toContain("@example.com");
  });
});
