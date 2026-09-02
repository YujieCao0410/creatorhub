import { SignJWT, jwtVerify } from "jose";
import { env } from "@/lib/env";

/**
 * Session tokens.
 *
 * A session is a short JWT that carries only the user id (`sub`). It is signed
 * with HS256 using JWT_SECRET, so the server can trust a token it issued without
 * a database lookup to validate the signature. The user record is still loaded
 * from the database on each request (see `getCurrentUser`), so disabling or
 * deleting a user takes effect immediately.
 */

const secret = new TextEncoder().encode(env.JWT_SECRET);
const ALG = "HS256";
const EXPIRES_IN = "7d";

export async function signSessionToken(userId: string): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: ALG })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(EXPIRES_IN)
    .sign(secret);
}

/** Returns the user id if the token is valid and unexpired, otherwise null. */
export async function verifySessionToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, secret, { algorithms: [ALG] });
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

/**
 * Short-lived signed token for OAuth `state` — proves a callback belongs to the
 * user who started the flow (CSRF protection for the redirect).
 */
export async function signStateToken(
  userId: string,
  purpose: string,
): Promise<string> {
  return new SignJWT({ purpose })
    .setProtectedHeader({ alg: ALG })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(secret);
}

export async function verifyStateToken(
  token: string,
  purpose: string,
): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, secret, { algorithms: [ALG] });
    if (payload.purpose !== purpose) return null;
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}
