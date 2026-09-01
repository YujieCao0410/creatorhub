import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Liveness + readiness probe. Returns 200 only if the database is reachable,
 * so a load balancer / platform health check can pull an instance that has
 * lost its database connection.
 */
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return Response.json({ status: "ok", database: "ok" });
  } catch {
    return Response.json(
      { status: "degraded", database: "unreachable" },
      { status: 503 },
    );
  }
}
