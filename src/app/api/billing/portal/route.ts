import { requireUser } from "@/lib/auth/session";
import { ok, withErrorHandling } from "@/lib/http";
import { createPortalSession } from "@/server/services/billing-service";

export const dynamic = "force-dynamic";

export const POST = withErrorHandling(async () => {
  const user = await requireUser();
  const url = await createPortalSession(user);
  return ok({ url });
});
