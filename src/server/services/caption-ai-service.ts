import { toCaptionMap } from "@/lib/caption";
import { prisma } from "@/lib/db";
import {
  AuthorizationError,
  NotFoundError,
  PaymentRequiredError,
  ValidationError,
} from "@/lib/errors";
import { isLanguageCode } from "@/lib/languages";
import { currentMonthKey, FREE_AI_MONTHLY, toMembership } from "@/lib/membership";
import {
  aiConfigured,
  type CaptionSuggestion,
  generateCaptions,
} from "@/lib/ai/captions";

export { aiConfigured } from "@/lib/ai/captions";
export type { CaptionSuggestion } from "@/lib/ai/captions";

/**
 * Generates AI caption + hashtag suggestions for a post in the given languages.
 * FREE accounts get {@link FREE_AI_MONTHLY} runs per month; PRO is unlimited.
 * Does NOT save the captions — the creator applies them in the editor.
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

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError("User");

  const post = await prisma.post.findUnique({ where: { slug } });
  if (!post) throw new NotFoundError("Post");
  if (post.authorId !== userId) {
    throw new AuthorizationError("You can only edit your own posts");
  }

  const month = currentMonthKey();
  const usedThisMonth = user.aiUsedMonth === month ? user.aiUsedCount : 0;
  const isPro = toMembership(user.membership) === "PRO";
  if (!isPro && usedThisMonth >= FREE_AI_MONTHLY) {
    throw new PaymentRequiredError(
      `You've used your ${FREE_AI_MONTHLY} free AI generations this month. Upgrade to Pro for unlimited.`,
    );
  }

  const suggestion = await generateCaptions({
    title: post.title,
    content: post.content,
    existingTags: post.tags.split(" ").filter(Boolean),
    captions: toCaptionMap(post.captions),
    languages: langs,
  });

  await prisma.user.update({
    where: { id: userId },
    data: { aiUsedMonth: month, aiUsedCount: usedThisMonth + 1 },
  });

  return suggestion;
}
