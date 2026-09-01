import { beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "@/test/helpers";
import { registerUser } from "./auth-service";
import { followCreator } from "./follow-service";
import { createPost, listFeed } from "./post-service";

let reader: Awaited<ReturnType<typeof registerUser>>;
let alice: Awaited<ReturnType<typeof registerUser>>;
let bob: Awaited<ReturnType<typeof registerUser>>;

beforeEach(async () => {
  await resetDb();
  reader = await registerUser({
    email: "reader@example.com",
    handle: "reader",
    name: "Reader",
    password: "supersecret",
  });
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

describe("listFeed", () => {
  it("returns only posts from followed creators", async () => {
    await createPost(alice.id, { title: "A1", content: "…", publish: true });
    await createPost(bob.id, { title: "B1", content: "…", publish: true });
    await followCreator(reader.id, "alice");

    const feed = await listFeed(reader.id, { limit: 20 });
    expect(feed.data.map((p) => p.title)).toEqual(["A1"]);
  });

  it("excludes drafts by followed creators", async () => {
    await followCreator(reader.id, "alice");
    await createPost(alice.id, { title: "Draft", content: "…", publish: false });

    const feed = await listFeed(reader.id, { limit: 20 });
    expect(feed.data).toHaveLength(0);
  });

  it("is empty when following nobody", async () => {
    await createPost(alice.id, { title: "A1", content: "…", publish: true });
    const feed = await listFeed(reader.id, { limit: 20 });
    expect(feed.data).toHaveLength(0);
  });

  it("paginates newest-first", async () => {
    await followCreator(reader.id, "alice");
    for (let i = 0; i < 5; i++) {
      await createPost(alice.id, {
        title: `Post ${i}`,
        content: "…",
        publish: true,
      });
    }
    const first = await listFeed(reader.id, { limit: 3 });
    expect(first.data).toHaveLength(3);
    const second = await listFeed(reader.id, {
      limit: 3,
      cursor: first.nextCursor!,
    });
    expect(second.data).toHaveLength(2);
    expect(second.nextCursor).toBeNull();
  });
});
