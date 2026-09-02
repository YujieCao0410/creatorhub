import { z } from "zod";
import { requirePro } from "@/lib/auth/session";
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
  // AI generation is a paid (PRO) feature — the API call costs real money.
  const user = await requirePro();
  // Second guard: a hard per-user daily ceiling so one account can't run up
  // the bill by spamming "regenerate".
  enforceRateLimit(`ai-captions:${user.id}`, {
    limit: 30,
    windowMs: 24 * 3_600_000,
  });

  const { languages } = bodySchema.parse(await readJsonBody(req));
  const suggestion = await suggestCaptions(user.id, slug, languages);
  return ok(suggestion);
});
