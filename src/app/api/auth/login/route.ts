import { createSession } from "@/lib/auth/session";
import { ok, withErrorHandling } from "@/lib/http";
import { loginSchema } from "@/lib/validation/auth";
import { authenticateUser } from "@/server/services/auth-service";

export const POST = withErrorHandling(async (req: Request) => {
  const body = await req.json().catch(() => null);
  const input = loginSchema.parse(body);

  const user = await authenticateUser(input);
  await createSession(user.id);

  return ok({ user });
});
