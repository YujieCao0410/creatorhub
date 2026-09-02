import { requireUser } from "@/lib/auth/session";
import { ok, withErrorHandling } from "@/lib/http";
import { enforceRateLimit } from "@/lib/rate-limit";
import { publishPostToYouTube } from "@/server/services/integration-service";

// Uploads a video file to YouTube; can take a while for large files.
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export const POST = withErrorHandling(
  async (_req: Request, ctx: { params: Promise<{ slug: string }> }) => {
    const { slug } = await ctx.params;
    const user = await requireUser();
    enforceRateLimit(`yt-publish:${user.id}`, { limit: 10, windowMs: 3_600_000 });

    const result = await publishPostToYouTube(user.id, slug);
    return ok(result);
  },
);
