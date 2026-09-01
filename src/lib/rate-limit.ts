import { RateLimitError } from "./errors";

/**
 * Fixed-window rate limiting.
 *
 * This implementation is in-memory and therefore per-process: it resets on
 * deploy and does not coordinate across serverless instances. That is an
 * acceptable first line of defense for an MVP. The `enforceRateLimit` interface
 * is deliberately small so it can be backed by Redis/Upstash later without
 * touching call sites.
 */

type Window = { count: number; resetAt: number };

const windows = new Map<string, Window>();
const MAX_TRACKED_KEYS = 10_000;

export type RateLimitOptions = {
  /** Max requests allowed per window. */
  limit: number;
  /** Window length in milliseconds. */
  windowMs: number;
};

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  resetAt: number;
};

export function checkRateLimit(
  key: string,
  { limit, windowMs }: RateLimitOptions,
): RateLimitResult {
  const now = Date.now();
  const existing = windows.get(key);

  if (!existing || existing.resetAt <= now) {
    if (windows.size > MAX_TRACKED_KEYS) sweep(now);
    const resetAt = now + windowMs;
    windows.set(key, { count: 1, resetAt });
    return { ok: true, remaining: limit - 1, resetAt };
  }

  existing.count += 1;
  return {
    ok: existing.count <= limit,
    remaining: Math.max(0, limit - existing.count),
    resetAt: existing.resetAt,
  };
}

/** Throws `RateLimitError` (HTTP 429) when the caller is over the limit. */
export function enforceRateLimit(key: string, options: RateLimitOptions): void {
  const result = checkRateLimit(key, options);
  if (!result.ok) {
    throw new RateLimitError(
      Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000)),
    );
  }
}

/** Test-only: clears all counters. */
export function __resetRateLimits(): void {
  windows.clear();
}

function sweep(now: number): void {
  for (const [key, window] of windows) {
    if (window.resetAt <= now) windows.delete(key);
  }
}
