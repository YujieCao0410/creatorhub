import { describe, expect, it } from "vitest";
import { extractJson, normalizeTags } from "./captions";

describe("extractJson", () => {
  it("pulls a JSON object out of surrounding prose or fences", () => {
    expect(extractJson('here you go:\n```json\n{"a":1}\n```')).toEqual({ a: 1 });
    expect(extractJson('{"captionEn":"hi","tags":["a"]}')).toEqual({
      captionEn: "hi",
      tags: ["a"],
    });
  });

  it("throws when there is no object", () => {
    expect(() => extractJson("no json here")).toThrow();
  });
});

describe("normalizeTags", () => {
  it("strips #, lowercases, removes spaces, dedupes and caps at 15", () => {
    expect(
      normalizeTags(["#Dance", "dance", "  For You  ", "中文标签", "a b"]),
    ).toEqual(["dance", "foryou", "中文标签", "ab"]);
  });

  it("drops tags that break the tag rules", () => {
    expect(normalizeTags(["ok", "way-too-long-".repeat(5), "!!!", "fine"])).toEqual(
      ["ok", "fine"],
    );
  });
});
