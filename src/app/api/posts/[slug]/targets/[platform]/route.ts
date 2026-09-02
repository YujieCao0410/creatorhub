import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { ok, readJsonBody, withErrorHandling } from "@/lib/http";
import { markTargetPublished } from "@/server/services/distribution-service";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ slug: string; platform: string }> };

const bodySchema = z.object({
  externalUrl: z.union([z.string().trim().url().max(2048), z.literal("")]).optional(),
});

// Mark a manual (non-API) platform as posted, optionally with its live URL.
export const POST = withErrorHandling(async (req: Request, ctx: Ctx) => {
  const { slug, platform } = await ctx.params;
  const user = await requireUser();
  const { externalUrl } = bodySchema.parse((await readJsonBody(req)) ?? {});
  const plan = await markTargetPublished(
    user.id,
    slug,
    platform,
    externalUrl ?? null,
  );
  return ok(plan);
});
