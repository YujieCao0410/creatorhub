import { describe, expect, it } from "vitest";
import { aiCreditsLeft, currentMonthKey } from "./membership";

describe("aiCreditsLeft", () => {
  const month = currentMonthKey();

  it("is null (unlimited) for PRO", () => {
    expect(
      aiCreditsLeft({ membership: "PRO", aiUsedCount: 99, aiUsedMonth: month }),
    ).toBeNull();
  });

  it("is 0 for FREE — AI captions require Pro", () => {
    expect(
      aiCreditsLeft({ membership: "FREE", aiUsedCount: 0, aiUsedMonth: month }),
    ).toBe(0);
  });

  it("never goes negative regardless of stored usage", () => {
    expect(
      aiCreditsLeft({ membership: "FREE", aiUsedCount: 50, aiUsedMonth: "2000-01" }),
    ).toBe(0);
  });
});
