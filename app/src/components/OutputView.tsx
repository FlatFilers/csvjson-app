import type { JsonToken } from "@/lib/highlight";
import { tokenizeJson } from "@/lib/highlight";

function tokenClass(kind: JsonToken["kind"]): string | undefined {
  if (kind === "key") return "text-sky-700 dark:text-sky-300";
  if (kind === "string") return "text-green-700 dark:text-green-300";
  if (kind === "number") return "text-amber-700 dark:text-amber-300";
  if (kind === "boolean") return "text-purple-700 dark:text-purple-300";
  if (kind === "null") return "text-muted-foreground";
  return undefined;
}

/**
 * Read-only output view. JSON renders pretty-printed with syntax coloring
 * (mockup token palette); CSV renders as plain preformatted text.
 * Full-bleed, no card chrome.
 */
export function OutputView({ text, format }: { text: string; format: "json" | "csv" }) {
  const className =
    "flex-1 overflow-auto p-3 font-mono text-[12.5px] leading-relaxed whitespace-pre";
  if (format === "json") {
    return (
      <pre data-testid="output-view" className={className}>
        {tokenizeJson(text).map((token, index) => (
          <span key={`${token.kind}-${index}`} className={tokenClass(token.kind)}>
            {token.text}
          </span>
        ))}
      </pre>
    );
  }
  return (
    <pre data-testid="output-view" className={className}>
      {text}
    </pre>
  );
}
