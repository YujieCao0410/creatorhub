import { z } from "zod";
import { paginationQuerySchema } from "./common";

const title = z.string().trim().min(1, "Title is required").max(140);
const content = z.string().trim().min(1, "Content is required").max(50_000);
const excerpt = z.string().trim().max(280).nullable().optional();
const coverImageUrl = z.url("Must be a valid URL").max(2048).nullable().optional();

export const createPostSchema = z.object({
  title,
  content,
  excerpt,
  coverImageUrl,
  /** When true the post is published immediately; otherwise saved as a draft. */
  publish: z.boolean().optional().default(false),
});
export type CreatePostInput = z.infer<typeof createPostSchema>;

export const updatePostSchema = z
  .object({
    title: title.optional(),
    content: content.optional(),
    excerpt,
    coverImageUrl,
    published: z.boolean().optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Provide at least one field to update",
  });
export type UpdatePostInput = z.infer<typeof updatePostSchema>;

/** Query string for `GET /api/posts`. */
export const listPostsQuerySchema = paginationQuerySchema.extend({
  authorHandle: z.string().trim().toLowerCase().min(1).optional(),
});
export type ListPostsQuery = z.infer<typeof listPostsQuerySchema>;
