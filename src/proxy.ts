import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import { verifySessionToken } from "@/lib/auth/jwt";
import { isSameOrigin } from "@/lib/security";

/**
 * Proxy (formerly "middleware" — renamed in Next.js 16). Two jobs:
 *
 * 1. API: reject cross-site state-changing requests (CSRF defense in depth;
 *    the SameSite=lax session cookie is the primary defense). Stripe webhooks
 *    are exempt — they're server-to-server with their own signature check.
 *
 * 2. Pages: a cheap auth gate. It only checks the session cookie's signature,
 *    never the database. The authoritative check is `requireUserPage()` /
 *    `requireUser()`. This file must not make the opposite decision from those
 *    guards, so it never redirects *away* from /login based on a token alone.
 */

const PROTECTED_PREFIXES = ["/dashboard"];
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/api/")) {
    if (
      !SAFE_METHODS.has(req.method) &&
      !pathname.startsWith("/api/webhooks/") &&
      !isSameOrigin(req)
    ) {
      return NextResponse.json(
        {
          error: {
            code: "CROSS_ORIGIN_BLOCKED",
            message: "Cross-origin request blocked",
          },
        },
        { status: 403 },
      );
    }
    return NextResponse.next();
  }

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

  const headers = new Headers(req.headers);
  headers.set("x-pathname", pathname);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ["/dashboard/:path*", "/login", "/register", "/api/:path*"],
};
