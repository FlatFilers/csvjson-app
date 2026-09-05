/**
 * Empty-state paste field (spec: States → Empty). Exists only while the
 * input is empty — it is replaced by the data view the moment content
 * arrives. It looks like a text input because it IS one: a real focusable
 * <textarea>, the only surface mobile browsers offer long-press paste to.
 * Typing and a paste's native insertion both land in the field's change
 * event, which feeds the shared ingest path exactly once — the
 * paste-anywhere router and the pane fallback both leave field-internal
 * pastes to it.
 */

import { useEffect, useRef } from "react";
import { pasteShortcutFor } from "@/lib/platform";

type DropzoneProps = {
  format: "CSV" | "JSON";
  onIngest: (value: string) => void;
  onBrowse: () => void;
  onTryExample: () => void;
};

export function Dropzone({
  format,
  onIngest,
  onBrowse,
  onTryExample,
}: DropzoneProps) {
  // Build-time prerender has no navigator — the static HTML ships both
  // shortcuts; the client mount re-renders with the platform's real one.
  const shortcut = pasteShortcutFor(
    typeof navigator === "undefined" ? undefined : navigator
  );
  // The field takes focus while empty so keyboard users and a desktop
  // Ctrl+V land inside it (paste itself works anywhere on the page via the
  // document-level router — spec: paste-anywhere).
  const fieldRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    fieldRef.current?.focus();
  }, []);

  const isCsv = format === "CSV";

  return (
    <div data-testid="dropzone" className="flex flex-1 flex-col gap-2 p-3">
      {/* The empty state's primary surface: an input-styled field, not a
          drop hint. Content arrives via its change event — typing and
          native paste alike — and the data view replaces it at once. */}
      <textarea
        ref={fieldRef}
        data-testid="paste-field"
        aria-label={`Paste ${isCsv ? "CSV or TSV" : "JSON"} data — or press ${shortcut} to paste anywhere on this page`}
        placeholder={isCsv ? "Paste CSV or TSV text here" : "Paste JSON here"}
        spellCheck={false}
        onChange={(event) => onIngest(event.target.value)}
        className="min-h-24 flex-1 resize-none rounded-md border border-border bg-background p-3 font-mono text-[12.5px] leading-relaxed text-foreground transition-colors placeholder:text-muted-foreground focus:outline-none focus-visible:border-sky-600 dark:focus-visible:border-sky-400"
      />
      {/* Kept on the surrounding pane (spec: paste-anywhere affordance):
          the shortcut chip teaches that paste works everywhere on the
          page, not just inside the field. */}
      <div className="flex flex-col items-center gap-1 text-center text-xs text-muted-foreground">
        <p>
          Press{" "}
          <kbd
            data-testid="paste-shortcut"
            className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[11px] font-medium text-foreground"
          >
            {shortcut}
          </kbd>{" "}
          to paste anywhere on this page
        </p>
        <p>
          Drag &amp; drop, or{" "}
          <button
            type="button"
            data-testid="browse"
            onClick={onBrowse}
            className="cursor-pointer text-sky-700 underline underline-offset-4 hover:opacity-80 dark:text-sky-300"
          >
            browse
          </button>
        </p>
        <button
          type="button"
          data-testid="try-example"
          onClick={onTryExample}
          className="cursor-pointer text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
        >
          Try an example
        </button>
      </div>
    </div>
  );
}
