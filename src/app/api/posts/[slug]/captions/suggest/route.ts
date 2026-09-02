import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { ok, readJsonBody, withErrorHandling } from "@/lib/http";
import { enforceRateLimit } from "@/lib/rate-limit";
import { suggestCaptions } from "@/server/services/caption-ai-service";

const bodySchema = z.object({
  languages: z.array(z.string()).min(1).max(8),
});

// Claude does web searches here; allow time.
export const dynamic = "force-dynamic";
export const maxDuration = 120;

type Ctx = { params: Promise<{ slug: string }> };

export const POST = withErrorHandling(async (req: Request, ctx: Ctx) => {
  const { slug } = await ctx.params;
  const user = await requireUser();
  // FREE gets a monthly quota (enforced in the service); this is an extra
  // hard per-user daily ceiling so PRO can't run up the bill by spamming.
  enforceRateLimit(`ai-captions:${user.id}`, {
    limit: 30,
    windowMs: 24 * 3_600_000,
  });

  const { languages } = bodySchema.parse(await readJsonBody(req));
  const suggestion = await suggestCaptions(user.id, slug, languages);
  return ok(suggestion);
});
