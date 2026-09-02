import { z } from "zod";
import { LOCALES } from "@/lib/i18n/config";
import { tagArraySchema } from "@/lib/tags";

/**
 * Profile update. Every field is optional (PATCH semantics) but at least one
 * must be present. `bio` and `avatarUrl` accept `null` to clear them.
 * `.strict()` rejects unknown keys so a client can't try to set `email` etc.
 */
export const updateProfileSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(80).optional(),
    bio: z.string().trim().max(280).nullable().optional(),
    avatarUrl: z.url("Must be a valid URL").max(2048).nullable().optional(),
    locale: z.enum(LOCALES).optional(),
    defaultTags: tagArraySchema.optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Provide at least one field to update",
  });

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
