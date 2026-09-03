import { requireUser } from "@/lib/auth/session";
import { ValidationError } from "@/lib/errors";
import { noContent, withErrorHandling } from "@/lib/http";
import { isProviderId } from "@/lib/integrations";
import { disconnectIntegration } from "@/server/services/integration-service";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ provider: string }> };

export const POST = withErrorHandling(async (_req: Request, ctx: Ctx) => {
  const { provider } = await ctx.params;
  const user = await requireUser();
  if (!isProviderId(provider)) {
    throw new ValidationError(undefined, "Unknown provider.");
  }
  await disconnectIntegration(user.id, provider);
  return noContent();
});
