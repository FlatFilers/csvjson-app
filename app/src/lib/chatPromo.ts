/**
 * The single surviving promotion: "Chat with this data in…" (spec: One promo).
 *
 * Everything on the chips derives from the ONE configurable constant below.
 * Codex is excluded by default — it has no documented web prefill mechanism
 * for external sites (spec: verified deep links table). Re-adding it is a
 * one-line append to CHAT_PROMO_PROVIDERS.
 */

/**
 * Past this size the data no longer rides inside the prompt — it travels by
 * clipboard instead (spec: ≤ ~8k chars inline).
 */
export const INLINE_PROMPT_MAX_CHARS = 8000;

/**
 * Static prompt templates. The only interpolations are the data payload and
 * the dataset label (a fixed "CSV"/"JSON" from converter state, never user
 * text) — arbitrary text is never injected into the template.
 */
export function buildInlinePrompt(data: string, format: string): string {
  return `Here's my data: ${data}. It's a ${format} dataset. Help me explore and analyze it.`;
}

export function buildPasteNextPrompt(format: string): string {
  return `I'll paste my ${format} data next. Help me explore and analyze it.`;
}

export type ChatProvider = {
  id: string;
  label: string;
  /** Deep link that prefills the provider's composer with the prompt. */
  buildUrl: (prompt: string) => string;
};

/**
 * Obvious has no documented composer prefill from an external site — the
 * product-side handoff is out of the spec's scope. The chip opens the
 * workspace; the data itself arrives via the clipboard flow the control
 * already performs on every click.
 */
export const OBVIOUS_WORKSPACE_URL =
  "https://preview.obvious.ai/?utm_source=csvjson&utm_medium=referral";

export const CHAT_PROMO_PROVIDERS: readonly ChatProvider[] = [
  { id: "obvious", label: "Obvious", buildUrl: () => OBVIOUS_WORKSPACE_URL },
  {
    id: "chatgpt",
    label: "ChatGPT",
    // Best-effort: undocumented, may auto-submit (spec: verified deep links
    // table). The clipboard fallback and static template keep it contained.
    buildUrl: (prompt) => `https://chatgpt.com/?q=${encodeURIComponent(prompt)}`,
  },
  {
    id: "claude",
    label: "Claude",
    // Documented by Anthropic: prefills the composer; the user sends.
    buildUrl: (prompt) => `https://claude.ai/new?q=${encodeURIComponent(prompt)}`,
  },
];

export type ChatHandoff = {
  /** True when the data rode inside the prompt; false when it goes by clipboard. */
  inline: boolean;
  prompt: string;
};

/** Inline vs clipboard branch at the ~8k threshold (spec: chat states). */
export function buildChatHandoff(data: string, format: string): ChatHandoff {
  if (data.length <= INLINE_PROMPT_MAX_CHARS) {
    return { inline: true, prompt: buildInlinePrompt(data, format) };
  }
  return { inline: false, prompt: buildPasteNextPrompt(format) };
}
