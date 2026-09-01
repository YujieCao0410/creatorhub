import { requireUser } from "@/lib/auth/session";
import { ok, withErrorHandling } from "@/lib/http";
import { paginationQuerySchema } from "@/lib/validation/common";
import { listFeed } from "@/server/services/post-service";

export const dynamic = "force-dynamic";

export const GET = withErrorHandling(async (req: Request) => {
  const user = await requireUser();
  const query = paginationQuerySchema.parse(
    Object.fromEntries(new URL(req.url).searchParams),
  );
  return ok(await listFeed(user.id, query));
});
