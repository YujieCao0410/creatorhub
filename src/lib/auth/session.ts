import { cache } from "react";
import { cookies } from "next/headers";
import { AuthenticationError, PaymentRequiredError } from "@/lib/errors";
import { getUserById, type SelfUser } from "@/server/services/user-service";
import { SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from "./constants";
import { signSessionToken, verifySessionToken } from "./jwt";

/**
 * Session cookie management. The token lives in an httpOnly cookie so client
 * JavaScript (and therefore XSS) cannot read it. `secure` is on in production
 * only, so local http development still works. `sameSite: "lax"` blocks the
 * cookie on cross-site POSTs, which covers the common CSRF cases.
 */

export async function createSession(userId: string): Promise<void> {
  const token = await signSessionToken(userId);
  const store = await cookies();
  store.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE_NAME);
}

/**
 * The signed-in user, or null. Safe to call in route handlers and RSCs.
 * Wrapped in `cache` so multiple callers in one request share a single
 * token verification + database lookup.
 */
export const getCurrentUser = cache(
  async (): Promise<SelfUser | null> => {
    const store = await cookies();
    const token = store.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return null;

    const userId = await verifySessionToken(token);
    if (!userId) return null;

    // Always resolve against the database so a deleted user can't keep a session.
    return getUserById(userId);
  },
);

/** Like `getCurrentUser` but throws a 401 instead of returning null. */
export async function requireUser(): Promise<SelfUser> {
  const user = await getCurrentUser();
  if (!user) throw new AuthenticationError();
  return user;
}

/** Requires an authenticated user on the PRO plan (throws 401 or 402). */
export async function requirePro(): Promise<SelfUser> {
  const user = await requireUser();
  if (user.membership !== "PRO") throw new PaymentRequiredError();
  return user;
}
