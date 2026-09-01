import { destroySession } from "@/lib/auth/session";
import { noContent, withErrorHandling } from "@/lib/http";

export const POST = withErrorHandling(async () => {
  await destroySession();
  return noContent();
});
