import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { requireUser } from "@/lib/auth/session";
import { ServiceUnavailableError, ValidationError } from "@/lib/errors";
import { ok, withErrorHandling } from "@/lib/http";
import { enforceRateLimit } from "@/lib/rate-limit";
import { assertSameOrigin } from "@/lib/security";

/**
 * Issues short-lived client tokens for direct browser → Vercel Blob uploads.
 *
 * Server route handlers on Vercel cap request bodies at ~4.5 MB, which most
 * video clips exceed — so the browser uploads straight to Blob storage and
 * this route only ever sees the (tiny) token-negotiation request, never the
 * file itself. See `MediaUpload` for the client side.
 *
 * Vercel also calls this same URL server-to-server once the upload finishes
 * ("blob.upload-completed") — that request carries no user session, which is
 * fine: we don't implement `onUploadCompleted`, so `handleUpload` no-ops it.
 * Auth/rate-limiting only runs for the token-generation event, which does
 * come from the signed-in browser.
 */

const RULES: Record<"image" | "video", { maxBytes: number; types: string[] }> = {
  image: {
    maxBytes: 8 * 1024 * 1024,
    types: ["image/jpeg", "image/png", "image/webp", "image/gif"],
  },
  video: {
    maxBytes: 200 * 1024 * 1024,
    types: ["video/mp4", "video/webm", "video/quicktime"],
  },
};

export const dynamic = "force-dynamic";

export const POST = withErrorHandling(async (req: Request) => {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new ServiceUnavailableError("Direct uploads are not configured");
  }

  const body = (await req.json().catch(() => null)) as HandleUploadBody | null;
  if (!body) throw new ValidationError(undefined, "Invalid request body");

  const result = await handleUpload({
    body,
    request: req,
    onBeforeGenerateToken: async (_pathname, clientPayload) => {
      assertSameOrigin(req);
      const user = await requireUser();
      enforceRateLimit(`upload:${user.id}`, { limit: 30, windowMs: 60_000 });

      let kind: "image" | "video" = "video";
      try {
        const parsed = clientPayload ? JSON.parse(clientPayload) : null;
        if (parsed?.kind === "image" || parsed?.kind === "video") kind = parsed.kind;
      } catch {
        // fall through with the video default
      }
      const rule = RULES[kind];

      return {
        allowedContentTypes: rule.types,
        maximumSizeInBytes: rule.maxBytes,
        addRandomSuffix: true,
      };
    },
  });

  return ok(result);
});
