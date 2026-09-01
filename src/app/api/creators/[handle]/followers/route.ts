import { ok, withErrorHandling } from "@/lib/http";
import { paginationQuerySchema } from "@/lib/validation/common";
import { listFollowers } from "@/server/services/follow-service";

export const dynamic = "force-dynamic";

export const GET = withErrorHandling(
  async (req: Request, ctx: { params: Promise<{ handle: string }> }) => {
    const { handle } = await ctx.params;
    const query = paginationQuerySchema.parse(
      Object.fromEntries(new URL(req.url).searchParams),
    );
    return ok(await listFollowers(handle.toLowerCase(), query));
  },
);
