/**
 * Fills in missing `src/messages/<locale>.json` files by translating
 * `en.json` with Claude.
 *
 * Usage:
 *   ANTHROPIC_API_KEY=sk-ant-... node scripts/translate-messages.mjs
 *   ... node scripts/translate-messages.mjs de fr        # only these
 *   ... node scripts/translate-messages.mjs --force ja   # retranslate
 *
 * The list of target locales and their English names comes from
 * src/lib/languages.ts (LANGUAGES). Existing files are skipped unless --force.
 */
import Anthropic from "@anthropic-ai/sdk";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, "..");
const msgDir = path.join(root, "src", "messages");

// Parse LANGUAGES out of the TS source without importing TS.
const langSrc = readFileSync(path.join(root, "src/lib/languages.ts"), "utf8");
const LANGUAGES = [...langSrc.matchAll(/{ code: "([^"]+)", endonym: "[^"]*", english: "([^"]+)" }/g)].map(
  (m) => ({ code: m[1], english: m[2] }),
);

const args = process.argv.slice(2);
const force = args.includes("--force");
const only = args.filter((a) => !a.startsWith("--"));

const en = JSON.parse(readFileSync(path.join(msgDir, "en.json"), "utf8"));

const client = new Anthropic();
const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-5";

async function translate(english) {
  const system = `You are a professional localizer for a SaaS product for video creators. Translate the given JSON of UI strings into ${english}.

Rules:
- Keep the JSON structure and every key EXACTLY the same.
- Translate only the string values.
- Keep placeholders like {name}, {count}, {limit}, {price}, {n}, {date}, {query} untouched.
- Keep "CreatorHub", "YouTube", "TikTok", "Pro", "Stripe", "AI" as-is.
- Keep emoji (✨, ↗) as-is.
- Use natural, idiomatic ${english} that a native speaker would expect in an app UI. Be concise.
- Output ONLY the JSON, no markdown fence, no commentary.`;

  let res = await client.messages.create({
    model: MODEL,
    max_tokens: 8000,
    system,
    messages: [{ role: "user", content: JSON.stringify(en, null, 2) }],
  });
  const text = res.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n");
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  return JSON.parse(text.slice(start, end + 1));
}

for (const { code, english } of LANGUAGES) {
  if (code === "en") continue;
  if (only.length && !only.includes(code)) continue;
  const file = path.join(msgDir, `${code}.json`);
  if (existsSync(file) && !force) {
    console.log(`skip  ${code} (exists)`);
    continue;
  }
  process.stdout.write(`translating ${code} (${english})… `);
  try {
    const out = await translate(english);
    writeFileSync(file, JSON.stringify(out, null, 2) + "\n");
    console.log("done");
  } catch (err) {
    console.log("FAILED:", err.message);
  }
}
