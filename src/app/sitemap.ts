import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = env.APP_URL;

  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${base}/`, priority: 1 },
    { url: `${base}/feed`, priority: 0.8 },
    { url: `${base}/pricing`, priority: 0.5 },
  ];

  const [posts, creators] = await Promise.all([
    prisma.post.findMany({
      where: { published: true },
      select: { slug: true, updatedAt: true },
      orderBy: { publishedAt: "desc" },
      take: 5000,
    }),
    prisma.user.findMany({
      select: { handle: true, updatedAt: true },
      take: 5000,
    }),
  ]);

  return [
    ...staticEntries,
    ...posts.map((p) => ({
      url: `${base}/posts/${p.slug}`,
      lastModified: p.updatedAt,
      priority: 0.7,
    })),
    ...creators.map((c) => ({
      url: `${base}/creators/${c.handle}`,
      lastModified: c.updatedAt,
      priority: 0.6,
    })),
  ];
}
