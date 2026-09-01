import { describe, expect, it } from "vitest";
import { formatRelativeDate, preview } from "./format";

describe("formatRelativeDate", () => {
  it("returns an empty string for null", () => {
    expect(formatRelativeDate(null)).toBe("");
  });

  it("uses compact relative units within a week", () => {
    const now = Date.now();
    expect(formatRelativeDate(new Date(now - 30_000).toISOString())).toBe(
      "just now",
    );
    expect(formatRelativeDate(new Date(now - 5 * 60_000).toISOString())).toBe(
      "5m",
    );
    expect(formatRelativeDate(new Date(now - 3 * 3_600_000).toISOString())).toBe(
      "3h",
    );
    expect(formatRelativeDate(new Date(now - 2 * 86_400_000).toISOString())).toBe(
      "2d",
    );
  });
});

describe("preview", () => {
  it("returns short text unchanged", () => {
    expect(preview("hello world", 200)).toBe("hello world");
  });

  it("truncates on a word boundary with an ellipsis", () => {
    const out = preview("the quick brown fox jumps over", 12);
    expect(out.endsWith("…")).toBe(true);
    expect(out.length).toBeLessThanOrEqual(13);
    expect(out).not.toContain("bro…");
  });
});
