import { z } from "zod";

/** Shared keyset-pagination query params (`?cursor=…&limit=…`). */
export const paginationQuerySchema = z.object({
  cursor: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
