import { requireUser } from "@/lib/auth/session";
import { ValidationError } from "@/lib/errors";
import { ok, withErrorHandling } from "@/lib/http";
import { enforceRateLimit } from "@/lib/rate-limit";
import { assertSameOrigin } from "@/lib/security";
import { saveUpload } from "@/lib/storage";

// Excluded from the proxy (see src/proxy.ts) so large video bodies aren't
// buffered/capped; the same-origin check that proxy would do runs here instead.
export const dynamic = "force-dynamic";

export const POST = withErrorHandling(async (req: Request) => {
  assertSameOrigin(req);
  const user = await requireUser();
  enforceRateLimit(`upload:${user.id}`, { limit: 30, windowMs: 60_000 });

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  const kind = form?.get("kind");

  if (!(file instanceof File)) {
    throw new ValidationError(undefined, "No file provided");
  }
  if (kind !== "image" && kind !== "video") {
    throw new ValidationError(undefined, "kind must be 'image' or 'video'");
  }

  return ok(await saveUpload(file, kind));
});
