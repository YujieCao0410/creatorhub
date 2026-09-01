import bcrypt from "bcryptjs";

/**
 * Password hashing. bcrypt is deliberately slow and salts each hash, so a
 * leaked database does not expose the plaintext passwords.
 */

const SALT_ROUNDS = 12;

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export function verifyPassword(
  plain: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
