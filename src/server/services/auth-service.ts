import { Prisma } from "@/generated/prisma";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/db";
import { AuthenticationError, ConflictError } from "@/lib/errors";
import type { LoginInput, RegisterInput } from "@/lib/validation/auth";
import { toSelfUser, type SelfUser } from "./user-service";

/**
 * A stable bcrypt hash, computed once, compared against when the email is
 * unknown so that "wrong password" and "no such user" take about the same
 * time and don't leak which emails are registered.
 */
let dummyHash: Promise<string> | null = null;
function getDummyHash(): Promise<string> {
  dummyHash ??= hashPassword("not-a-real-password");
  return dummyHash;
}

export async function registerUser(
  input: RegisterInput,
  locale = "",
): Promise<SelfUser> {
  const clash = await prisma.user.findFirst({
    where: { OR: [{ email: input.email }, { handle: input.handle }] },
    select: { email: true, handle: true },
  });
  if (clash?.email === input.email) {
    throw new ConflictError("That email is already registered");
  }
  if (clash?.handle === input.handle) {
    throw new ConflictError("That handle is already taken");
  }

  const passwordHash = await hashPassword(input.password);

  try {
    const user = await prisma.user.create({
      data: {
        email: input.email,
        handle: input.handle,
        name: input.name,
        passwordHash,
        locale,
      },
    });
    return toSelfUser(user);
  } catch (error) {
    // Lost a race against a concurrent signup with the same email/handle.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new ConflictError("That email or handle is already taken");
    }
    throw error;
  }
}

export async function authenticateUser(input: LoginInput): Promise<SelfUser> {
  const user = await prisma.user.findUnique({ where: { email: input.email } });

  const passwordMatches = await verifyPassword(
    input.password,
    user?.passwordHash ?? (await getDummyHash()),
  );

  if (!user || !passwordMatches) {
    throw new AuthenticationError("Invalid email or password");
  }
  return toSelfUser(user);
}
