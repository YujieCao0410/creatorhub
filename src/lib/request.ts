/**
 * Best-effort client IP for rate-limiting keys. Behind a proxy/CDN (Vercel,
 * nginx) the real client is the first entry of `x-forwarded-for`. Falls back to
 * a constant so local development still exercises the limiter.
 */
export function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return req.headers.get("x-real-ip")?.trim() || "local";
}
