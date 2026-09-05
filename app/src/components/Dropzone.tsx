/**
 * Empty-state affordances (spec: States → Empty). Exists only while the
 * input is empty — it is replaced by the data view the moment content
 * arrives. v0's centered treatment: an icon tile over a direction-aware
 * title, the paste field, a teaching hint with the platform's shortcut
 * chip, and a compact action row. The paste field is a real <textarea>,
 * the only surface mobile browsers offer long-press paste to. Typing and
 * a paste's native insertion both land in the field's change event, which
 * feeds the shared ingest path exactly once — the paste-anywhere router
 * and the pane fallback both leave field-internal pastes to it.
 */

import { useEffect, useRef } from "react";
import { Clipboard, FileUp, Sparkles } from "lucide-react";
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
      className="flex flex-1 flex-col items-center justify-center p-3"
    >
      <div className="flex w-full max-w-sm flex-col items-center gap-3">
        {/* v0's decorative anchor tile — subtle, invisible to AT. */}
        <div
          aria-hidden="true"
          className="flex size-11 items-center justify-center rounded-xl border border-border bg-muted/50 text-muted-foreground"
        >
          <Clipboard className="size-5" />
        </div>

        <p className="text-sm font-medium text-foreground">
          Paste {isCsv ? "CSV or TSV" : "JSON"} here
        </p>

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

        {/* One plain sentence teaches the rest: drop works on the whole
            pane, paste works on the whole page. The chip names the real
            modifier key for the platform. */}
        <p className="text-center text-[13px] leading-relaxed text-muted-foreground">
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

        {/* The file affordance is a real button — a text link taught
            nothing to an unfamiliar user. v0's compact pair: bordered
            primary + quiet ghost, sharing one row. */}
        <div className="mt-2 flex items-center gap-2">
          <button
            type="button"
            data-testid="choose-file"
            onClick={onBrowse}
            className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-background px-3 text-[13px] font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 [&_svg]:size-3.5"
          >
            <FileUp aria-hidden="true" />
            Choose file
          </button>

          <button
            type="button"
            data-testid="try-example"
            onClick={onTryExample}
            className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg px-3 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 [&_svg]:size-3.5"
          >
            <Sparkles aria-hidden="true" />
            Try an example
          </button>
        </div>
      </div>
    </div>
  );
}
