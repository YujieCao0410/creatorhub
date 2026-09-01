import { getCurrentUser, requireUser } from "@/lib/auth/session";
import { created, ok, readJsonBody, withErrorHandling } from "@/lib/http";
import { enforceRateLimit } from "@/lib/rate-limit";
import {
  createPostSchema,
  listPostsQuerySchema,
} from "@/lib/validation/post";
import { createPost, listPosts } from "@/server/services/post-service";

export const dynamic = "force-dynamic";

export const GET = withErrorHandling(async (req: Request) => {
  const { searchParams } = new URL(req.url);
  const query = listPostsQuerySchema.parse(
    Object.fromEntries(searchParams),
  );

  const viewer = await getCurrentUser();
  const result = await listPosts(query, viewer?.id);
  return ok(result);
});

export const POST = withErrorHandling(async (req: Request) => {
  const user = await requireUser();
  enforceRateLimit(`post-create:${user.id}`, { limit: 20, windowMs: 60_000 });

  const body = await readJsonBody(req);
  const input = createPostSchema.parse(body);

  const post = await createPost(user.id, input);
  return created({ post });
});
