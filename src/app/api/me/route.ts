import { requireUser } from "@/lib/auth/session";
import { ok, readJsonBody, withErrorHandling } from "@/lib/http";
import { updateProfileSchema } from "@/lib/validation/user";
import { updateProfile } from "@/server/services/user-service";

// Reads/writes the request's own account; never cacheable.
export const dynamic = "force-dynamic";

export const GET = withErrorHandling(async () => {
  const user = await requireUser();
  return ok({ user });
});

export const PATCH = withErrorHandling(async (req: Request) => {
  const user = await requireUser();
  const body = await readJsonBody(req);
  const input = updateProfileSchema.parse(body);

  const updated = await updateProfile(user.id, input);
  return ok({ user: updated });
});
