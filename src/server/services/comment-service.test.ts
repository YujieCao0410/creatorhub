import { beforeEach, describe, expect, it } from "vitest";
import { AuthorizationError, NotFoundError } from "@/lib/errors";
import { resetDb } from "@/test/helpers";
import { registerUser } from "./auth-service";
import {
  createComment,
  deleteComment,
  listComments,
} from "./comment-service";
import { createPost } from "./post-service";

let author: Awaited<ReturnType<typeof registerUser>>;
let reader: Awaited<ReturnType<typeof registerUser>>;
let stranger: Awaited<ReturnType<typeof registerUser>>;
let slug: string;

beforeEach(async () => {
  await resetDb();
  author = await registerUser({
    email: "author@example.com",
    handle: "author",
    name: "Author",
    password: "supersecret",
  });
  reader = await registerUser({
    email: "reader@example.com",
    handle: "reader",
    name: "Reader",
    password: "supersecret",
  });
  stranger = await registerUser({
    email: "stranger@example.com",
    handle: "stranger",
    name: "Stranger",
    password: "supersecret",
  });
  slug = (
    await createPost(author.id, { title: "Post", content: "…", publish: true })
  ).slug;
});

describe("createComment / listComments", () => {
  it("adds a comment and returns it newest-first", async () => {
    await createComment(reader.id, slug, { body: "First" });
    await createComment(reader.id, slug, { body: "Second" });

    const { data } = await listComments(slug, { limit: 20 });
    expect(data.map((c) => c.body)).toEqual(["Second", "First"]);
    expect(data[0]!.author.handle).toBe("reader");
  });

  it("404s for a draft post", async () => {
    const draft = await createPost(author.id, {
      title: "Draft",
      content: "…",
      publish: false,
    });
    await expect(
      createComment(reader.id, draft.slug, { body: "hi" }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("sets canDelete for the comment author and the post author only", async () => {
    await createComment(reader.id, slug, { body: "mine" });

    const asReader = await listComments(slug, { limit: 20 }, reader.id);
    const asAuthor = await listComments(slug, { limit: 20 }, author.id);
    const asStranger = await listComments(slug, { limit: 20 }, stranger.id);
    const asAnon = await listComments(slug, { limit: 20 });

    expect(asReader.data[0]!.canDelete).toBe(true);
    expect(asAuthor.data[0]!.canDelete).toBe(true);
    expect(asStranger.data[0]!.canDelete).toBe(false);
    expect(asAnon.data[0]!.canDelete).toBe(false);
  });

  it("paginates", async () => {
    for (let i = 0; i < 5; i++) {
      await createComment(reader.id, slug, { body: `c${i}` });
    }
    const first = await listComments(slug, { limit: 3 });
    expect(first.data).toHaveLength(3);
    const second = await listComments(slug, {
      limit: 3,
      cursor: first.nextCursor!,
    });
    expect(second.data).toHaveLength(2);
    expect(second.nextCursor).toBeNull();
  });
});

describe("deleteComment", () => {
  it("lets the comment author delete it", async () => {
    const c = await createComment(reader.id, slug, { body: "x" });
    await deleteComment(reader.id, c.id);
    expect((await listComments(slug, { limit: 20 })).data).toHaveLength(0);
  });

  it("lets the post author delete others' comments (moderation)", async () => {
    const c = await createComment(reader.id, slug, { body: "x" });
    await deleteComment(author.id, c.id);
    expect((await listComments(slug, { limit: 20 })).data).toHaveLength(0);
  });

  it("rejects deletion by anyone else", async () => {
    const c = await createComment(reader.id, slug, { body: "x" });
    await expect(deleteComment(stranger.id, c.id)).rejects.toBeInstanceOf(
      AuthorizationError,
    );
  });

  it("404s for an unknown comment", async () => {
    await expect(deleteComment(reader.id, "nope")).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });
});
