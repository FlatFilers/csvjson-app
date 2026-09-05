import { CsvTable } from "@/components/CsvTable";
import { JsonCodeMirror } from "@/components/JsonCodeMirror";
import { PaneShell } from "@/components/PaneShell";

/**
 * Output pane (spec: States → Empty/Ready): a quiet placeholder while the
 * input is empty; otherwise the read-only JSON view (CodeMirror, linted) or
 * the dense CSV table. The last valid conversion stays visible through
 * invalid input (spec: Invalid input), labeled while it is stale.
 */

type OutputPaneProps = {
  format: "JSON" | "CSV";
  inputEmpty: boolean;
  outputText: string | null;
  error: string | null;
  meta: string | null;
  /** Validity label for the retained result; null while the input is valid. */
  staleNotice: string | null;
  dark: boolean;
  onCopy: () => void;
  onDownload: () => void;
};

export function OutputPane({
  format,
  inputEmpty,
  outputText,
  error,
  meta,
  staleNotice,
  dark,
  onCopy,
  onDownload,
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
          inputEmpty ? null : staleNotice ? (
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
          <>
            <button
              type="button"
              data-testid="copy-output"
              onClick={onCopy}
              disabled={!outputText}
              className="cursor-pointer rounded px-1 py-0.5 text-[11px] uppercase tracking-[0.08em] text-muted-foreground transition-colors hover:text-foreground disabled:cursor-default disabled:opacity-50"
            >
              Copy
            </button>
            <button
              type="button"
              data-testid="download-output"
              onClick={onDownload}
              disabled={!outputText}
              className="cursor-pointer rounded px-1 py-0.5 text-[11px] uppercase tracking-[0.08em] text-muted-foreground transition-colors hover:text-foreground disabled:cursor-default disabled:opacity-50"
            >
              Download
            </button>
          </>
        }
        status={error ? { kind: "error", message: error } : null}
      >
        {inputEmpty ? (
          <div className="flex flex-1 items-center justify-center p-6 text-sm text-muted-foreground">
            Your {format} appears here.
          </div>
        ) : outputText ? (
          isJson ? (
            <JsonCodeMirror
              value={outputText}
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
