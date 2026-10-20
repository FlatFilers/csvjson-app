import { useMemo, useRef, useState, type ClipboardEvent as ReactClipboardEvent, type DragEvent } from "react";
import { Braces, Copy, Download, FileUp, Redo2, Table, Trash2, Undo2, type LucideIcon } from "lucide-react";
import { CsvTable } from "@/components/CsvTable";
import { Dropzone } from "@/components/Dropzone";
import { JsonCodeMirror } from "@/components/JsonCodeMirror";
import { PaneShell } from "@/components/PaneShell";
import { actionButtonClass } from "@/components/pane-actions";
import {
  type ColumnTypeOverride,
  detectIndexedHeaderGroups,
  detectJsonWrapperCandidates,
  detectNestedJsonKeys,
  resolveJsonFormatToggle,
} from "@/lib/convert";
import { parseCsvTable } from "@/lib/csvTable";
import { extractTablesFromMarkdownBlock } from "@/lib/markdownTable";
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
  onCopySelection?: () => void;
  onDownload: () => void;
  filename: string | null;
  reading: boolean;
  meta: string | null;
  error: string | null;
  notice: string | null;
  /** Forced separator mirroring the converter's separator option. */
  delimiter?: string;
  dark: boolean;
  /** Cell-edit sink for the table view — feeds the guarded reconversion path. */
  onCellCommit?: (nextText: string) => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  onProjectedCsvChange?: (projectedCsv: string | null) => void;
  collapseIndexedArrays?: boolean;
  onToggleCollapseIndexedArrays?: () => void;
  columnTypes?: Record<string, ColumnTypeOverride>;
  onChangeColumnTypes?: (columnTypes: Record<string, ColumnTypeOverride>) => void;
  flatten?: boolean;
  onToggleFlatten?: () => void;
  selectedMarkdownTableIndex?: number;
  onSelectMarkdownTableIndex?: (index: number) => void;
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
  Icon,
  keepLabelOnMobile = false,
}: {
  label: string;
  testId: string;
  onClick: () => void;
  disabled?: boolean;
  /** Decorative v0 icon (aria-hidden) — the label stays the accessible name. */
  Icon?: LucideIcon;
  /** Keep visible text label below xl for contextual mode toggles (Format/Minify). */
  keepLabelOnMobile?: boolean;
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      title={label}
      className={actionButtonClass}
    >
      {Icon ? <Icon aria-hidden="true" /> : null}
      {Icon && !keepLabelOnMobile ? (
        <span className="hidden xl:inline">{label}</span>
      ) : (
        label
      )}
    </button>
  );
}

/**
 * Extract only the first CSV record (plus a tiny sample of subsequent lines so
 * `detectSeparator` has context when `delimiter` is auto) without parsing
 * tens of thousands of rows just to inspect column headers.
 */
function sliceFirstCsvRecord(csv: string): string {
  const maxScan = Math.min(csv.length, 64 * 1024);
  let inQuotes = false;
  let recordsFound = 0;
  for (let i = 0; i < maxScan; i += 1) {
    const ch = csv[i];
    if (ch === '"') {
      if (inQuotes && csv[i + 1] === '"') {
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (!inQuotes && (ch === "\n" || ch === "\r")) {
      if (ch === "\r" && csv[i + 1] === "\n") {
        i += 1;
      }
      recordsFound += 1;
      // Keep up to 3 records so auto-separator detection still sees sample rows.
      if (recordsFound >= 3) {
        return csv.slice(0, i + 1);
      }
    }
  }
  return csv.slice(0, maxScan);
}

function formatNestedKeysSummary(keys: string[]): string {
  const shown = keys
    .slice(0, 3)
    .map((k) => `.${k}`)
    .join(", ");
  const remaining = keys.length - 3;
  return remaining > 0 ? `${shown}, +${remaining} more` : shown;
}

export function InputPane({
  format,
  input,
  onInputChange,
  onFile,
  onTryExample,
  onClear,
  onCopy,
  onCopySelection,
  onDownload,
  filename,
  reading,
  meta,
  error,
  notice,
  dark,
  delimiter,
  onCellCommit,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
  onProjectedCsvChange,
  collapseIndexedArrays = true,
  onToggleCollapseIndexedArrays,
  columnTypes,
  onChangeColumnTypes,
  flatten = false,
  onToggleFlatten,
  selectedMarkdownTableIndex,
  onSelectMarkdownTableIndex,
}: InputPaneProps) {
  const [rawMode, setRawMode] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [localTableSelection, setLocalTableSelection] = useState<{
    forInput: string;
    index: number;
  }>({ forInput: "", index: 0 });
  const dragDepth = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputEmpty = input.trim() === "";
  const isCsv = format === "CSV";
  const extractedMarkdownTables = useMemo(
    () =>
      !isCsv || inputEmpty || delimiter !== undefined
        ? []
        : extractTablesFromMarkdownBlock(input),
    [isCsv, inputEmpty, input, delimiter]
  );
  const requestedTableIndex =
    selectedMarkdownTableIndex !== undefined
      ? selectedMarkdownTableIndex
      : localTableSelection.forInput === input
        ? localTableSelection.index
        : 0;
  const activeMarkdownTableIndex =
    extractedMarkdownTables.length === 0
      ? 0
      : Math.min(
          Math.max(0, requestedTableIndex),
          extractedMarkdownTables.length - 1
        );
  const detectedMarkdownTable =
    extractedMarkdownTables[activeMarkdownTableIndex] ?? null;
  const handleSelectMarkdownTable = (index: number) => {
    setLocalTableSelection({ forInput: input, index });
    onSelectMarkdownTableIndex?.(index);
  };
  const indexedHeaderGroups = useMemo(() => {
    if (!isCsv || inputEmpty) return [];
    const sourceCsv = detectedMarkdownTable
      ? detectedMarkdownTable.cleanedCsv
      : input;
    const headerSlice = sliceFirstCsvRecord(sourceCsv);
    const table = parseCsvTable(headerSlice, delimiter);
    return detectIndexedHeaderGroups(table.headers.map((h) => h.trim()));
  }, [isCsv, inputEmpty, input, delimiter, detectedMarkdownTable]);
  const wrapperCandidates = useMemo(
    () => (isCsv || inputEmpty ? [] : detectJsonWrapperCandidates(input)),
    [isCsv, inputEmpty, input]
  );
  const nestedJsonKeys = useMemo(
    () => (isCsv || inputEmpty ? [] : detectNestedJsonKeys(input)),
    [isCsv, inputEmpty, input]
  );
  const jsonFormatAction = useMemo(
    () => (isCsv || inputEmpty ? null : resolveJsonFormatToggle(input)),
    [isCsv, inputEmpty, input]
  );

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
          "inline-flex cursor-pointer items-center gap-1 rounded-[7px] px-2 py-1 text-xs font-medium transition-all outline-none focus-visible:ring-3 focus-visible:ring-ring/50 lg:px-2.5",
          rawMode
            ? "text-muted-foreground hover:text-foreground"
            : "bg-background text-foreground shadow-sm"
        )}
      >
        <Table aria-hidden="true" className="size-3.5 md:hidden lg:inline" />
        Table
      </button>
      <button
        type="button"
        data-testid="raw-toggle"
        aria-pressed={rawMode}
        onClick={() => setRawMode(true)}
        className={cn(
          "inline-flex cursor-pointer items-center gap-1 rounded-[7px] px-2 py-1 text-xs font-medium transition-all outline-none focus-visible:ring-3 focus-visible:ring-ring/50 lg:px-2.5",
          rawMode
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <Braces aria-hidden="true" className="size-3.5 md:hidden lg:inline" />
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
            {isCsv && (canUndo || canRedo) ? (
              <>
                <button
                  type="button"
                  data-testid="csv-undo-button"
                  aria-label="Undo"
                  title="Undo"
                  disabled={!canUndo}
                  onClick={() => onUndo?.()}
                  className={actionButtonClass}
                >
                  <Undo2 aria-hidden="true" />
                </button>
                <button
                  type="button"
                  data-testid="csv-redo-button"
                  aria-label="Redo"
                  title="Redo"
                  disabled={!canRedo}
                  onClick={() => onRedo?.()}
                  className={actionButtonClass}
                >
                  <Redo2 aria-hidden="true" />
                </button>
              </>
            ) : null}
            {jsonFormatAction ? (
              <ActionButton
                label={jsonFormatAction.label}
                testId="json-format-toggle"
                onClick={() => onInputChange(jsonFormatAction.nextInput)}
                Icon={Braces}
                keepLabelOnMobile
              />
            ) : null}
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
              Icon={FileUp}
            />
            <ActionButton label="Copy" testId="copy-input" onClick={onCopy} Icon={Copy} />
            <ActionButton
              label="Clear"
              testId="clear-input"
              onClick={onClear}
              disabled={inputEmpty}
              Icon={Trash2}
            />
            <ActionButton
              label="Download"
              testId="download-input"
              onClick={onDownload}
              disabled={inputEmpty}
              Icon={Download}
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
        ) : isCsv ? (
          <>
            {detectedMarkdownTable ? (
              <div
                data-testid="csv-markdown-table-bar"
                className="flex flex-shrink-0 flex-wrap items-center justify-between gap-1.5 border-b border-border bg-muted/30 px-3.5 py-1.5"
              >
                {extractedMarkdownTables.length >= 2 ? (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">
                      {`${extractedMarkdownTables.length} tables detected:`}
                    </span>
                    {extractedMarkdownTables.map((candidate) => {
                      const isSelected =
                        candidate.index === activeMarkdownTableIndex;
                      const shortTitle =
                        candidate.title ??
                        candidate.headers.slice(0, 2).join(", ");
                      return (
                        <button
                          key={candidate.index}
                          type="button"
                          data-testid={`csv-markdown-table-select-${candidate.index}`}
                          aria-pressed={isSelected}
                          onClick={() =>
                            handleSelectMarkdownTable(candidate.index)
                          }
                          className={cn(
                            "inline-flex cursor-pointer items-center gap-1 rounded-md border px-2 py-0.5 font-mono text-xs font-medium shadow-2xs transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                            isSelected
                              ? "border-foreground/30 bg-background text-foreground ring-1 ring-foreground/15"
                              : "border-border bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                          )}
                        >
                          {`${candidate.index + 1}. ${shortTitle} (${candidate.rows}×${candidate.cols})`}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    {detectedMarkdownTable.kind === "box"
                      ? "ASCII CLI box table detected:"
                      : "Markdown pipe table detected:"}
                  </span>
                )}
                <button
                  type="button"
                  data-testid="csv-clean-markdown-pill"
                  onClick={() => onInputChange(detectedMarkdownTable.cleanedCsv)}
                  className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-border bg-background px-2 py-0.5 font-mono text-xs font-medium text-foreground shadow-2xs transition-colors hover:bg-muted outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  {extractedMarkdownTables.length >= 2
                    ? `Use only this table (${detectedMarkdownTable.rows} ${detectedMarkdownTable.rows === 1 ? "row" : "rows"})`
                    : detectedMarkdownTable.kind === "box"
                      ? `Clean CLI table (${detectedMarkdownTable.rows} ${detectedMarkdownTable.rows === 1 ? "row" : "rows"})`
                      : `Clean Markdown table (${detectedMarkdownTable.rows} ${detectedMarkdownTable.rows === 1 ? "row" : "rows"})`}
                </button>
              </div>
            ) : null}
            {indexedHeaderGroups.length > 0 ? (
              <div
                data-testid="csv-indexed-array-bar"
                className="flex flex-shrink-0 flex-wrap items-center justify-between gap-1.5 border-b border-border bg-muted/30 px-3.5 py-1.5"
              >
                <span className="text-xs text-muted-foreground">
                  {`Indexed columns (${indexedHeaderGroups.map((g) => `${g.prefix}[${g.indices.length}]`).join(", ")}):`}
                </span>
                <button
                  type="button"
                  data-testid="csv-indexed-array-pill"
                  aria-pressed={collapseIndexedArrays}
                  onClick={() => onToggleCollapseIndexedArrays?.()}
                  className={cn(
                    "inline-flex cursor-pointer items-center gap-1 rounded-md border px-2 py-0.5 font-mono text-xs font-medium shadow-2xs transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                    collapseIndexedArrays
                      ? "border-border bg-background text-foreground hover:bg-muted"
                      : "border-border bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  {collapseIndexedArrays
                    ? "Arrays: .0, .1 → []"
                    : "Keep flat keys (.0, .1)"}
                </button>
              </div>
            ) : null}
            {rawMode ? (
              <textarea
                data-testid="input-editor"
                value={input}
                onChange={(event) => onInputChange(event.target.value)}
                spellCheck={false}
                className="min-h-0 flex-1 resize-none bg-transparent px-5 py-4 font-mono text-[13px] leading-6 tracking-tight focus:outline-none"
              />
            ) : (
              <CsvTable
                text={
                  detectedMarkdownTable
                    ? detectedMarkdownTable.cleanedCsv
                    : input
                }
                delimiter={delimiter}
                testId="input-table"
                dark={dark}
                onCellCommit={onCellCommit}
                onUndo={onUndo}
                onRedo={onRedo}
                onCopySelection={onCopySelection}
                columnTypes={columnTypes}
                onChangeColumnTypes={onChangeColumnTypes}
                onProjectedCsvChange={onProjectedCsvChange}
              />
            )}
          </>
        ) : (
          <>
            {wrapperCandidates.length > 0 ? (
              <div
                data-testid="json-unwrap-bar"
                className="flex flex-shrink-0 flex-wrap items-center gap-1.5 border-b border-border bg-muted/30 px-3.5 py-1.5"
              >
                <span className="text-xs text-muted-foreground">
                  Nested array detected:
                </span>
                {wrapperCandidates.map((candidate) => (
                  <button
                    key={candidate.key}
                    type="button"
                    data-testid={`json-unwrap-pill-${candidate.key}`}
                    onClick={() => onInputChange(candidate.unwrappedJson)}
                    className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-border bg-background px-2 py-0.5 font-mono text-xs font-medium text-foreground shadow-2xs transition-colors outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    {`Unwrap .${candidate.key} (${candidate.rowCount} ${candidate.rowCount === 1 ? "row" : "rows"})`}
                  </button>
                ))}
              </div>
            ) : null}
            {nestedJsonKeys.length > 0 ? (
              <div
                data-testid="json-flatten-bar"
                className="flex flex-shrink-0 flex-wrap items-center justify-between gap-1.5 border-b border-border bg-muted/30 px-3.5 py-1.5"
              >
                <span className="text-xs text-muted-foreground">
                  {`Nested keys (${nestedJsonKeys.length}):`}
                </span>
                <button
                  type="button"
                  data-testid="json-flatten-pill"
                  aria-pressed={flatten}
                  onClick={() => onToggleFlatten?.()}
                  className={cn(
                    "inline-flex cursor-pointer items-center gap-1 rounded-md border px-2 py-0.5 font-mono text-xs font-medium shadow-2xs transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                    flatten
                      ? "border-border bg-background text-foreground hover:bg-muted"
                      : "border-border bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  {`${flatten ? "Flattened" : "Flatten"} nested keys (${formatNestedKeysSummary(nestedJsonKeys)})`}
                </button>
              </div>
            ) : null}
            <JsonCodeMirror
              value={input}
              onChange={onInputChange}
              dark={dark}
              testId="input-editor"
            />
          </>
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
