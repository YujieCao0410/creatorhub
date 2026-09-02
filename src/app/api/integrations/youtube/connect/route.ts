import { redirect } from "next/navigation";
import { signStateToken } from "@/lib/auth/jwt";
import { requireUser } from "@/lib/auth/session";
import { withErrorHandling } from "@/lib/http";
import { buildAuthUrl, youtubeConfigured } from "@/lib/youtube";
import { ServiceUnavailableError } from "@/lib/errors";

export const dynamic = "force-dynamic";

export const GET = withErrorHandling(async () => {
  const user = await requireUser();
  if (!youtubeConfigured) {
    throw new ServiceUnavailableError("YouTube publishing is not configured");
  }
  const state = await signStateToken(user.id, "youtube-oauth");
  redirect(buildAuthUrl(state));
});
