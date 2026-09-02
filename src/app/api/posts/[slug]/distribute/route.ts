import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { ok, readJsonBody, withErrorHandling } from "@/lib/http";
import { enforceRateLimit } from "@/lib/rate-limit";
import {
  distributePost,
  getDistributionPlan,
} from "@/server/services/distribution-service";

// A distribute run may upload a video to YouTube; give it room.
export const dynamic = "force-dynamic";
export const maxDuration = 300;

type Ctx = { params: Promise<{ slug: string }> };

const bodySchema = z.object({
  targets: z
    .array(
      z.object({
        platform: z.string(),
        lang: z.string(),
        caption: z.string().max(5_000).optional(),
      }),
    )
    .min(1)
    .max(10),
});

export const GET = withErrorHandling(async (_req: Request, ctx: Ctx) => {
  const { slug } = await ctx.params;
  const user = await requireUser();
  const plan = await getDistributionPlan(user.id, slug);
  return ok(plan);
});

export const POST = withErrorHandling(async (req: Request, ctx: Ctx) => {
  const { slug } = await ctx.params;
  const user = await requireUser();
  enforceRateLimit(`distribute:${user.id}`, { limit: 20, windowMs: 3_600_000 });

  const { targets } = bodySchema.parse(await readJsonBody(req));
  const plan = await distributePost(user.id, slug, targets);
  return ok(plan);
});
