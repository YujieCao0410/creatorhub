import type { Membership } from "./dto";

export type { Membership } from "./dto";

export const MEMBERSHIPS = ["FREE", "PRO"] as const;

/** Draft cap for FREE accounts. PRO is unlimited (`null`). */
export const FREE_DRAFT_LIMIT = 3;

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
