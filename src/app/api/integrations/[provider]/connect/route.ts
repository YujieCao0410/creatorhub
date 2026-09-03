import { redirect } from "next/navigation";
import { signStateToken } from "@/lib/auth/jwt";
import { requireUser } from "@/lib/auth/session";
import { ServiceUnavailableError } from "@/lib/errors";
import { withErrorHandling } from "@/lib/http";
import { isProviderId, PROVIDERS } from "@/lib/integrations";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ provider: string }> };

export const GET = withErrorHandling(async (_req: Request, ctx: Ctx) => {
  const { provider } = await ctx.params;
  const user = await requireUser();
  if (!isProviderId(provider) || !PROVIDERS[provider].configured) {
    throw new ServiceUnavailableError(`${provider} publishing is not configured`);
  }
  const state = await signStateToken(user.id, `oauth:${provider}`);
  redirect(PROVIDERS[provider].buildAuthUrl(state));
});
