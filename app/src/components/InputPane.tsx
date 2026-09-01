import { useRef, useState, type ClipboardEvent as ReactClipboardEvent, type DragEvent } from "react";
import { CsvTable } from "@/components/CsvTable";
import { Dropzone } from "@/components/Dropzone";
import { JsonCodeMirror } from "@/components/JsonCodeMirror";
import { PaneShell } from "@/components/PaneShell";

/**
 * Input pane state machine (spec: Every pane state, including empty):
 * Empty → dashed dropzone; Ready → dense table (CSV) or CodeMirror editor
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
      className="cursor-pointer rounded px-1 py-0.5 text-[11px] uppercase tracking-[0.08em] text-muted-foreground transition-colors hover:text-foreground disabled:cursor-default disabled:opacity-50"
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
  // exists the editors handle their own paste.
  const onPaste = (event: ReactClipboardEvent<HTMLDivElement>) => {
    if (!inputEmpty) return;
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
      className="flex overflow-hidden rounded border border-border text-[10px]"
    >
      <button
        type="button"
        data-testid="view-table"
        aria-pressed={!rawMode}
        onClick={() => setRawMode(false)}
        className={
          "cursor-pointer px-2 py-0.5 " +
          (!rawMode
            ? "bg-muted font-semibold text-foreground"
            : "text-muted-foreground hover:text-foreground")
        }
      >
        Table
      </button>
      <button
        type="button"
        data-testid="raw-toggle"
        aria-pressed={rawMode}
        onClick={() => setRawMode(true)}
        className={
          "cursor-pointer px-2 py-0.5 " +
          (rawMode
            ? "bg-muted font-semibold text-foreground"
            : "text-muted-foreground hover:text-foreground")
        }
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
      className={
        "flex min-h-0 min-w-0 flex-1 flex-col outline outline-2 -outline-offset-2 transition-[outline-color] " +
        (dragOver ? "outline-sky-500 dark:outline-sky-400" : "outline-transparent")
      }
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
            onBrowse={() => fileInputRef.current?.click()}
            onTryExample={onTryExample}
          />
        ) : isCsv && rawMode ? (
          <textarea
            data-testid="input-editor"
            value={input}
            onChange={(event) => onInputChange(event.target.value)}
            spellCheck={false}
            className="min-h-0 flex-1 resize-none bg-transparent p-3 font-mono text-[12.5px] leading-relaxed focus:outline-none"
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
      </PaneShell>
    </div>
  );
}
