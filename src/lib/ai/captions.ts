import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { env } from "@/lib/env";
import { getLanguage } from "@/lib/languages";

/**
 * AI caption + hashtag generation.
 *
 * Given a video's title and description and a set of target languages, Claude
 * searches the web for currently popular, relevant hashtags and writes a native
 * caption in each language (not a literal translation).
 */

export const aiConfigured = Boolean(env.ANTHROPIC_API_KEY);

/**
 * Basic web search tool — supported on every model (including Haiku 4.5), so
 * ANTHROPIC_MODEL can be swapped freely.
 */
const WEB_SEARCH = {
  type: "web_search_20250305",
  name: "web_search",
  max_uses: 5,
} as const;

export type CaptionSuggestion = {
  captions: Record<string, string>;
  tags: string[];
  /** Short note (in Chinese) on what the model found. */
  note: string;
};

const TAG_RE = /^[\p{L}\p{N}_-]{1,30}$/u;

const responseSchema = z.object({
  captions: z.record(z.string(), z.string()),
  tags: z.array(z.string()).max(20),
  note: z.string().max(400).optional().default(""),
});

export type CaptionInput = {
  title: string;
  content: string;
  existingTags: string[];
  captions: Record<string, string>;
  languages: string[];
};

function languageList(codes: string[]): string {
  return codes
    .map((c) => {
      const lang = getLanguage(c);
      return lang ? `${c} (${lang.english})` : c;
    })
    .join(", ");
}

function buildSystem(languages: string[]): string {
  return `You help an individual video creator cross-post one short video to platforms worldwide (YouTube, TikTok, Instagram, X, and the Chinese platforms 抖音 / 小红书 / 哔哩哔哩).

Do this:
1. Use web search to find hashtags that are BOTH currently popular AND genuinely relevant to this specific video's subject. Look at what is trending for this niche on short-video platforms right now.
2. Write a caption for EACH of these languages, keyed by its code: ${languageList(languages)}. Each caption must be written natively in that language (a hook first, 1-3 sentences, NOT a literal translation of the others, NO hashtag list inside it).
3. Return "tags": 8-14 hashtags WITHOUT the '#', lowercase, no spaces (join words), mixing broad-reach and niche, ordered by expected reach. Include tags in the scripts of the requested languages where it helps.
4. "note": one short line in Chinese on what you found (e.g. which tags are trending).

Respond with ONLY this JSON, no markdown/code fence:
{"captions": {"<langCode>": "<caption>", ...}, "tags": ["tag1", ...], "note": "..."}`;
}

function buildUserPrompt(input: CaptionInput): string {
  const drafts = Object.entries(input.captions)
    .map(([code, text]) => `  - ${code}: ${text}`)
    .join("\n");
  return [
    `Video title: ${input.title || "(none)"}`,
    input.content ? `Description: ${input.content}` : null,
    input.existingTags.length
      ? `Creator's current tags: ${input.existingTags.join(", ")}`
      : null,
    drafts ? `Creator's existing captions:\n${drafts}` : null,
  ]
    .filter(Boolean)
    .join("\n");
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
  if (!aiConfigured) throw new Error("AI is not configured");
  if (input.languages.length === 0) throw new Error("No languages requested");

  const client = new Anthropic();
  const system = buildSystem(input.languages);
  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: buildUserPrompt(input) },
  ];

  let response = await client.messages.create({
    model: env.ANTHROPIC_MODEL,
    max_tokens: 4000,
    system,
    tools: [WEB_SEARCH],
    messages,
  });

  // Server-side tools may pause the turn; resume until the model is done.
  for (let i = 0; i < 4 && response.stop_reason === "pause_turn"; i++) {
    messages.push({ role: "assistant", content: response.content });
    response = await client.messages.create({
      model: env.ANTHROPIC_MODEL,
      max_tokens: 4000,
      system,
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
  const captions: Record<string, string> = {};
  for (const code of input.languages) {
    const value = parsed.captions[code]?.trim();
    if (value) captions[code] = value;
  }

  return { captions, tags: normalizeTags(parsed.tags), note: parsed.note.trim() };
}
