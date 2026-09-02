import { requireUser } from "@/lib/auth/session";
import { ok, withErrorHandling } from "@/lib/http";
import { enforceRateLimit } from "@/lib/rate-limit";
import { suggestCaptions } from "@/server/services/caption-ai-service";

// Claude does web searches here; allow time.
export const dynamic = "force-dynamic";
export const maxDuration = 120;

type Ctx = { params: Promise<{ slug: string }> };

export const POST = withErrorHandling(async (_req: Request, ctx: Ctx) => {
  const { slug } = await ctx.params;
  const user = await requireUser();
  // AI calls cost money — keep the ceiling low.
  enforceRateLimit(`ai-captions:${user.id}`, {
    limit: 15,
    windowMs: 3_600_000,
  });

  const suggestion = await suggestCaptions(user.id, slug);
  return ok(suggestion);
});
