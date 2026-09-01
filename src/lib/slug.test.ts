import { describe, expect, it } from "vitest";
import { slugify, uniqueSlug } from "./slug";

describe("slugify", () => {
  it.each([
    ["Designing a Consistent API", "designing-a-consistent-api"],
    ["  Trim   me  ", "trim-me"],
    ["Special!! ch@rs & symbols", "special-chrs-symbols"],
    ["café RÉSUMÉ", "cafe-resume"],
    ["multiple---dashes", "multiple-dashes"],
  ])("%j -> %j", (input, expected) => {
    expect(slugify(input)).toBe(expected);
  });
});

describe("uniqueSlug", () => {
  it("keeps the base and appends a suffix", () => {
    const slug = uniqueSlug("Hello World");
    expect(slug).toMatch(/^hello-world-[a-z0-9]{6}$/);
  });

  it("falls back to 'post' for a title with no slug characters", () => {
    expect(uniqueSlug("!!!")).toMatch(/^post-[a-z0-9]{6}$/);
  });

  it("produces different slugs on repeated calls", () => {
    expect(uniqueSlug("Same Title")).not.toBe(uniqueSlug("Same Title"));
  });
});
