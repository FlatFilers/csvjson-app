/**
 * Empty-state affordances (spec: States → Empty). Exists only while the
 * input is empty — it is replaced by the data view the moment content
 * arrives. Three plainly-worded affordances, top to bottom, centered in
 * the pane: the paste field (the hero, a doorway rather than a filled
 * pane), the Choose file button with its drop/paste teaching line, and
 * the example link. The paste field is a real <textarea>, the only
 * surface mobile browsers offer long-press paste to. Typing and a paste's
 * native insertion both land in the field's change event, which feeds the
 * shared ingest path exactly once — the paste-anywhere router and the
 * pane fallback both leave field-internal pastes to it.
 */

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { pasteShortcutFor } from "@/lib/platform";

/** Rows the field grows to as content stacks up — input-height at rest, capped at 3. */
function rowsFor(value: string, max = 3): number {
  return Math.min(max, Math.max(1, value.split("\n").length));
}

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
    <div
      data-testid="dropzone"
      className="flex flex-1 flex-col items-center justify-center gap-4 p-3"
    >
      <div className="flex w-full max-w-sm flex-col items-center gap-3">
        {/* Decorative anchor for the field — subtle, invisible to AT. */}
        <svg
          aria-hidden="true"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          className="text-muted-foreground/60"
        >
          <rect x="8" y="3" width="8" height="4" rx="1" />
          <path d="M16 4h2a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
        </svg>

        {/* The empty state's primary surface: a compact input-styled field,
            not a drop hint and not a filled pane. Content arrives via its
            change event — typing and native paste alike — and the data view
            replaces it at once. rows tracks the content (pure helper above)
            so pasted text stays readable without the field ever becoming
            the pane. */}
        <textarea
          ref={fieldRef}
          data-testid="paste-field"
          rows={1}
          aria-label={`Paste ${isCsv ? "CSV or TSV" : "JSON"} data — or press ${shortcut} to paste anywhere on this page`}
          placeholder={isCsv ? "Paste CSV or TSV text here" : "Paste JSON here"}
          spellCheck={false}
          onChange={(event) => {
            const field = event.currentTarget;
            field.rows = rowsFor(field.value);
            onIngest(field.value);
          }}
          className="min-h-11 w-full resize-none rounded-md border border-border bg-background px-3 py-2.5 font-mono text-[12.5px] leading-relaxed text-foreground transition-colors placeholder:text-muted-foreground focus:outline-none focus-visible:border-sky-600 dark:focus-visible:border-sky-400"
        />

        {/* The file affordance is a real button — a text link taught
            nothing to an unfamiliar user. */}
        <Button
          type="button"
          data-testid="choose-file"
          onClick={onBrowse}
          className="w-full"
        >
          <svg
            aria-hidden="true"
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <path d="M14 2v6h6" />
          </svg>
          Choose file
        </Button>

        {/* One plain sentence teaches the rest: drop works on the whole
            pane, paste works on the whole page. The chip names the real
            modifier key for the platform. */}
        <p className="text-center text-xs leading-relaxed text-muted-foreground">
          or drag &amp; drop a file anywhere in this pane — you can also paste
          anywhere on the page (
          <kbd
            data-testid="paste-shortcut"
            className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[11px] font-medium text-foreground"
          >
            {shortcut}
          </kbd>
          )
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
