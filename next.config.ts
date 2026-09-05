import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

/**
 * Security headers applied to every response. The CSP is intentionally strict;
 * `'unsafe-inline'` for styles is required by Tailwind's injected styles, and
 * for scripts by Next.js's inline bootstrap. `frame-ancestors 'none'` plus
 * X-Frame-Options blocks clickjacking.
 */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "object-src 'none'",
      "img-src 'self' https: data: blob:",
      "media-src 'self' https: blob:",
      "font-src 'self' data:",
      "style-src 'self' 'unsafe-inline'",
      `script-src 'self' 'unsafe-inline'${isProd ? "" : " 'unsafe-eval'"}`,
      // Direct browser -> Vercel Blob uploads (bypasses the serverless body-size cap).
      "connect-src 'self' https://*.public.blob.vercel-storage.com",
      "frame-src https://js.stripe.com https://checkout.stripe.com",
    ].join("; "),
  },
  ...(isProd
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
      ]
    : []),
];

const nextConfig: NextConfig = {
  // Self-contained server bundle for Docker / container deploys. Vercel does its
  // own output tracing, and `standalone` breaks its post-build step
  // (`.next/next-server.js.nft.json` ENOENT), so skip it there.
  output: process.env.VERCEL ? undefined : "standalone",
  // Allow tunnels (ngrok / cloudflared) to reach the dev server — needed to
  // test OAuth callbacks from TikTok/Instagram, which require an HTTPS URL.
  allowedDevOrigins: [
    "*.ngrok-free.app",
    "*.ngrok.app",
    "*.ngrok.io",
    "*.trycloudflare.com",
  ],
  // Keep Prisma's engine out of the server bundle; it's loaded at runtime.
  serverExternalPackages: ["@prisma/client", "prisma"],
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
