import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep Prisma's engine out of the server bundle; it's loaded at runtime.
  serverExternalPackages: ["@prisma/client", "prisma"],
};

export default nextConfig;
