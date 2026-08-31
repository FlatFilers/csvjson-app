import { memo, useMemo } from "react";
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
 * Full-bleed, no card chrome. Memoized: App re-renders on every keystroke
 * and tokenizing multi-MB output on each one would freeze typing.
 */
export const OutputView = memo(function OutputView({
  text,
  format,
}: {
  text: string;
  format: "json" | "csv";
}) {
  const className =
    "flex-1 overflow-auto p-3 font-mono text-[12.5px] leading-relaxed whitespace-pre";
  if (format === "json") {
    return <JsonOutput text={text} className={className} />;
  }
  return (
    <pre data-testid="output-view" className={className}>
      {text}
    </pre>
  );
});

/** Past this size highlighting costs more than it shows — render plain. */
const HIGHLIGHT_MAX_CHARS = 256 * 1024;

function JsonOutput({ text, className }: { text: string; className: string }) {
  // The memo keeps re-tokenization off re-renders; the cap keeps huge
  // outputs usable — fully visible, just uncolored.
  const tokens = useMemo(
    () =>
      text.length > HIGHLIGHT_MAX_CHARS
        ? [{ text, kind: "plain" as const }]
        : tokenizeJson(text),
    [text]
  );
  return (
    <pre data-testid="output-view" className={className}>
      {tokens.map((token, index) => (
        <span key={`${token.kind}-${index}`} className={tokenClass(token.kind)}>
          {token.text}
        </span>
      ))}
    </pre>
  );
}
