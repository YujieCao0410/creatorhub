import type { Membership } from "./dto";

export type { Membership } from "./dto";

export const MEMBERSHIPS = ["FREE", "PRO"] as const;

/** Draft cap for FREE accounts. PRO is unlimited (`null`). */
export const FREE_DRAFT_LIMIT = 3;

/**
 * AI caption generations a FREE account gets each calendar month. Zero —
 * AI captions are a Pro-only feature; FREE accounts type their own.
 */
export const FREE_AI_MONTHLY = 0;

/** Current month key, "YYYY-MM", for the AI usage counter. */
export function currentMonthKey(date = new Date()): string {
  return date.toISOString().slice(0, 7);
}

/** AI generations left this month: a number for FREE, `null` (unlimited) for PRO. */
export function aiCreditsLeft(user: {
  membership: string;
  aiUsedCount: number;
  aiUsedMonth: string;
}): number | null {
  if (toMembership(user.membership) === "PRO") return null;
  const used = user.aiUsedMonth === currentMonthKey() ? user.aiUsedCount : 0;
  return Math.max(0, FREE_AI_MONTHLY - used);
}

export function isMembership(value: string): value is Membership {
  return (MEMBERSHIPS as readonly string[]).includes(value);
}

/** Normalizes an unknown DB string to a valid membership, defaulting to FREE. */
export function toMembership(value: string | null | undefined): Membership {
  return value && isMembership(value) ? value : "FREE";
}

export function draftLimitFor(membership: Membership): number | null {
  return membership === "PRO" ? null : FREE_DRAFT_LIMIT;
}
