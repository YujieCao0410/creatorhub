import { beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "@/test/helpers";
import { registerUser } from "./auth-service";
import {
  distributePost,
  getDistributionPlan,
  markTargetPublished,
} from "./distribution-service";
import { createPost } from "./post-service";

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

async function videoPost() {
  return createPost(author.id, {
    title: "My clip",
    content: "watch this",
    videoUrl: "/uploads/abc.mp4",
    tags: ["dance", "fyp"],
    captions: { zh: "看这个", ja: "これ見て" },
    publish: true,
  });
}

describe("distribution", () => {
  it("composes each platform's caption in its default language", async () => {
    const post = await videoPost();
    const plan = await getDistributionPlan(author.id, post.slug);

    // Every platform defaults to English; with no English caption on the post
    // the body falls back to another available caption, hashtags still appended.
    const tiktok = plan.captions.find((c) => c.platform === "tiktok");
    expect(tiktok?.lang).toBe("en");
    expect(tiktok?.caption).toContain("#dance");

    const youtube = plan.captions.find((c) => c.platform === "youtube");
    expect(youtube?.lang).toBe("en");
  });

  it("stores a per-platform caption override on the recorded target", async () => {
    const post = await videoPost();
    // The account isn't connected so the publish fails, but the target row is
    // still written with the override caption we passed in.
    await expect(
      distributePost(author.id, post.slug, [
        { platform: "tiktok", lang: "en", caption: "my custom caption #foo" },
      ]),
    ).rejects.toThrow();
    const plan = await getDistributionPlan(author.id, post.slug);
    const target = plan.targets.find((t) => t.platform === "tiktok");
    expect(target?.caption).toBe("my custom caption #foo");
  });

  it("markTargetPublished records the URL and flips status", async () => {
    const post = await videoPost();
    await expect(
      distributePost(author.id, post.slug, [{ platform: "tiktok", lang: "en" }]),
    ).rejects.toThrow();
    const plan = await markTargetPublished(
      author.id,
      post.slug,
      "tiktok",
      "https://www.tiktok.com/@a/video/123",
    );
    const target = plan.targets.find((t) => t.platform === "tiktok");
    expect(target?.status).toBe("published");
    expect(target?.externalUrl).toBe("https://www.tiktok.com/@a/video/123");
    expect(target?.publishedAt).not.toBeNull();
  });

  it("rejects distribution of another user's post", async () => {
    const post = await videoPost();
    const other = await registerUser({
      email: "b@example.com",
      handle: "b",
      name: "B",
      password: "supersecret",
    });
    await expect(
      distributePost(other.id, post.slug, [{ platform: "tiktok", lang: "en" }]),
    ).rejects.toThrow();
  });

  it("records an API platform as failed when the account isn't connected", async () => {
    const post = await videoPost();
    await expect(
      distributePost(author.id, post.slug, [{ platform: "tiktok", lang: "en" }]),
    ).rejects.toThrow(/connect your tiktok/i);
    // The target row still exists, marked failed with the reason.
    const plan = await getDistributionPlan(author.id, post.slug);
    const tiktok = plan.targets.find((t) => t.platform === "tiktok");
    expect(tiktok?.status).toBe("failed");
    expect(tiktok?.error).toMatch(/connect your tiktok/i);
  });

  it("rejects a post with no video", async () => {
    const post = await createPost(author.id, {
      title: "Text only",
      content: "no video here",
      publish: true,
    });
    await expect(
      distributePost(author.id, post.slug, [{ platform: "tiktok", lang: "en" }]),
    ).rejects.toThrow(/no video/i);
  });
});
