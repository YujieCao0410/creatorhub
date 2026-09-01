import { beforeEach, describe, expect, it } from "vitest";
import { RateLimitError } from "./errors";
import {
  __resetRateLimits,
  checkRateLimit,
  enforceRateLimit,
} from "./rate-limit";

beforeEach(() => {
  __resetRateLimits();
});

describe("checkRateLimit", () => {
  it("allows up to the limit, then blocks", () => {
    const opts = { limit: 3, windowMs: 1000 };
    expect(checkRateLimit("k", opts).ok).toBe(true);
    expect(checkRateLimit("k", opts).ok).toBe(true);
    expect(checkRateLimit("k", opts).ok).toBe(true);
    expect(checkRateLimit("k", opts).ok).toBe(false);
  });

  it("tracks keys independently", () => {
    const opts = { limit: 1, windowMs: 1000 };
    expect(checkRateLimit("a", opts).ok).toBe(true);
    expect(checkRateLimit("b", opts).ok).toBe(true);
    expect(checkRateLimit("a", opts).ok).toBe(false);
  });

  it("resets after the window elapses", () => {
    const opts = { limit: 1, windowMs: -1 }; // already expired
    expect(checkRateLimit("k", opts).ok).toBe(true);
    expect(checkRateLimit("k", opts).ok).toBe(true);
  });

  it("reports remaining", () => {
    const opts = { limit: 2, windowMs: 1000 };
    expect(checkRateLimit("k", opts).remaining).toBe(1);
    expect(checkRateLimit("k", opts).remaining).toBe(0);
  });
});

describe("enforceRateLimit", () => {
  it("throws RateLimitError with a retry hint once over the limit", () => {
    const opts = { limit: 1, windowMs: 60_000 };
    expect(() => enforceRateLimit("k", opts)).not.toThrow();
    try {
      enforceRateLimit("k", opts);
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(RateLimitError);
      expect((error as RateLimitError).status).toBe(429);
      expect(
        (error as RateLimitError).details as { retryAfterSeconds: number },
      ).toMatchObject({ retryAfterSeconds: expect.any(Number) });
    }
  });
});
