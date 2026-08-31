/**
 * JSON syntax tokenizer for the read-only output pane. Pure: source string
 * in, flat token list out — no DOM, no HTML injection. The renderer maps
 * kinds to Tailwind color classes, mirroring the mockup's token palette
 * (art_m9v3z0Rv): keys sky, strings green, numbers amber, booleans purple.
 */

export type JsonTokenKind =
  | "key"
  | "string"
  | "number"
  | "boolean"
  | "null"
  | "plain";

export type JsonToken = { text: string; kind: JsonTokenKind };

// Same token grammar as the mockup's highlighter: strings (with optional
// trailing colon → key), booleans, null, and numbers.
const JSON_TOKEN_RE =
  /"(?:\\.|[^"\\])*"(\s*:)?|\b(?:true|false|null)\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g;

export function tokenizeJson(source: string): JsonToken[] {
  const tokens: JsonToken[] = [];
  let last = 0;
  for (const match of source.matchAll(JSON_TOKEN_RE)) {
    const index = match.index ?? 0;
    if (index > last) tokens.push({ text: source.slice(last, index), kind: "plain" });
    const [full, colon] = match;
    if (colon !== undefined) tokens.push({ text: full, kind: "key" });
    else if (full === "true" || full === "false") tokens.push({ text: full, kind: "boolean" });
    else if (full === "null") tokens.push({ text: full, kind: "null" });
    else if (full.startsWith('"')) tokens.push({ text: full, kind: "string" });
    else tokens.push({ text: full, kind: "number" });
    last = index + full.length;
  }
  if (last < source.length) tokens.push({ text: source.slice(last), kind: "plain" });
  return tokens;
}
