import { NotFoundError } from "@/lib/errors";
import { ok, withErrorHandling } from "@/lib/http";
import { getCreatorProfile } from "@/server/services/user-service";

export const GET = withErrorHandling(
  async (_req: Request, ctx: { params: Promise<{ handle: string }> }) => {
    const { handle } = await ctx.params;
    const creator = await getCreatorProfile(handle.toLowerCase());
    if (!creator) throw new NotFoundError("Creator");
    return ok({ creator });
  },
);
