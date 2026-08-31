import { useEffect, useRef, useState } from "react";
import { copyText } from "@/lib/clipboard";
import {
  buildChatHandoff,
  CHAT_PROMO_PROVIDERS,
  type ChatProvider,
} from "@/lib/chatPromo";

const DATA_COPIED_TOAST = "Data copied — paste it as your next message.";
const PROMPT_COPIED_TOAST = "Prompt copied — paste if it didn't prefill";
const TOAST_DISMISS_MS = 3000;

type ChatPromoProps = {
  /** Current converter input — inlined into the prompt when small enough. */
  data: string;
  /** Dataset label for the prompt template ("CSV", "JSON", …). */
  format: string;
};

/**
 * "Chat with this data in…" — the single surviving promotion (spec: One promo).
 * Small data inlines into a static prompt; larger data travels by clipboard
 * with a paste-it-next prompt. Every click also copies the prompt to the
 * clipboard as the prefill fallback (toast confirms each copy).
 */
export function ChatPromo({ data, format }: ChatPromoProps) {
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | null>(null);
  const disabled = data.trim() === "";

  useEffect(
    () => () => {
      if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);
    },
    []
  );

  const showToast = (message: string) => {
    if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);
    setToast(message);
    toastTimer.current = window.setTimeout(() => setToast(null), TOAST_DISMISS_MS);
  };

  const openProvider = (provider: ChatProvider) => {
    if (disabled) return;
    const handoff = buildChatHandoff(data, format);
    // Open synchronously inside the click gesture — Safari and strict popup
    // blockers reject window.open after an await, and a blocked tab is silent.
    const copyPromise = copyText(handoff.inline ? handoff.prompt : data);
    const win = window.open(
      provider.buildUrl(handoff.prompt),
      "_blank",
      "noopener,noreferrer"
    );
    void copyPromise.then((copied) => {
      if (copied) {
        showToast(handoff.inline ? PROMPT_COPIED_TOAST : DATA_COPIED_TOAST);
      } else if (!win) {
        showToast("Couldn't copy or open — check your popup blocker");
      }
    });
  };

  return (
    <div data-testid="chat-promo" className="flex items-center gap-1.5">
      <span className="text-xs whitespace-nowrap text-muted-foreground">
        Chat with this data in…
      </span>
      {CHAT_PROMO_PROVIDERS.map((provider) => (
        <span
          key={provider.id}
          title={disabled ? "Add data to the converter first" : undefined}
        >
          <button
            type="button"
            data-testid={`chat-provider-${provider.id}`}
            disabled={disabled}
            onClick={() => openProvider(provider)}
            className="cursor-pointer rounded-md border border-border bg-panel px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50 disabled:pointer-events-none disabled:hover:bg-panel disabled:hover:text-muted-foreground"
          >
            {provider.label}
          </button>
        </span>
      ))}
      {toast && (
        <div
          role="status"
          data-testid="chat-toast"
          className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-md bg-foreground px-3 py-1.5 text-xs text-background shadow-lg"
        >
          {toast}
        </div>
      )}
    </div>
  );
}
