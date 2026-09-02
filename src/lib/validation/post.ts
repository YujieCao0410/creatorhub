import { z } from "zod";
import { tagArraySchema } from "@/lib/tags";
import { paginationQuerySchema } from "./common";

const title = z.string().trim().min(1, "Title is required").max(140);
const content = z.string().trim().max(50_000).optional().default("");
const excerpt = z.string().trim().max(280).nullable().optional();

/**
 * Per-language platform captions: `{ "<lang>": "<text>" }`. Language keys are
 * short tags (BCP-47-ish); an empty value clears that language.
 */
const captions = z
  .record(
    z.string().regex(/^[a-z]{2,3}(-[A-Za-z]{2,8})?$/, "Invalid language code"),
    z.string().max(5_000),
  )
  .refine((map) => Object.keys(map).length <= 30, "Too many languages")
  .optional();

/** A post must carry *something*: body text, a video, or a cover image. */
function hasBody(data: {
  content?: string;
  videoUrl?: string | null;
  coverImageUrl?: string | null;
}) {
  return Boolean(
    (data.content && data.content.trim()) ||
      data.videoUrl ||
      data.coverImageUrl,
  );
}

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

const tags = tagArraySchema.optional();

export const createPostSchema = z
  .object({
    title,
    content,
    excerpt,
    coverImageUrl: mediaRef,
    videoUrl: mediaRef,
    tags,
    captions,
    shareToCommunity: z.boolean().optional(),
    /** When true the post is published immediately; otherwise a draft. */
    publish: z.boolean().optional().default(false),
  })
  .refine(hasBody, {
    message: "Add some text, a video, or a cover image",
    path: ["content"],
  });
export type CreatePostInput = z.infer<typeof createPostSchema>;

export const updatePostSchema = z
  .object({
    title: title.optional(),
    content: z.string().trim().max(50_000).optional(),
    excerpt,
    coverImageUrl: mediaRef,
    videoUrl: mediaRef,
    tags,
    captions,
    shareToCommunity: z.boolean().optional(),
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
