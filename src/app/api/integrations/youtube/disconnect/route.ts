import { requireUser } from "@/lib/auth/session";
import { noContent, withErrorHandling } from "@/lib/http";
import { disconnectIntegration } from "@/server/services/integration-service";

export const dynamic = "force-dynamic";

export const POST = withErrorHandling(async () => {
  const user = await requireUser();
  await disconnectIntegration(user.id, "youtube");
  return noContent();
});
