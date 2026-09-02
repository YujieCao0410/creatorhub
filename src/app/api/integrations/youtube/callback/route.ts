import { redirect } from "next/navigation";
import { verifyStateToken } from "@/lib/auth/jwt";
import { env } from "@/lib/env";
import { exchangeCode, getChannelName } from "@/lib/youtube";
import { saveIntegration } from "@/server/services/integration-service";

export const dynamic = "force-dynamic";

function back(status: string): never {
  redirect(`/dashboard/settings?youtube=${status}`);
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error || !code || !state) back("denied");

  const userId = await verifyStateToken(state!, "youtube-oauth");
  if (!userId) back("expired");

  try {
    const tokens = await exchangeCode(code!);
    const channelName = await getChannelName(tokens.accessToken);
    await saveIntegration(userId!, "youtube", tokens, channelName);
  } catch (err) {
    console.error("YouTube OAuth callback failed:", err);
    back("failed");
  }

  // `redirect` throws internally; keep it outside the try so it isn't caught.
  redirect(`${env.APP_URL}/dashboard/settings?youtube=connected`);
}
