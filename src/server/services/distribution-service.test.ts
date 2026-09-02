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

    const douyin = plan.captions.find((c) => c.platform === "douyin");
    expect(douyin?.lang).toBe("zh");
    expect(douyin?.caption).toContain("看这个");
    expect(douyin?.caption).toContain("#dance");

    // No English caption on the post → YouTube falls back to another caption.
    const youtube = plan.captions.find((c) => c.platform === "youtube");
    expect(youtube?.lang).toBe("en");
  });

  it("marks non-API platforms as manual with the chosen language", async () => {
    const post = await videoPost();
    const plan = await distributePost(author.id, post.slug, [
      { platform: "tiktok", lang: "ja" },
      { platform: "douyin", lang: "zh" },
    ]);
    const byPlatform = Object.fromEntries(
      plan.targets.map((t) => [t.platform, t]),
    );
    expect(byPlatform.tiktok.status).toBe("manual");
    expect(byPlatform.tiktok.lang).toBe("ja");
    expect(byPlatform.douyin.lang).toBe("zh");
  });

  it("stores a per-platform caption override and returns it in the plan", async () => {
    const post = await videoPost();
    const plan = await distributePost(author.id, post.slug, [
      { platform: "tiktok", lang: "en", caption: "just my custom line #foo" },
    ]);
    const tiktok = plan.captions.find((c) => c.platform === "tiktok");
    expect(tiktok?.caption).toBe("just my custom line #foo");
    const target = plan.targets.find((t) => t.platform === "tiktok");
    expect(target?.caption).toBe("just my custom line #foo");
  });

  it("markTargetPublished records the URL and flips status", async () => {
    const post = await videoPost();
    await distributePost(author.id, post.slug, [
      { platform: "tiktok", lang: "en" },
    ]);
    const plan = await markTargetPublished(
      author.id,
      post.slug,
      "tiktok",
      "https://www.tiktok.com/@me/video/123",
    );
    const tiktok = plan.targets.find((t) => t.platform === "tiktok");
    expect(tiktok?.status).toBe("published");
    expect(tiktok?.externalUrl).toBe("https://www.tiktok.com/@me/video/123");
    expect(tiktok?.publishedAt).not.toBeNull();
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
