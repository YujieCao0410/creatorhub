import { getCurrentUser, requireUser } from "@/lib/auth/session";
import { created, ok, withErrorHandling } from "@/lib/http";
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
  const body = await req.json().catch(() => null);
  const input = createPostSchema.parse(body);

  const post = await createPost(user.id, input);
  return created({ post });
});
