import { prisma } from "@/lib/db";
import { AuthorizationError, NotFoundError } from "@/lib/errors";
import {
  aiConfigured,
  type CaptionSuggestion,
  generateCaptions,
} from "@/lib/ai/captions";

export { aiConfigured } from "@/lib/ai/captions";
export type { CaptionSuggestion } from "@/lib/ai/captions";

/**
 * Generates AI caption + hashtag suggestions for a post. Does NOT save them —
 * the creator reviews and applies them in the editor.
 */
export async function suggestCaptions(
  userId: string,
  slug: string,
): Promise<CaptionSuggestion> {
  if (!aiConfigured) {
    throw new NotFoundError("AI suggestions");
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
    captionEn: post.captionEn,
    captionZh: post.captionZh,
  });
}
