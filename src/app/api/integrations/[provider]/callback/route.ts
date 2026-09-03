import { redirect } from "next/navigation";
import { verifyStateToken } from "@/lib/auth/jwt";
import { env } from "@/lib/env";
import { isProviderId, PROVIDERS } from "@/lib/integrations";
import { saveIntegration } from "@/server/services/integration-service";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ provider: string }> };

function back(provider: string, status: string): never {
  redirect(
    `${env.APP_URL}/dashboard/settings?integration=${provider}&status=${status}`,
  );
}

export async function GET(req: Request, ctx: Ctx) {
  const { provider } = await ctx.params;
  if (!isProviderId(provider)) back(provider, "failed");

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  if (error || !code || !state) back(provider, "denied");

  const userId = await verifyStateToken(state!, `oauth:${provider}`);
  if (!userId) back(provider, "expired");

  try {
    const tokens = await PROVIDERS[provider].exchangeCode(code!);
    const name = await PROVIDERS[provider]
      .fetchAccountName(tokens.accessToken)
      .catch(() => null);
    await saveIntegration(userId!, provider, tokens, name);
  } catch (err) {
    console.error(`${provider} OAuth callback failed:`, err);
    back(provider, "failed");
  }

  back(provider, "connected");
}
