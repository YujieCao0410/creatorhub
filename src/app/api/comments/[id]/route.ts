import { requireUser } from "@/lib/auth/session";
import { noContent, withErrorHandling } from "@/lib/http";
import { deleteComment } from "@/server/services/comment-service";

export const dynamic = "force-dynamic";

export const DELETE = withErrorHandling(
  async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
    const { id } = await ctx.params;
    const user = await requireUser();
    await deleteComment(user.id, id);
    return noContent();
  },
);
