import { requireUser } from "@/lib/auth/session";
import { ok, withErrorHandling } from "@/lib/http";
import { likePost, unlikePost } from "@/server/services/like-service";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ slug: string }> };

export const POST = withErrorHandling(async (_req: Request, ctx: Ctx) => {
  const { slug } = await ctx.params;
  const user = await requireUser();
  return ok(await likePost(user.id, slug));
});

export const DELETE = withErrorHandling(async (_req: Request, ctx: Ctx) => {
  const { slug } = await ctx.params;
  const user = await requireUser();
  return ok(await unlikePost(user.id, slug));
});
