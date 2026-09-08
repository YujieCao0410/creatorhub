import { describe, expect, it } from "vitest";
import { captionBody, deriveTitle, fullCaption, hashtagLine } from "./caption";

const post = {
  title: "Bloom at your own pace",
  content: "A short body.",
  captions: {} as Record<string, string>,
  tags: ["dance", "fyp", "foxc"],
};

describe("captionBody", () => {
  it("falls back to title + content when no caption exists", () => {
    expect(captionBody(post, "en")).toBe(
      "Bloom at your own pace\n\nA short body.",
    );
  });

  it("prefers the exact-language caption", () => {
    expect(
      captionBody({ ...post, captions: { en: "Custom EN", zh: "中文" } }, "en"),
    ).toBe("Custom EN");
  });

  it("falls back to a base-language match (zh for zh-Hant)", () => {
    expect(
      captionBody({ ...post, captions: { zh: "简体" } }, "zh-Hant"),
    ).toBe("简体");
  });

  it("falls back to any available caption before title+content", () => {
    expect(captionBody({ ...post, captions: { ja: "日本語" } }, "es")).toBe(
      "日本語",
    );
  });
});

describe("hashtagLine", () => {
  it("prefixes # and respects the platform's hashtag limit", () => {
    const many = Array.from({ length: 20 }, (_, i) => `t${i}`);
    expect(hashtagLine(many, "threads").split(" ")).toHaveLength(5);
    expect(hashtagLine(["a", "b"], "youtube")).toBe("#a #b");
  });
});

describe("fullCaption", () => {
  it("returns the caption body for the language (creator types hashtags inline)", () => {
    expect(
      fullCaption(
        { ...post, captions: { en: "dance time #fyp #foxc" } },
        "tiktok",
        "en",
      ),
    ).toBe("dance time #fyp #foxc");
  });

  it("uses the requested language's caption", () => {
    expect(
      fullCaption({ ...post, captions: { zh: "跳舞 #foxc" } }, "instagram", "zh"),
    ).toBe("跳舞 #foxc");
  });

  it("truncates to the platform's caption limit", () => {
    const long = "x".repeat(600);
    expect(
      fullCaption({ ...post, captions: { en: long } }, "threads", "en").length,
    ).toBe(500);
  });
});

describe("deriveTitle", () => {
  it("takes the first line, drops hashtags, caps length", () => {
    expect(deriveTitle("My dance video #fyp #foxc\n\nmore text")).toBe(
      "My dance video",
    );
    expect(deriveTitle("x".repeat(200)).length).toBe(100);
  });
});
