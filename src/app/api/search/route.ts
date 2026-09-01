import { getCurrentUser } from "@/lib/auth/session";
import { ok, withErrorHandling } from "@/lib/http";
import { searchQuerySchema } from "@/lib/validation/search";
import { searchPosts } from "@/server/services/post-service";
import { searchCreators } from "@/server/services/user-service";

export const dynamic = "force-dynamic";

export const GET = withErrorHandling(async (req: Request) => {
  const { q, type } = searchQuerySchema.parse(
    Object.fromEntries(new URL(req.url).searchParams),
  );
  const viewer = await getCurrentUser();

  const [creators, posts] = await Promise.all([
    type === "posts" ? Promise.resolve([]) : searchCreators(q),
    type === "creators" ? Promise.resolve([]) : searchPosts(q, viewer?.id),
  ]);

  return ok({ query: q, creators, posts });
});
