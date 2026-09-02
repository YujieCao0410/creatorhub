import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { env } from "@/lib/env";
import { PLATFORMS } from "@/lib/platforms";

/**
 * AI caption + hashtag generation.
 *
 * Given a video's title and description, Claude searches the web for currently
 * popular, relevant hashtags and writes platform-appropriate captions:
 * one for international platforms (English) and one for Chinese platforms.
 */

export const aiConfigured = Boolean(env.ANTHROPIC_API_KEY);

/**
 * Basic web search tool — supported on every model (including Haiku 4.5), so
 * ANTHROPIC_MODEL can be swapped freely. Newer models also accept the
 * dynamic-filtering variant, but this keeps the config model-agnostic.
 */
const WEB_SEARCH = {
  type: "web_search_20250305",
  name: "web_search",
  max_uses: 5,
} as const;

export type CaptionSuggestion = {
  captionEn: string;
  captionZh: string;
  tags: string[];
  /** Short note on what the model found / did, shown to the creator. */
  note: string;
};

const TAG_RE = /^[\p{L}\p{N}_-]{1,30}$/u;

/** The JSON we ask Claude to return. Kept small and strict. */
const responseSchema = z.object({
  captionEn: z.string().max(2200),
  captionZh: z.string().max(1000),
  tags: z.array(z.string()).max(20),
  note: z.string().max(400).optional().default(""),
});

export type CaptionInput = {
  title: string;
  content: string;
  existingTags: string[];
  captionEn: string;
  captionZh: string;
};

const SYSTEM = `You help an individual video creator cross-post one short video to global and Chinese platforms.

International platforms: ${PLATFORMS.filter((p) => p.locale === "en")
  .map((p) => p.label)
  .join(", ")}.
Chinese platforms: ${PLATFORMS.filter((p) => p.locale === "zh")
  .map((p) => p.label)
  .join(", ")}.

Do this:
1. Use web search to find hashtags that are BOTH currently popular AND genuinely relevant to this specific video's subject. Check what is trending for this niche on TikTok / YouTube Shorts / Instagram Reels and, separately, on 抖音 / 小红书 / 哔哩哔哩.
2. Write "captionEn": a natural caption for international platforms in English (1-3 sentences, a hook first, no hashtag list inside it).
3. Write "captionZh": the same idea rewritten natively in Simplified Chinese for Chinese platforms (not a literal translation).
4. Return "tags": 8-14 hashtags WITHOUT the '#', lowercase, single words or joined words (no spaces), mixing broad-reach and niche. Include a few Chinese-language tags for the Chinese platforms. Order by how much reach you expect them to add.
5. "note": one short line (in Chinese) on what you found, e.g. which tags are trending right now.

Respond with ONLY a JSON object: {"captionEn": string, "captionZh": string, "tags": string[], "note": string}. No markdown, no code fence.`;

function buildUserPrompt(input: CaptionInput): string {
  const lines = [
    `Video title: ${input.title || "(none)"}`,
    input.content ? `Description: ${input.content}` : null,
    input.existingTags.length
      ? `Creator's current tags: ${input.existingTags.join(", ")}`
      : null,
    input.captionEn ? `Creator's draft English caption: ${input.captionEn}` : null,
    input.captionZh ? `Creator's draft Chinese caption: ${input.captionZh}` : null,
  ].filter(Boolean);
  return lines.join("\n");
}

/** Pulls the first balanced JSON object out of a model response. */
export function extractJson(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) {
    throw new Error("No JSON object in model response");
  }
  return JSON.parse(text.slice(start, end + 1));
}

/** Normalizes AI tags to our tag rules (lowercase, strip #, dedupe, cap). */
export function normalizeTags(raw: string[]): string[] {
  const seen = new Set<string>();
  for (const item of raw) {
    const tag = item.trim().toLowerCase().replace(/^#+/, "").replace(/\s+/g, "");
    if (tag && TAG_RE.test(tag)) seen.add(tag);
  }
  return [...seen].slice(0, 15);
}

export async function generateCaptions(
  input: CaptionInput,
): Promise<CaptionSuggestion> {
  if (!aiConfigured) {
    throw new Error("AI is not configured");
  }
  const client = new Anthropic();

  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: buildUserPrompt(input) },
  ];

  let response = await client.messages.create({
    model: env.ANTHROPIC_MODEL,
    max_tokens: 4000,
    system: SYSTEM,
    tools: [WEB_SEARCH],
    messages,
  });

  // Server-side tools may pause the turn; resume until the model is done.
  for (let i = 0; i < 4 && response.stop_reason === "pause_turn"; i++) {
    messages.push({ role: "assistant", content: response.content });
    response = await client.messages.create({
      model: env.ANTHROPIC_MODEL,
      max_tokens: 4000,
      system: SYSTEM,
      tools: [WEB_SEARCH],
      messages,
    });
  }

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();

  const parsed = responseSchema.parse(extractJson(text));
  return {
    captionEn: parsed.captionEn.trim(),
    captionZh: parsed.captionZh.trim(),
    tags: normalizeTags(parsed.tags),
    note: parsed.note.trim(),
  };
}
