import { PrismaClient } from "@/generated/prisma";

/**
 * A single shared PrismaClient instance.
 *
 * Next.js dev mode reloads modules on every change; without this guard we would
 * open a new database connection pool on each reload and eventually exhaust it.
 * In production the module is evaluated once, so a plain module-level singleton
 * is enough.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
