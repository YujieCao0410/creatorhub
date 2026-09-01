/**
 * Same-origin check for state-changing API requests — a second layer behind the
 * SameSite=lax session cookie.
 *
 * Returns true when the request is safe to process:
 *  - `Sec-Fetch-Site` is anything other than `cross-site` (browsers), or
 *  - the `Origin` header is absent (non-browser clients, same-origin GET), or
 *  - the `Origin` host matches the request host.
 */
export function isSameOrigin(req: Request): boolean {
  const secFetchSite = req.headers.get("sec-fetch-site");
  if (secFetchSite && secFetchSite !== "cross-site") return true;
  if (secFetchSite === "cross-site") return false;

  const origin = req.headers.get("origin");
  if (!origin) return true;

  try {
    const originHost = new URL(origin).host;
    const requestHost =
      req.headers.get("x-forwarded-host") ?? req.headers.get("host");
    return originHost === requestHost;
  } catch {
    return false;
  }
}
