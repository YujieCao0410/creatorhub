import { z } from "zod";
import { paginationQuerySchema } from "./common";

const title = z.string().trim().min(1, "Title is required").max(140);
const content = z.string().trim().min(1, "Content is required").max(50_000);
const excerpt = z.string().trim().max(280).nullable().optional();

/** An absolute http(s) URL or a local `/uploads/...` path. */
const mediaRef = z
  .string()
  .max(2048)
  .refine(
    (v) =>
      /^https?:\/\//.test(v) || /^\/uploads\/[A-Za-z0-9._-]+$/.test(v),
    "Must be a URL or an uploaded file",
  )
  .nullable()
  .optional();

/** Up to 10 tags; letters (any script), digits, `_` and `-`, 1–30 chars each. */
const tags = z
  .array(
    z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^[\p{L}\p{N}_-]{1,30}$/u, "Tags can only contain letters, numbers, - and _"),
  )
  .max(10, "At most 10 tags")
  .optional();

export const createPostSchema = z.object({
  title,
  content,
  excerpt,
  coverImageUrl: mediaRef,
  videoUrl: mediaRef,
  tags,
  /** When true the post is published immediately; otherwise saved as a draft. */
  publish: z.boolean().optional().default(false),
});
export type CreatePostInput = z.infer<typeof createPostSchema>;

export const updatePostSchema = z
  .object({
    title: title.optional(),
    content: content.optional(),
    excerpt,
    coverImageUrl: mediaRef,
    videoUrl: mediaRef,
    tags,
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
