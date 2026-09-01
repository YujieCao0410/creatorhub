import { z } from "zod";

export const searchQuerySchema = z.object({
  q: z
    .string()
    .trim()
    .min(2, "Search needs at least 2 characters")
    .max(100),
  type: z.enum(["all", "creators", "posts"]).default("all"),
});
export type SearchQuery = z.infer<typeof searchQuerySchema>;
