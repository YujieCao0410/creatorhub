import { requireUser } from "@/lib/auth/session";
import { ok, withErrorHandling } from "@/lib/http";

// Depends on the request cookie, so it must never be cached.
export const dynamic = "force-dynamic";

export const GET = withErrorHandling(async () => {
  const user = await requireUser();
  return ok({ user });
});
