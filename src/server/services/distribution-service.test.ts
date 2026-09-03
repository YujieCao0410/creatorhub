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
      { platform: "bilibili", lang: "ja" },
      { platform: "douyin", lang: "zh" },
    ]);
    const byPlatform = Object.fromEntries(
      plan.targets.map((t) => [t.platform, t]),
    );
    expect(byPlatform.bilibili.status).toBe("manual");
    expect(byPlatform.bilibili.lang).toBe("ja");
    expect(byPlatform.douyin.lang).toBe("zh");
  });

  it("stores a per-platform caption override and returns it in the plan", async () => {
    const post = await videoPost();
    const plan = await distributePost(author.id, post.slug, [
      { platform: "douyin", lang: "zh", caption: "我的自定义文案 #foo" },
    ]);
    const douyin = plan.captions.find((c) => c.platform === "douyin");
    expect(douyin?.caption).toBe("我的自定义文案 #foo");
    const target = plan.targets.find((t) => t.platform === "douyin");
    expect(target?.caption).toBe("我的自定义文案 #foo");
  });

  it("markTargetPublished records the URL and flips status", async () => {
    const post = await videoPost();
    await distributePost(author.id, post.slug, [
      { platform: "xiaohongshu", lang: "zh" },
    ]);
    const plan = await markTargetPublished(
      author.id,
      post.slug,
      "xiaohongshu",
      "https://www.xiaohongshu.com/explore/123",
    );
    const target = plan.targets.find((t) => t.platform === "xiaohongshu");
    expect(target?.status).toBe("published");
    expect(target?.externalUrl).toBe(
      "https://www.xiaohongshu.com/explore/123",
    );
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
