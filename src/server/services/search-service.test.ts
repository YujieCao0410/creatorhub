import { beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "@/test/helpers";
import { registerUser } from "./auth-service";
import { createPost, searchPosts } from "./post-service";
import { searchCreators } from "./user-service";

beforeEach(async () => {
  await resetDb();
});

describe("searchCreators", () => {
  it("matches handle or name, case-insensitively", async () => {
    await registerUser({
      email: "a@example.com",
      handle: "designwhiz",
      name: "Dana Ray",
      password: "supersecret",
    });
    await registerUser({
      email: "b@example.com",
      handle: "coder",
      name: "Sam Design",
      password: "supersecret",
    });

    expect((await searchCreators("DESIGN")).map((u) => u.handle).sort()).toEqual(
      ["coder", "designwhiz"].sort(),
    );
    expect(await searchCreators("nomatch")).toHaveLength(0);
  });
});

describe("searchPosts", () => {
  it("matches published posts on title/excerpt/content only", async () => {
    const author = await registerUser({
      email: "author@example.com",
      handle: "author",
      name: "Author",
      password: "supersecret",
    });
    await createPost(author.id, {
      title: "Postgres tuning",
      content: "indexes and vacuum",
      publish: true,
    });
    await createPost(author.id, {
      title: "Draft about Postgres",
      content: "secret",
      publish: false,
    });

    const results = await searchPosts("postgres");
    expect(results.map((p) => p.title)).toEqual(["Postgres tuning"]);
  });
});
