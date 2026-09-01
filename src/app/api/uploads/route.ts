import { requireUser } from "@/lib/auth/session";
import { ValidationError } from "@/lib/errors";
import { ok, withErrorHandling } from "@/lib/http";
import { enforceRateLimit } from "@/lib/rate-limit";
import { saveUpload } from "@/lib/storage";

export const dynamic = "force-dynamic";

export const POST = withErrorHandling(async (req: Request) => {
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
