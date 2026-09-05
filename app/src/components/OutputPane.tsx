import { CsvTable } from "@/components/CsvTable";
import { JsonCodeMirror } from "@/components/JsonCodeMirror";
import { PaneShell } from "@/components/PaneShell";

/**
 * Output pane (spec: States → Empty/Ready): a quiet placeholder while the
 * input is empty; otherwise the read-only JSON view (CodeMirror, linted) or
 * the dense CSV table. The last valid conversion stays visible through
 * invalid input (spec: Invalid input), labeled while it is stale.
 */

/**
 * Notice copy for malformed-input warnings: the first three warnings, one
 * per line, then an overflow count. Warnings never block or replace the
 * result — they ride the pane's quiet notice status (spec: non-blocking).
 */
const MAX_WARNINGS = 3;

function formatWarnings(warnings: string[]): string {
  const shown = warnings.slice(0, MAX_WARNINGS);
  const overflow = warnings.length - shown.length;
  const lines = overflow > 0 ? [...shown, `+${overflow} more`] : shown;
  return lines.join("\n");
}

type OutputPaneProps = {
  format: "JSON" | "CSV";
  inputEmpty: boolean;
  outputText: string | null;
  error: string | null;
  meta: string | null;
  /** Validity label for the retained result; null while the input is valid. */
  staleNotice: string | null;
  /** Malformed-input warnings (spec: silent reinterpretation) — never blocks. */
  warnings: string[] | null;
  /** The user has edited the JSON output in place (edited-state machine). */
  edited: boolean;
  /**
   * Valid CSV→JSON results — and edited output — render an editable
   * editor; the retained invalid-input result stays read-only.
   */
  editable: boolean;
  dark: boolean;
  onCopy: () => void;
  onDownload: () => void;
  /** Fired for every user modification of the editable output text. */
  onOutputChange?: (value: string) => void;
  /** Restores the derived output (re-runs the conversion, clears edited). */
  onRevert?: () => void;
  /** Discard edits & reconvert — the freeze notice's explicit action. */
  onDiscardReconvert?: () => void;
};

export function OutputPane({
  format,
  inputEmpty,
  outputText,
  error,
  meta,
  staleNotice,
  warnings,
  edited,
  editable,
  dark,
  onCopy,
  onDownload,
  onOutputChange,
  onRevert,
  onDiscardReconvert,
}: OutputPaneProps) {
  const isJson = format === "JSON";
  return (
    <div
      data-testid="output-pane"
      data-surface="output"
      className="flex min-h-0 min-w-0 flex-1 flex-col"
    >
      <PaneShell
        title={format}
        meta={
          inputEmpty ? null : edited ? (
            // Edited state: the badge replaces the (no-longer-true) derived
            // counts; Revert restores the derived output.
            <span className="flex items-center gap-1.5">
              <span
                data-testid="edited-badge"
                role="status"
                aria-label="Output edited"
                className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-amber-700 dark:bg-amber-400/15 dark:text-amber-400"
              >
                Edited
              </span>
              <button
                type="button"
                data-testid="revert-output"
                onClick={onRevert}
                className="cursor-pointer rounded px-1 py-0.5 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
              >
                Revert
              </button>
            </span>
          ) : staleNotice ? (
            // Warning tone, not error red — the output is not broken, it is
            // a deliberate hold (spec: Invalid input → retention).
            <span
              data-testid="stale-notice"
              className="text-xs text-amber-600 dark:text-amber-400"
            >
              {staleNotice}
            </span>
          ) : (
            meta
          )
        }
        actions={
          // Output Copy/Download are the header's most prominent actions
          // (spec: hierarchy) — sentence case, foreground color; the quiet
          // tracked-uppercase treatment stays on input-pane utilities only.
          <>
            <button
              type="button"
              data-testid="copy-output"
              onClick={onCopy}
              disabled={!outputText}
              className="cursor-pointer rounded px-1 py-0.5 text-[11px] text-foreground transition-colors hover:bg-muted disabled:cursor-default disabled:opacity-50"
            >
              Copy
            </button>
            <button
              type="button"
              data-testid="download-output"
              onClick={onDownload}
              disabled={!outputText}
              className="cursor-pointer rounded px-1 py-0.5 text-[11px] text-foreground transition-colors hover:bg-muted disabled:cursor-default disabled:opacity-50"
            >
              Download
            </button>
          </>
        }
        status={
          edited ? (
            // The freeze/guard notice: persistent while edited — it owns the
            // status slot over errors and warnings, which describe the
            // (frozen, invisible) derived conversion rather than the shown
            // text. The action is the only warned path back to regeneration.
            {
              kind: "notice",
              message: "Output edited — CSV and option changes aren't applied.",
              action: onDiscardReconvert ? (
                <button
                  type="button"
                  data-testid="discard-reconvert"
                  onClick={onDiscardReconvert}
                  className="ml-2 cursor-pointer rounded border border-border px-1.5 py-0.5 text-[11px] text-foreground transition-colors hover:bg-muted"
                >
                  Discard edits & reconvert
                </button>
              ) : undefined,
            }
          ) : error
            ? { kind: "error", message: error }
            : warnings && warnings.length > 0
              ? { kind: "notice", message: formatWarnings(warnings) }
              : null
        }
      >
        {inputEmpty ? (
          <div className="flex flex-1 items-center justify-center p-6 text-sm text-muted-foreground">
            Your {format} appears here.
          </div>
        ) : outputText ? (
          isJson ? (
            <JsonCodeMirror
              value={outputText}
              editable={editable}
              onChange={onOutputChange}
              dark={dark}
              testId="output-view"
            />
          ) : (
            <CsvTable text={outputText} testId="output-table" />
          )
        ) : (
          <div className="flex flex-1 items-center justify-center p-6 text-sm text-muted-foreground">
            Resolve the error to see output.
          </div>
        )}
      </PaneShell>
    </div>
  );
}
