import { prisma } from "@/lib/db";
import { toCaptionMap } from "@/lib/caption";
import { AuthorizationError, NotFoundError, ValidationError } from "@/lib/errors";
import { isLanguageCode } from "@/lib/languages";
import {
  aiConfigured,
  type CaptionSuggestion,
  generateCaptions,
} from "@/lib/ai/captions";

export { aiConfigured } from "@/lib/ai/captions";
export type { CaptionSuggestion } from "@/lib/ai/captions";

/**
 * Generates AI caption + hashtag suggestions for a post in the given languages.
 * Does NOT save them — the creator reviews and applies them in the editor.
 */
export async function suggestCaptions(
  userId: string,
  slug: string,
  languages: string[],
): Promise<CaptionSuggestion> {
  if (!aiConfigured) {
    throw new NotFoundError("AI suggestions");
  }
  const langs = [...new Set(languages)].filter(isLanguageCode).slice(0, 8);
  if (langs.length === 0) {
    throw new ValidationError(undefined, "Pick at least one language.");
  }

  const post = await prisma.post.findUnique({ where: { slug } });
  if (!post) throw new NotFoundError("Post");
  if (post.authorId !== userId) {
    throw new AuthorizationError("You can only edit your own posts");
  }

  return generateCaptions({
    title: post.title,
    content: post.content,
    existingTags: post.tags.split(" ").filter(Boolean),
    captions: toCaptionMap(post.captions),
    languages: langs,
  });
}
