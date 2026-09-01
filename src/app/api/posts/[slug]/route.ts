import { getCurrentUser, requireUser } from "@/lib/auth/session";
import { noContent, ok, readJsonBody, withErrorHandling } from "@/lib/http";
import { updatePostSchema } from "@/lib/validation/post";
import {
  deletePost,
  getPostBySlug,
  updatePost,
} from "@/server/services/post-service";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ slug: string }> };

export const GET = withErrorHandling(async (_req: Request, ctx: Ctx) => {
  const { slug } = await ctx.params;
  const viewer = await getCurrentUser();
  const post = await getPostBySlug(slug, viewer?.id);
  return ok({ post });
});

export const PATCH = withErrorHandling(async (req: Request, ctx: Ctx) => {
  const { slug } = await ctx.params;
  const user = await requireUser();
  const body = await readJsonBody(req);
  const input = updatePostSchema.parse(body);

  const post = await updatePost(slug, user.id, input);
  return ok({ post });
});

export const DELETE = withErrorHandling(async (_req: Request, ctx: Ctx) => {
  const { slug } = await ctx.params;
  const user = await requireUser();
  await deletePost(slug, user.id);
  return noContent();
});
