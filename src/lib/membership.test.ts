import { describe, expect, it } from "vitest";
import { aiCreditsLeft, currentMonthKey, FREE_AI_MONTHLY } from "./membership";

describe("aiCreditsLeft", () => {
  const month = currentMonthKey();

  it("is null (unlimited) for PRO", () => {
    expect(
      aiCreditsLeft({ membership: "PRO", aiUsedCount: 99, aiUsedMonth: month }),
    ).toBeNull();
  });

  it("counts down from the monthly allowance for FREE", () => {
    expect(
      aiCreditsLeft({ membership: "FREE", aiUsedCount: 1, aiUsedMonth: month }),
    ).toBe(FREE_AI_MONTHLY - 1);
  });

  it("resets when the stored month is stale", () => {
    expect(
      aiCreditsLeft({
        membership: "FREE",
        aiUsedCount: FREE_AI_MONTHLY,
        aiUsedMonth: "2000-01",
      }),
    ).toBe(FREE_AI_MONTHLY);
  });

  it("never goes negative", () => {
    expect(
      aiCreditsLeft({
        membership: "FREE",
        aiUsedCount: FREE_AI_MONTHLY + 5,
        aiUsedMonth: month,
      }),
    ).toBe(0);
  });
});
