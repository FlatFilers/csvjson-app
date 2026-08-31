import { describe, expect, it } from "vitest";
import {
  buildChatHandoff,
  buildInlinePrompt,
  buildPasteNextPrompt,
  CHAT_PROMO_PROVIDERS,
  INLINE_PROMPT_MAX_CHARS,
  OBVIOUS_WORKSPACE_URL,
} from "../chatPromo";

const SAMPLE_DATA = "album,year\nElephant,2003\nDe Stijl,2000";

describe("prompt templates (static, spec: One promo)", () => {
  it("interpolates only the data payload and the format label", () => {
    expect(buildInlinePrompt(SAMPLE_DATA, "CSV")).toBe(
      `Here's my data: ${SAMPLE_DATA}. It's a CSV dataset. Help me explore and analyze it.`
    );
    expect(buildInlinePrompt('{"a":1}', "JSON")).toBe(
      `Here's my data: {"a":1}. It's a JSON dataset. Help me explore and analyze it.`
    );
  });

  it("keeps the paste-next prompt free of any data", () => {
    const prompt = buildPasteNextPrompt("JSON");
    expect(prompt).toBe(
      "I'll paste my JSON data next. Help me explore and analyze it."
    );
    expect(prompt).not.toContain("{");
  });
});

describe("inline vs clipboard branch (spec: ~8k threshold)", () => {
  it("inlines data at exactly the cap", () => {
    const data = "x".repeat(INLINE_PROMPT_MAX_CHARS);
    expect(buildChatHandoff(data, "CSV")).toEqual({
      inline: true,
      prompt: buildInlinePrompt(data, "CSV"),
    });
  });

  it("switches to clipboard handoff one char past the cap", () => {
    const data = "x".repeat(INLINE_PROMPT_MAX_CHARS + 1);
    const handoff = buildChatHandoff(data, "CSV");
    expect(handoff).toEqual({
      inline: false,
      prompt: "I'll paste my CSV data next. Help me explore and analyze it.",
    });
    expect(handoff.prompt).not.toContain(data.slice(0, 20));
  });
});

describe("deep-link URL construction (spec: verified deep links table)", () => {
  it("builds the documented Claude prefill link", () => {
    const claude = CHAT_PROMO_PROVIDERS.find((p) => p.id === "claude");
    expect(claude).toBeDefined();
    const url = claude!.buildUrl("Here's my data: a,b. It's a CSV dataset.");
    expect(url).toBe(
      `https://claude.ai/new?q=${encodeURIComponent(
        "Here's my data: a,b. It's a CSV dataset."
      )}`
    );
    expect(url.startsWith("https://claude.ai/new?q=")).toBe(true);
  });

  it("builds the best-effort ChatGPT deep link", () => {
    const chatgpt = CHAT_PROMO_PROVIDERS.find((p) => p.id === "chatgpt");
    expect(chatgpt).toBeDefined();
    const url = chatgpt!.buildUrl("I'll paste my CSV data next.");
    expect(url).toBe(
      `https://chatgpt.com/?q=${encodeURIComponent("I'll paste my CSV data next.")}`
    );
  });

  it("sends Obvious to the workspace with attribution, no prompt in the URL", () => {
    const obvious = CHAT_PROMO_PROVIDERS.find((p) => p.id === "obvious");
    expect(obvious).toBeDefined();
    expect(obvious!.buildUrl("anything at all")).toBe(OBVIOUS_WORKSPACE_URL);
  });
});

describe("provider constant (spec: one configurable constant)", () => {
  it("ships exactly Obvious, ChatGPT, Claude — no Codex by default", () => {
    expect(CHAT_PROMO_PROVIDERS.map((p) => p.id)).toEqual([
      "obvious",
      "chatgpt",
      "claude",
    ]);
  });
});

describe("buildChatHandoff", () => {
  it("exposes the same threshold through the handoff object", () => {
    expect(
      buildChatHandoff("x".repeat(INLINE_PROMPT_MAX_CHARS), "JSON").inline
    ).toBe(true);
    expect(
      buildChatHandoff("x".repeat(INLINE_PROMPT_MAX_CHARS + 1), "JSON").inline
    ).toBe(false);
  });
});
