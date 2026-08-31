import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ChatPromo } from "./ChatPromo";
import { INLINE_PROMPT_MAX_CHARS } from "@/lib/chatPromo";

const SMALL_DATA = "album,year\nElephant,2003\nDe Stijl,2000";
const PROMPT_COPIED_TOAST = "Prompt copied — paste if it didn't prefill";
const DATA_COPIED_TOAST = "Data copied — paste it as your next message.";

let written: string[] = [];

function stubClipboardWrite(impl: (text: string) => Promise<void>) {
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText: vi.fn(impl) },
    configurable: true,
  });
}

beforeEach(() => {
  written = [];
  stubClipboardWrite(async (text) => {
    written.push(text);
  });
  vi.spyOn(window, "open").mockReturnValue({} as Window);
});

afterEach(() => {
  vi.restoreAllMocks();
  Reflect.deleteProperty(navigator, "clipboard");
});

function chip(id: string) {
  return screen.getByTestId(`chat-provider-${id}`) as HTMLButtonElement;
}

function renderPromo(data: string, format = "CSV") {
  return render(<ChatPromo data={data} format={format} />);
}

/**
 * Clicks a provider chip and waits for the copy outcome: the expected toast,
 * or — when `toast` is null — the window.open that follows a failed copy.
 */
async function clickProviderWithToast(id: string, toast: string | null) {
  // fireEvent, not userEvent: user-event stubs the clipboard itself, which
  // would swallow the component's copy calls and defeat these assertions.
  fireEvent.click(chip(id));
  if (toast) {
    const toastEl = await screen.findByTestId("chat-toast");
    expect(toastEl.textContent).toBe(toast);
  } else {
    await waitFor(() => expect(window.open).toHaveBeenCalled());
    expect(screen.queryByTestId("chat-toast")).toBeNull();
  }
}

describe("disabled-when-empty (spec: chat states)", () => {
  it("disables every chip while the input is empty", () => {
    renderPromo("");
    for (const provider of ["obvious", "chatgpt", "claude"]) {
      expect(chip(provider).disabled).toBe(true);
    }
  });

  it("stays disabled for whitespace-only input", () => {
    renderPromo("   \n  ");
    expect(chip("claude").disabled).toBe(true);
  });

  it("enables chips the moment any non-empty input exists", () => {
    renderPromo("a");
    expect(chip("claude").disabled).toBe(false);
    expect(chip("obvious").disabled).toBe(false);
    expect(chip("chatgpt").disabled).toBe(false);
  });
});

describe("inline handoff (data ≤ ~8k chars)", () => {
  it("opens Claude with the data inlined into the static template", async () => {
    renderPromo(SMALL_DATA, "CSV");
    await clickProviderWithToast("claude", PROMPT_COPIED_TOAST);

    const prompt = `Here's my data: ${SMALL_DATA}. It's a CSV dataset. Help me explore and analyze it.`;
    expect(window.open).toHaveBeenCalledWith(
      `https://claude.ai/new?q=${encodeURIComponent(prompt)}`,
      "_blank",
      "noopener,noreferrer"
    );
    // Clipboard fallback carries the same prompt.
    expect(written).toEqual([prompt]);
  });

  it("copies the full prompt (not bare data) for ChatGPT", async () => {
    renderPromo(SMALL_DATA, "JSON");
    await clickProviderWithToast("chatgpt", PROMPT_COPIED_TOAST);

    const prompt = `Here's my data: ${SMALL_DATA}. It's a JSON dataset. Help me explore and analyze it.`;
    expect(window.open).toHaveBeenCalledWith(
      `https://chatgpt.com/?q=${encodeURIComponent(prompt)}`,
      "_blank",
      "noopener,noreferrer"
    );
    expect(written).toEqual([prompt]);
  });
});

describe("clipboard handoff (data past the ~8k cap)", () => {
  it("copies the raw data to the clipboard and opens with the paste-next prompt", async () => {
    const large = "x".repeat(INLINE_PROMPT_MAX_CHARS + 1);
    renderPromo(large, "CSV");
    await clickProviderWithToast("claude", DATA_COPIED_TOAST);

    expect(window.open).toHaveBeenCalledWith(
      `https://claude.ai/new?q=${encodeURIComponent(
        "I'll paste my CSV data next. Help me explore and analyze it."
      )}`,
      "_blank",
      "noopener,noreferrer"
    );
    // The clipboard holds the data itself, not the prompt.
    expect(written).toEqual([large]);
  });
});

describe("clipboard fallback (spec: browser / platform)", () => {
  it("falls back to execCommand when the Clipboard API rejects", async () => {
    stubClipboardWrite(async () => {
      throw new Error("denied");
    });
    const execCommand = vi.fn(() => true);
    document.execCommand = execCommand as unknown as typeof document.execCommand;

    renderPromo(SMALL_DATA, "CSV");
    await clickProviderWithToast("claude", PROMPT_COPIED_TOAST);

    expect(execCommand).toHaveBeenCalledWith("copy");
    expect(window.open).toHaveBeenCalledTimes(1);
  });

  it("still opens the provider when every copy path fails", async () => {
    stubClipboardWrite(async () => {
      throw new Error("denied");
    });
    document.execCommand = vi.fn(() => false) as unknown as typeof document.execCommand;

    renderPromo(SMALL_DATA, "CSV");
    await clickProviderWithToast("claude", null);
    expect(window.open).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId("chat-toast")).toBeNull();
  });

  it("toasts when the copy fails AND the popup is blocked", async () => {
    stubClipboardWrite(async () => {
      throw new Error("denied");
    });
    document.execCommand = vi.fn(() => false) as unknown as typeof document.execCommand;
    vi.spyOn(window, "open").mockReturnValue(null);

    renderPromo(SMALL_DATA, "CSV");
    await clickProviderWithToast(
      "claude",
      "Couldn't copy or open — check your popup blocker"
    );
    expect(window.open).toHaveBeenCalledTimes(1);
  });
});

describe("toast confirms each copy", () => {
  it("shows the prompt-copied toast on an inline click", async () => {
    renderPromo(SMALL_DATA, "CSV");
    await clickProviderWithToast("claude", PROMPT_COPIED_TOAST);
    expect(screen.getByTestId("chat-toast").textContent).toBe(PROMPT_COPIED_TOAST);
  });

  it("shows the data-copied toast on a clipboard handoff", async () => {
    renderPromo("x".repeat(INLINE_PROMPT_MAX_CHARS + 1), "CSV");
    await clickProviderWithToast("chatgpt", DATA_COPIED_TOAST);
  });
});
