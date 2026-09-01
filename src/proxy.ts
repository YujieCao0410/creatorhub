import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import { verifySessionToken } from "@/lib/auth/jwt";

/**
 * Proxy (formerly "middleware" — renamed in Next.js 16): a first, cheap
 * authorization gate for page routes.
 *
 * It only checks the session cookie's signature — it never hits the database.
 * The authoritative check is `requireUserPage()` / `requireUser()`, which
 * re-resolves the user against the database. So this file must not make the
 * opposite decision from those guards: it only redirects *unauthenticated*
 * visitors away from protected pages, and it clears a cookie whose token no
 * longer verifies. Deciding "logged in, bounce away from /login" here would
 * loop against the DB-backed guard when a token is valid but the user is gone;
 * that redirect lives in `(auth)/layout.tsx` instead.
 */

const PROTECTED_PREFIXES = ["/dashboard"];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const userId = token ? await verifySessionToken(token) : null;

  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (isProtected && !userId) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname)}`;
    const res = NextResponse.redirect(url);
    if (token) res.cookies.delete(SESSION_COOKIE_NAME); // stale/expired token
    return res;
  }

  // Expose the current path to Server Components (used for post-login redirects).
  const headers = new Headers(req.headers);
  headers.set("x-pathname", pathname);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ["/dashboard/:path*", "/login", "/register"],
};
