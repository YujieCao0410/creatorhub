import { describe, expect, it } from "vitest";
import { captionBody, fullCaption, hashtagLine } from "./caption";

const post = {
  title: "Bloom at your own pace",
  content: "A short body.",
  captionEn: "",
  captionZh: "",
  tags: ["dance", "fyp", "foxc"],
};

describe("captionBody", () => {
  it("falls back to title + content when the locale caption is empty", () => {
    expect(captionBody(post, "en")).toBe("Bloom at your own pace\n\nA short body.");
  });

  it("prefers the matching-locale caption when set", () => {
    expect(
      captionBody({ ...post, captionEn: "Custom EN" }, "en"),
    ).toBe("Custom EN");
    expect(
      captionBody({ ...post, captionZh: "中文文案" }, "zh"),
    ).toBe("中文文案");
  });
});

describe("hashtagLine", () => {
  it("prefixes # and respects the platform's hashtag limit", () => {
    const many = Array.from({ length: 20 }, (_, i) => `t${i}`);
    expect(hashtagLine(many, "douyin").split(" ")).toHaveLength(6);
    expect(hashtagLine(["a", "b"], "youtube")).toBe("#a #b");
  });
});

describe("fullCaption", () => {
  it("joins body and hashtags for a platform", () => {
    expect(fullCaption(post, "tiktok")).toBe(
      "Bloom at your own pace\n\nA short body.\n\n#dance #fyp #foxc",
    );
  });

  it("uses the Chinese caption for Chinese platforms", () => {
    expect(fullCaption({ ...post, captionZh: "跳舞" }, "xiaohongshu")).toBe(
      "跳舞\n\n#dance #fyp #foxc",
    );
  });
});
