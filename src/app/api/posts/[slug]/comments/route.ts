import { getCurrentUser, requireUser } from "@/lib/auth/session";
import { created, ok, withErrorHandling } from "@/lib/http";
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
  const body = await req.json().catch(() => null);
  const input = createCommentSchema.parse(body);
  return created({ comment: await createComment(user.id, slug, input) });
});
