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
    captionZh: "看这个",
    publish: true,
  });
}

describe("distribution", () => {
  it("plan lists a caption for every platform", async () => {
    const post = await videoPost();
    const plan = await getDistributionPlan(author.id, post.slug);
    expect(plan.captions.map((c) => c.platform)).toEqual(
      expect.arrayContaining(["youtube", "tiktok", "douyin", "xiaohongshu"]),
    );
    const douyin = plan.captions.find((c) => c.platform === "douyin");
    expect(douyin?.caption).toContain("看这个");
    expect(douyin?.caption).toContain("#dance");
  });

  it("marks non-API platforms as manual", async () => {
    const post = await videoPost();
    const plan = await distributePost(author.id, post.slug, [
      "tiktok",
      "douyin",
    ]);
    const statuses = Object.fromEntries(
      plan.targets.map((t) => [t.platform, t.status]),
    );
    expect(statuses.tiktok).toBe("manual");
    expect(statuses.douyin).toBe("manual");
  });

  it("markTargetPublished records the URL and flips status", async () => {
    const post = await videoPost();
    await distributePost(author.id, post.slug, ["tiktok"]);
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
      distributePost(other.id, post.slug, ["tiktok"]),
    ).rejects.toThrow();
  });

  it("rejects a post with no video", async () => {
    const post = await createPost(author.id, {
      title: "Text only",
      content: "no video here",
      publish: true,
    });
    await expect(
      distributePost(author.id, post.slug, ["tiktok"]),
    ).rejects.toThrow(/no video/i);
  });
});
