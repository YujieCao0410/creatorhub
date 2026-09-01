import { cookies } from "next/headers";
import { AuthenticationError } from "@/lib/errors";
import { getUserById, type SelfUser } from "@/server/services/user-service";
import { signSessionToken, verifySessionToken } from "./jwt";

/**
 * Session cookie management. The token lives in an httpOnly cookie so client
 * JavaScript (and therefore XSS) cannot read it. `secure` is on in production
 * only, so local http development still works. `sameSite: "lax"` blocks the
 * cookie on cross-site POSTs, which covers the common CSRF cases.
 */

const COOKIE_NAME = "session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

export async function createSession(userId: string): Promise<void> {
  const token = await signSessionToken(userId);
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

/** The signed-in user, or null. Safe to call in route handlers and RSCs. */
export async function getCurrentUser(): Promise<SelfUser | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const userId = await verifySessionToken(token);
  if (!userId) return null;

  // Always resolve against the database so a deleted user can't keep a session.
  return getUserById(userId);
}

/** Like `getCurrentUser` but throws a 401 instead of returning null. */
export async function requireUser(): Promise<SelfUser> {
  const user = await getCurrentUser();
  if (!user) throw new AuthenticationError();
  return user;
}
