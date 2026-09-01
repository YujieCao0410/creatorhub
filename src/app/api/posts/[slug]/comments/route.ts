import { getCurrentUser, requireUser } from "@/lib/auth/session";
import { created, ok, readJsonBody, withErrorHandling } from "@/lib/http";
import { enforceRateLimit } from "@/lib/rate-limit";
import { createCommentSchema } from "@/lib/validation/comment";
import { paginationQuerySchema } from "@/lib/validation/common";
import {
  createComment,
  listComments,
} from "@/server/services/comment-service";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ slug: string }> };

export const GET = withErrorHandling(async (req: Request, ctx: Ctx) => {
  const { slug } = await ctx.params;
  const query = paginationQuerySchema.parse(
    Object.fromEntries(new URL(req.url).searchParams),
  );
  const viewer = await getCurrentUser();
  return ok(await listComments(slug, query, viewer?.id));
});

export const POST = withErrorHandling(async (req: Request, ctx: Ctx) => {
  const { slug } = await ctx.params;
  const user = await requireUser();
  enforceRateLimit(`comment-create:${user.id}`, { limit: 15, windowMs: 60_000 });

  const body = await readJsonBody(req);
  const input = createCommentSchema.parse(body);
  return created({ comment: await createComment(user.id, slug, input) });
});
