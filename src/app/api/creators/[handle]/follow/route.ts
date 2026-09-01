import { requireUser } from "@/lib/auth/session";
import { ok, withErrorHandling } from "@/lib/http";
import {
  followCreator,
  unfollowCreator,
} from "@/server/services/follow-service";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ handle: string }> };

export const POST = withErrorHandling(async (_req: Request, ctx: Ctx) => {
  const { handle } = await ctx.params;
  const user = await requireUser();
  return ok(await followCreator(user.id, handle.toLowerCase()));
});

export const DELETE = withErrorHandling(async (_req: Request, ctx: Ctx) => {
  const { handle } = await ctx.params;
  const user = await requireUser();
  return ok(await unfollowCreator(user.id, handle.toLowerCase()));
});
