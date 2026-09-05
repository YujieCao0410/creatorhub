import { describe, expect, it } from "vitest";
import { captionBody, fullCaption, hashtagLine } from "./caption";

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
  it("joins body and hashtags for a platform + language", () => {
    expect(fullCaption(post, "tiktok", "en")).toBe(
      "Bloom at your own pace\n\nA short body.\n\n#dance #fyp #foxc",
    );
  });

  it("uses the requested language's caption", () => {
    expect(
      fullCaption({ ...post, captions: { zh: "跳舞" } }, "instagram", "zh"),
    ).toBe("跳舞\n\n#dance #fyp #foxc");
  });
});
