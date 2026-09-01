import { createSession } from "@/lib/auth/session";
import { created, withErrorHandling } from "@/lib/http";
import { registerSchema } from "@/lib/validation/auth";
import { registerUser } from "@/server/services/auth-service";

export const POST = withErrorHandling(async (req: Request) => {
  const body = await req.json().catch(() => null);
  const input = registerSchema.parse(body);

  const user = await registerUser(input);
  await createSession(user.id);

  return created({ user });
});
