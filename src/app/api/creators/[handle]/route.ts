import { getCurrentUser } from "@/lib/auth/session";
import { NotFoundError } from "@/lib/errors";
import { ok, withErrorHandling } from "@/lib/http";
import { getCreatorProfile } from "@/server/services/user-service";

export const dynamic = "force-dynamic";

export const GET = withErrorHandling(
  async (_req: Request, ctx: { params: Promise<{ handle: string }> }) => {
    const { handle } = await ctx.params;
    const viewer = await getCurrentUser();
    const creator = await getCreatorProfile(handle.toLowerCase(), viewer?.id);
    if (!creator) throw new NotFoundError("Creator");
    return ok({ creator });
  },
);
