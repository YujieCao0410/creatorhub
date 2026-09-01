import { createSession } from "@/lib/auth/session";
import { created, readJsonBody, withErrorHandling } from "@/lib/http";
import { enforceRateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request";
import { registerSchema } from "@/lib/validation/auth";
import { registerUser } from "@/server/services/auth-service";

export const POST = withErrorHandling(async (req: Request) => {
  enforceRateLimit(`register:${clientIp(req)}`, { limit: 5, windowMs: 60_000 });

  const body = await readJsonBody(req);
  const input = registerSchema.parse(body);

  const user = await registerUser(input);
  await createSession(user.id);

  return created({ user });
});
