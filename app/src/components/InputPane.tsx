import { useRef, useState, type ClipboardEvent as ReactClipboardEvent, type DragEvent } from "react";
import { CsvTable } from "@/components/CsvTable";
import { Dropzone } from "@/components/Dropzone";
import { JsonCodeMirror } from "@/components/JsonCodeMirror";
import { PaneShell } from "@/components/PaneShell";
import { cn } from "@/lib/utils";

/**
 * Input pane state machine (spec: Every pane state, including empty):
 * Empty → input-styled paste field (a real textarea, so mobile long-press
 * paste works); Ready → dense table (CSV) or CodeMirror editor
 * (JSON); the CSV side carries a raw toggle exposing the source text.
 * Drag-over highlights the whole pane as the drop target; file reading
 * itself is owned by the app (FileReader, no network).
 */

type InputPaneProps = {
  format: "CSV" | "JSON";
  input: string;
  onInputChange: (value: string) => void;
  onFile: (file: File, source: "picker" | "drop") => void;
  onTryExample: () => void;
  onClear: () => void;
  onCopy: () => void;
  onDownload: () => void;
  filename: string | null;
  reading: boolean;
  meta: string | null;
  error: string | null;
  notice: string | null;
  /** Forced separator mirroring the converter's separator option. */
  delimiter?: string;
  dark: boolean;
};

function ReadingSpinner() {
  return (
    <svg
      data-testid="reading-spinner"
      className="animate-spin"
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      aria-label="Reading file"
    >
      <path d="M21 12a9 9 0 1 1-6.2-8.56" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Shared compact action language (v0 port): quiet 28px ghost chip used by
 * every pane action — copy, clear, upload, download, revert, discard.
 */
const actionButtonClass =
  "inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-md px-2 text-[13px] font-medium text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-40 [&_svg]:size-3.5";

function ActionButton({
  label,
  testId,
  onClick,
  disabled,
}: {
  label: string;
  testId: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      disabled={disabled}
      onClick={onClick}
      title={label}
      className={actionButtonClass}
    >
      {label}
    </button>
  );
}

export function InputPane({
  format,
  input,
  onInputChange,
  onFile,
  onTryExample,
  onClear,
  onCopy,
  onDownload,
  filename,
  reading,
  meta,
  error,
  notice,
  dark,
  delimiter,
}: InputPaneProps) {
  const [rawMode, setRawMode] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const dragDepth = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputEmpty = input.trim() === "";
  const isCsv = format === "CSV";

  const onDragEnter = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (!Array.from(event.dataTransfer?.types ?? []).includes("Files")) return;
    dragDepth.current++;
    setDragOver(true);
  };
  const onDragLeave = () => {
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setDragOver(false);
  };
  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    dragDepth.current = 0;
    setDragOver(false);
    const file = event.dataTransfer?.files?.[0];
    if (file) onFile(file, "drop");
  };

  // While the input is empty there is no editor to focus, so paste is caught
  // on the pane (and focused children) and fed into the input. Once content
  // exists the editors handle their own paste. The document-level router
  // (App) already covers non-editable targets here in capture phase and
  // stops propagation — this handler stays as a fallback and skips anything
  // the router already handled (defaultPrevented) to keep ingestion
  // exactly-once. It also skips pastes landing inside a real field — the
  // empty-state paste field is a textarea that owns its caret paste, and
  // its change event feeds the ingest; intercepting here would double-handle
  // it. (While empty, the paste field is the pane's only field-type child.)
  const onPaste = (event: ReactClipboardEvent<HTMLDivElement>) => {
    if (!inputEmpty || event.defaultPrevented) return;
    if (
      event.target instanceof HTMLTextAreaElement ||
      event.target instanceof HTMLInputElement
    ) {
      return;
    }
    const text = event.clipboardData?.getData("text/plain");
    if (text) {
      event.preventDefault();
      onInputChange(text);
    }
  };

  const rawToggle = isCsv ? (
    <span
      data-testid="view-mode"
      role="group"
      aria-label="View mode"
      className="inline-flex items-center gap-0.5 rounded-lg border border-border bg-muted/60 p-0.5"
    >
      <button
        type="button"
        data-testid="view-table"
        aria-pressed={!rawMode}
        onClick={() => setRawMode(false)}
        className={cn(
          "cursor-pointer rounded-[7px] px-2.5 py-1 text-xs font-medium transition-all outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
          rawMode
            ? "text-muted-foreground hover:text-foreground"
            : "bg-background text-foreground shadow-sm"
        )}
      >
        Table
      </button>
      <button
        type="button"
        data-testid="raw-toggle"
        aria-pressed={rawMode}
        onClick={() => setRawMode(true)}
        className={cn(
          "cursor-pointer rounded-[7px] px-2.5 py-1 text-xs font-medium transition-all outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
          rawMode
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        Raw
      </button>
    </span>
  ) : null;

  const headerMeta =
    reading && filename ? (
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <ReadingSpinner /> {filename}
      </span>
    ) : filename ? (
      meta
        ? `${filename} · ${meta}`
        : filename
    ) : (
      meta
    );

  return (
    <div
      data-testid="input-pane"
      onDragEnter={onDragEnter}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onPaste={onPaste}
      data-drag-over={dragOver || undefined}
      className="relative flex min-h-0 min-w-0 flex-1 flex-col"
    >
      <PaneShell
        title={format}
        meta={headerMeta}
        actions={
          <>
            {rawToggle}
            <input
              ref={fileInputRef}
              type="file"
              data-testid="file-input"
              accept={
                isCsv
                  ? ".csv,.tsv,.txt,text/csv,text/tab-separated-values"
                  : ".json,.txt,application/json"
              }
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) onFile(file, "picker");
                event.target.value = "";
              }}
            />
            <ActionButton
              label="Upload"
              testId="upload"
              onClick={() => fileInputRef.current?.click()}
            />
            <ActionButton label="Copy" testId="copy-input" onClick={onCopy} />
            <ActionButton
              label="Clear"
              testId="clear-input"
              onClick={onClear}
              disabled={inputEmpty}
            />
            <ActionButton
              label="Download"
              testId="download-input"
              onClick={onDownload}
              disabled={inputEmpty}
            />
          </>
        }
        status={
          error
            ? { kind: "error", message: error }
            : notice
              ? { kind: "notice", message: notice }
              : null
        }
      >
        {inputEmpty ? (
          <Dropzone
            format={format}
            onIngest={onInputChange}
            onBrowse={() => fileInputRef.current?.click()}
            onTryExample={onTryExample}
          />
        ) : isCsv && rawMode ? (
          <textarea
            data-testid="input-editor"
            value={input}
            onChange={(event) => onInputChange(event.target.value)}
            spellCheck={false}
            className="min-h-0 flex-1 resize-none bg-transparent px-5 py-4 font-mono text-[13px] leading-6 tracking-tight focus:outline-none"
          />
        ) : isCsv ? (
          <CsvTable text={input} delimiter={delimiter} testId="input-table" />
        ) : (
          <JsonCodeMirror
            value={input}
            onChange={onInputChange}
            dark={dark}
            testId="input-editor"
          />
        )}
        {dragOver ? (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-3 z-10 flex items-center justify-center rounded-xl border-2 border-dashed border-primary/50 bg-background/80 backdrop-blur-sm"
          >
            <p className="text-sm font-medium text-foreground">Drop file to import</p>
          </div>
        ) : null}
      </PaneShell>
    </div>
  );
}
