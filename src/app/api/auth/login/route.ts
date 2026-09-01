import { createSession } from "@/lib/auth/session";
import { ok, withErrorHandling } from "@/lib/http";
import { enforceRateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request";
import { loginSchema } from "@/lib/validation/auth";
import { authenticateUser } from "@/server/services/auth-service";

export const POST = withErrorHandling(async (req: Request) => {
  enforceRateLimit(`login:${clientIp(req)}`, { limit: 10, windowMs: 60_000 });

  const body = await req.json().catch(() => null);
  const input = loginSchema.parse(body);

  const user = await authenticateUser(input);
  await createSession(user.id);

  return ok({ user });
});
