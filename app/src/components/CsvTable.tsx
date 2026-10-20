import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DataEditorCore,
  AllCellRenderers,
  GridCellKind,
  CompactSelection,
  getMiddleCenterBias,
  type DrawCellCallback,
  type DrawHeaderCallback,
  type EditableGridCell,
  type GridCell,
  type GridColumn,
  type GridSelection,
  type Item,
  type Rectangle,
  type Theme,
  ImageWindowLoaderImpl,
} from "@glideapps/glide-data-grid";
import "@glideapps/glide-data-grid/dist/index.css";
import { Columns3, Copy, Search, Trash2, X } from "lucide-react";
import { type ColumnTypeOverride } from "@/lib/convert";
import { numericColumns, parseCsvRecord, parseCsvTable, serializeCsvRow, type CsvTableData } from "@/lib/csvTable";
import { detectMarkdownOrCliTable } from "@/lib/markdownTable";
import { deleteColumns, deleteRows, renameHeader } from "@/lib/tableDeletion";
import { matchHistoryShortcut } from "@/lib/csvHistory";
import { filterRowIndices, projectCsvView, sortRowIndices, type SortDir } from "@/lib/tableView";
import {
  computeSelectionStats,
  serializeGridSelection,
  type SelectionShape,
  type SelectionStats,
} from "@/lib/tableSelection";
import { cn } from "@/lib/utils";

/**
 * Dense full-bleed CSV/TSV table (spec: CSV pane — sticky header, compact
 * rows, monospace numerics; criterion 5 — ~10k+ rows render virtualized
 * without frame freeze). Full-bleed inside its pane: no card chrome.
 *
 * v0 look, preserved through the canvas renderer: mono uppercase muted
 * headers, a right-aligned source-row-number gutter, hairline row rules
 * with a hover wash, and em-dashes for empty cells. Density values are the
 * merge gate — keep them byte-identical to the hand-rolled table they
 * replace (24px rows, 26px header, 8px cell padding, 12px cell text,
 * 11px header text).
 *
 * The grid renders through @glideapps/glide-data-grid (canvas). Glide owns
 * virtualization, drag/keyboard range selection, cell editors, the fill
 * handle, paste splitting, and column resizing. Ours stays everything the
 * canvas can't take from the raw text: the search toolbar, the numeric-
 * aware sort (BigInt-safe), RFC 4180 copy serialization, the guarded
 * reconversion path — every cell edit splices the edited row's exact bytes
 * and hands the result to onCellCommit, so the raw CSV is the single
 * source of truth — and, on the input table only, row/column deletion
 * (toolbar buttons and the keyboard Delete path via Glide's onDelete),
 * which mutates the parsed table and reconverts through the same guard.
 * The output pane renders this same component with no onCellCommit:
 * strictly read-only, no editor, no editing or deletion affordances.
 */

const ROW_HEIGHT = 24;
const HEADER_HEIGHT = 26;
/** Minimum width per data column; narrower viewports scroll horizontally. */
const COLUMN_MIN_WIDTH = 110;
/** Width of the leading row-number gutter column. */
const GUTTER_WIDTH = 40;

/** Mobile panes can squeeze the grid below its natural height; the wrapper floors at this many rows. */
const MAX_VISIBLE_ROWS = 12;
/** The gutter is grid column 0; data columns start after it. */
const GUTTER_COLUMNS = 1;

/** Same stacks the app's font-mono / sans utilities resolve to. */
const MONO_FONT = 'ui-monospace, "SF Mono", SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace';
const SANS_FONT = 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

type CsvTableProps = {
  text: string;
  /** Forced separator (, ; \t |) mirroring the converter's separator option; omitted → auto-detect. */
  delimiter?: string;
  testId?: string;
  /** Theme state from the pane — the canvas palette has no CSS variables to lean on. */
  dark?: boolean;
  /**
   * Cell-edit sink (input table only — see InputPane). A commit splices the
   * edited row's exact byte span out of the source text and hands the whole
   * new text to this callback, which feeds the same guarded reconversion
   * path as any keystroke in the raw view. Omit for read-only grids.
   */
  onCellCommit?: (nextText: string) => void;
  /** Undo/redo handlers invoked on Mod+Z and Mod+Shift+Z / Mod+Y inside the grid. */
  onUndo?: () => void;
  onRedo?: () => void;
  /** Fired when non-empty selection is copied via the toolbar chip or Cmd/Ctrl+C. */
  onCopySelection?: () => void;
  /** Per-column type overrides (AC-16 / D15) keyed by header name. */
  columnTypes?: Record<string, ColumnTypeOverride>;
  /** Updates per-column type overrides (input table only). */
  onChangeColumnTypes?: (columnTypes: Record<string, ColumnTypeOverride>) => void;
  /**
   * Emits the projected CSV string when "Apply view to output" is active and
   * at least one view transform (search filter, sort, or column subset) is
   * active; emits `null` when toggled off or when all rows/columns are in
   * natural source order.
   */
  onProjectedCsvChange?: (projectedCsv: string | null) => void;
};

const COLUMN_TYPE_OPTIONS: readonly {
  mode: ColumnTypeOverride;
  label: string;
}[] = [
  { mode: "auto", label: "Auto" },
  { mode: "string", label: "String" },
  { mode: "number", label: "Number" },
  { mode: "boolean", label: "Boolean" },
];

function columnTypeBadge(
  mode: ColumnTypeOverride | undefined
): "STR" | "NUM" | "BOOL" | null {
  if (mode === "string") return "STR";
  if (mode === "number") return "NUM";
  if (mode === "boolean") return "BOOL";
  return null;
}

function isTextEntryElement(node: EventTarget | Element | null): boolean {
  if (!(node instanceof HTMLElement)) return false;
  const tag = node.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || node.isContentEditable;
}

type SortState = { col: number; dir: SortDir } | null;

type HeaderClickEvent = {
  isDoubleClick?: boolean;
  bounds?: Rectangle;
};

type EditingHeaderState = {
  col: number;
  bounds: Rectangle;
};

type GutterClickEvent = { shiftKey?: boolean; metaKey?: boolean; ctrlKey?: boolean };

/** Toolbar button classes — dense chrome matching the header strip. */
const TOOLBAR_BUTTON =
  "inline-flex cursor-pointer items-center gap-1 rounded-md border border-border bg-background px-1.5 py-0.5 text-[11px] font-medium text-foreground hover:bg-muted outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

const STAT_NUMBER_FORMATTER = new Intl.NumberFormat("en-US", { maximumFractionDigits: 4 });

function formatStatNumber(value: number): string {
  return STAT_NUMBER_FORMATTER.format(Object.is(value, -0) ? 0 : value);
}

function formatSelectionStatsLabel(stats: SelectionStats): string {
  const parts = [
    `Cells: ${STAT_NUMBER_FORMATTER.format(stats.cellCount)}`,
    `Distinct: ${STAT_NUMBER_FORMATTER.format(stats.distinctCount)}`,
  ];
  if (stats.emptyCount > 0) {
    parts.push(`Empty: ${STAT_NUMBER_FORMATTER.format(stats.emptyCount)}`);
  }
  if (
    stats.numericCount > 0 &&
    stats.sum !== null &&
    stats.avg !== null &&
    stats.min !== null &&
    stats.max !== null
  ) {
    parts.push(
      `Sum: ${formatStatNumber(stats.sum)}`,
      `Avg: ${formatStatNumber(stats.avg)}`,
      `Min: ${formatStatNumber(stats.min)}`,
      `Max: ${formatStatNumber(stats.max)}`
    );
  }
  return parts.join(" · ");
}

/** Canvas has no CSS variables — resolve the palette per theme explicitly.
 *
 * Selected-header contract (contrast fix, 2026-09-08): Glide pre-fills a
 * selected column header with `accentColor` before the drawHeader callback
 * runs, and paints the title text in `textHeaderSelected`. Those two must
 * therefore CONTRAST — but both were mapped to the theme's inverted ink
 * (dark: near-white; light: near-black), so a selected header rendered as
 * a solid inverted block with invisible same-on-same text. The fix is the
 * wash treatment in drawHeader: an opaque `bgHeaderHovered` fill painted
 * over the accentColor block plus an `accentColor` bottom border, which
 * makes the existing textHeaderSelected values (kept as-is) genuinely
 * contrasting in both themes. accentColor itself stays untouched — cell
 * ranges, row markers, and the fill handle still use it.
 */
function buildTheme(dark: boolean): Partial<Theme> {
  if (dark) {
    return {
      accentColor: "hsl(0 0% 98%)",
      accentFg: "hsl(240 10% 3.9%)",
      accentLight: "hsla(240, 4.9%, 70%, 0.18)",
      textDark: "hsl(0 0% 98%)",
      textMedium: "hsl(240 5% 64.9%)",
      textLight: "hsla(240, 5%, 64.9%, 0.4)",
      textBubble: "hsl(0 0% 98%)",
      textHeader: "hsl(240 5% 64.9%)",
      textHeaderSelected: "hsl(0 0% 98%)",
      bgCell: "hsl(240 6% 7%)",
      bgCellMedium: "hsl(240 6% 7%)",
      bgHeader: "hsl(240 6% 7%)",
      bgHeaderHasFocus: "hsl(240 3.7% 15.9%)",
      bgHeaderHovered: "hsl(240 3.7% 15.9%)",
      bgBubble: "hsl(240 3.7% 15.9%)",
      bgBubbleSelected: "hsl(240 6% 7%)",
      bgSearchResult: "hsl(240 3.7% 15.9%)",
      borderColor: "hsl(240 3.7% 15.9%)",
      horizontalBorderColor: "hsla(240, 3.7%, 15.9%, 0.6)",
      headerBottomBorderColor: "hsl(240 3.7% 15.9%)",
      linkColor: "hsl(0 0% 98%)",
      cellHorizontalPadding: 8,
      cellVerticalPadding: 3,
      headerFontStyle: "600 11px",
      baseFontStyle: "12px",
      editorFontSize: "12px",
      fontFamily: SANS_FONT,
      lineHeight: 1,
    };
  }
  return {
    accentColor: "hsl(240 10% 3.9%)",
    accentFg: "hsl(0 0% 100%)",
    accentLight: "hsla(240, 4.8%, 45%, 0.14)",
    textDark: "hsl(240 10% 3.9%)",
    textMedium: "hsl(240 3.8% 46.1%)",
    textLight: "hsla(240, 3.8%, 46.1%, 0.4)",
    textBubble: "hsl(240 10% 3.9%)",
    textHeader: "hsl(240 3.8% 46.1%)",
    textHeaderSelected: "hsl(240 10% 3.9%)",
    bgCell: "hsl(0 0% 100%)",
    bgCellMedium: "hsl(0 0% 100%)",
    bgHeader: "hsl(0 0% 100%)",
    bgHeaderHasFocus: "hsl(240 4.8% 95.9%)",
    bgHeaderHovered: "hsl(240 4.8% 95.9%)",
    bgBubble: "hsl(240 4.8% 95.9%)",
    bgBubbleSelected: "hsl(0 0% 100%)",
    bgSearchResult: "hsl(48 96% 89%)",
    borderColor: "hsl(240 5.9% 90%)",
    horizontalBorderColor: "hsla(240, 5.9%, 90%, 0.6)",
    headerBottomBorderColor: "hsl(240 5.9% 90%)",
    linkColor: "hsl(240 10% 3.9%)",
    cellHorizontalPadding: 8,
    cellVerticalPadding: 3,
    headerFontStyle: "600 11px",
    baseFontStyle: "12px",
    editorFontSize: "12px",
    fontFamily: SANS_FONT,
    lineHeight: 1,
  };
}

/** The in-cell match wash — the DOM table used bg-amber-100 / amber-400/30. */
function highlightColor(dark: boolean): string {
  return dark ? "hsla(45, 96%, 65%, 0.3)" : "hsl(48 96% 89%)";
}

type WithLetterSpacing = { letterSpacing?: string };

export function CsvTable({
  text,
  delimiter,
  testId = "csv-table",
  dark = false,
  onCellCommit,
  onUndo,
  onRedo,
  onCopySelection,
  columnTypes,
  onChangeColumnTypes,
  onProjectedCsvChange,
}: CsvTableProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const gridWrapRef = useRef<HTMLDivElement>(null);
  const columnsContainerRef = useRef<HTMLDivElement>(null);
  /** Source index of the last direct selection — the shift-click range anchor. */
  const anchorRef = useRef<number | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortState>(null);
  const sortRef = useRef<SortState>(sort);
  sortRef.current = sort;
  const preClickSortRef = useRef<SortState>(null);
  const [editingHeader, setEditingHeader] = useState<EditingHeaderState | null>(null);
  const [headerDraft, setHeaderDraft] = useState("");
  const headerInputRef = useRef<HTMLInputElement>(null);
  const [hiddenCols, setHiddenCols] = useState<Set<number>>(() => new Set<number>());
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [applyViewToOutput, setApplyViewToOutput] = useState(false);
  const [gridSelection, setGridSelection] = useState<GridSelection | undefined>(undefined);
  /** Selected rows as SOURCE indices — survives filter and sort. */
  const [selectedSources, setSelectedSources] = useState<Set<number>>(() => new Set<number>());
  const selectedSourcesRef = useRef(selectedSources);
  /** Measured container width — drives the master table's 1fr column growth. */
  const [containerWidth, setContainerWidth] = useState(0);
  const [internalColumnTypes, setInternalColumnTypes] = useState<
    Record<string, ColumnTypeOverride>
  >({});

  const editable = onCellCommit !== undefined;
  const effectiveColumnTypes = columnTypes ?? internalColumnTypes;
  const updateColumnTypes = useCallback(
    (next: Record<string, ColumnTypeOverride>) => {
      setInternalColumnTypes(next);
      onChangeColumnTypes?.(next);
    },
    [onChangeColumnTypes]
  );
  const palette = useMemo(() => buildTheme(dark), [dark]);
  const matchWash = highlightColor(dark);
  const selectedRowBg = dark ? "hsl(240 3.7% 15.9%)" : "hsl(240 4.8% 95.9%)";
  // Required prop in 6.0.3 even though this grid renders no image cells —
  // one loader per grid instance, alive for its lifetime.
  const imageWindowLoaderRef = useRef<ImageWindowLoaderImpl>();
  if (imageWindowLoaderRef.current === undefined) imageWindowLoaderRef.current = new ImageWindowLoaderImpl();

  const effectiveText = useMemo(
    () =>
      delimiter === undefined
        ? (detectMarkdownOrCliTable(text)?.cleanedCsv ?? text)
        : text,
    [text, delimiter]
  );
  const table = useMemo(
    () => parseCsvTable(effectiveText, delimiter),
    [effectiveText, delimiter]
  );
  const numeric = useMemo(() => numericColumns(table), [table]);
  const columnsCount = table.headers.length;

  // Reset hiddenCols when table.headers length/names change unless columns
  // still match (e.g. row edits or single-column header rename).
  const prevHeadersRef = useRef<string[]>(table.headers);
  if (prevHeadersRef.current !== table.headers) {
    const prev = prevHeadersRef.current;
    const curr = table.headers;
    prevHeadersRef.current = curr;
    const sameLength = prev.length === curr.length;
    const diffCount = sameLength
      ? curr.reduce((acc, h, i) => (h === prev[i] ? acc : acc + 1), 0)
      : Infinity;
    if (!sameLength || diffCount > 1 || (diffCount === 1 && curr.length <= 1)) {
      if (hiddenCols.size > 0) {
        setHiddenCols(new Set());
      }
    }
  }

  const visibleColIndices = useMemo(() => {
    const all = Array.from({ length: columnsCount }, (_, i) => i);
    if (hiddenCols.size === 0) return all;
    const filtered = all.filter((i) => !hiddenCols.has(i));
    return filtered.length > 0 ? filtered : all;
  }, [columnsCount, hiddenCols]);
  const visibleColIndicesRef = useRef(visibleColIndices);
  visibleColIndicesRef.current = visibleColIndices;

  const visibleTable = useMemo<CsvTableData>(() => {
    if (visibleColIndices.length === table.headers.length) return table;
    return {
      ...table,
      headers: visibleColIndices.map((c) => table.headers[c] ?? ""),
      rows: table.rows.map((row) => visibleColIndices.map((c) => row[c] ?? "")),
    };
  }, [table, visibleColIndices]);

  // Latest-value mirrors: event handlers (copy key, edit commits, canvas
  // draw callbacks) must always see the props of the last completed render.
  const latestRef = useRef({ text: effectiveText, table, visibleTable });
  latestRef.current = { text: effectiveText, table, visibleTable };
  const gridSelectionRef = useRef(gridSelection);
  gridSelectionRef.current = gridSelection;

  // Debounce the search ~150ms so typing over a 10k-row grid re-filters once
  // per pause, not per keystroke.
  useEffect(() => {
    const timer = window.setTimeout(() => setQuery(searchInput), 150);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  // Pure view: filter, then sort. Memoized on (table, query, sort) — typing
  // never re-parses the source text, and sorting composes on filtered indices.
  const view = useMemo(() => {
    const filtered = filterRowIndices(table.rows, query);
    if (!sort) return filtered;
    return sortRowIndices(filtered, table.rows, sort.col, sort.dir, numeric[sort.col] ?? false);
  }, [table, query, sort, numeric]);
  const viewRef = useRef(view);
  viewRef.current = view;

  // Measure the grid wrapper so data columns grow like the old minmax(110px,
  // 1fr) track instead of leaving dead space right of a small table.
  useEffect(() => {
    const el = gridWrapRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => setContainerWidth(el.clientWidth));
    observer.observe(el);
    setContainerWidth(el.clientWidth);
    return () => observer.disconnect();
  }, []);

  const columnWidth = Math.max(
    COLUMN_MIN_WIDTH,
    Math.floor((containerWidth - GUTTER_WIDTH) / Math.max(1, visibleColIndices.length))
  );

  // Close the Columns popover on Escape or outside click.
  useEffect(() => {
    if (!columnsOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        setColumnsOpen(false);
      }
    };
    const onClickOutside = (event: MouseEvent) => {
      const container = columnsContainerRef.current;
      if (container === null || !(event.target instanceof Node)) return;
      if (!container.contains(event.target)) setColumnsOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("click", onClickOutside);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("click", onClickOutside);
    };
  }, [columnsOpen]);

  const toggleColumnVisibility = useCallback(
    (colIndex: number) => {
      setHiddenCols((prev) => {
        const next = new Set(prev);
        if (next.has(colIndex)) {
          next.delete(colIndex);
        } else {
          const visibleAfter = columnsCount - (next.size + 1);
          if (visibleAfter < 1) return prev;
          next.add(colIndex);
        }
        return next;
      });
      setGridSelection((prev) =>
        prev && prev.columns.length > 0
          ? { ...prev, columns: CompactSelection.empty() }
          : prev
      );
    },
    [columnsCount]
  );

  const resetColumnsVisibility = useCallback(() => {
    setHiddenCols(new Set());
    setGridSelection((prev) =>
      prev && prev.columns.length > 0
        ? { ...prev, columns: CompactSelection.empty() }
        : prev
    );
  }, []);

  const hasHiddenColumns = visibleColIndices.length < columnsCount;
  const hasActiveViewTransform = query !== "" || sort !== null || hasHiddenColumns;
  const projectedCsv = useMemo(() => {
    if (!applyViewToOutput || !hasActiveViewTransform) return null;
    return projectCsvView(table, view, visibleColIndices);
  }, [applyViewToOutput, hasActiveViewTransform, table, view, visibleColIndices]);

  const onProjectedCsvChangeRef = useRef(onProjectedCsvChange);
  onProjectedCsvChangeRef.current = onProjectedCsvChange;
  useEffect(() => {
    onProjectedCsvChangeRef.current?.(projectedCsv);
  }, [projectedCsv]);
  useEffect(() => {
    return () => {
      onProjectedCsvChangeRef.current?.(null);
    };
  }, []);

  // A new parse can shrink the grid. Drop source indices that no longer
  // exist so the toolbar count stays honest (copy filters through the view).
  useEffect(() => {
    setSelectedSources((prev) => {
      let dropped = false;
      const next = new Set<number>();
      for (const index of prev) {
        if (index < table.rows.length) next.add(index);
        else dropped = true;
      }
      if (!dropped) return prev;
      selectedSourcesRef.current = next;
      return next;
    });
  }, [table]);

  // The controlled selection carries VIEW row indices; keep them aligned
  // with the source-index selection as the view reshapes (filter, sort).
  useEffect(() => {
    setGridSelection((prev) => {
      if (!prev || prev.rows.length === 0) return prev;
      const visible: number[] = [];
      for (const source of selectedSourcesRef.current) {
        const at = view.indexOf(source);
        if (at !== -1) visible.push(at);
      }
      visible.sort((a, b) => a - b);
      const rows = visible.reduce((acc, v) => acc.add(v), CompactSelection.empty());
      if (rows.equals(prev.rows)) return prev;
      return { ...prev, rows };
    });
  }, [view]);

  // A column deletion (or any column-shrinking edit) can strand the sort
  // state past the last header — drop it rather than keep a glyph target
  // that no longer exists. Filter/search re-derive on their own.
  useEffect(() => {
    setSort((prev) => (prev !== null && prev.col >= columnsCount ? null : prev));
    setEditingHeader((prev) => (prev !== null && prev.col >= columnsCount ? null : prev));
  }, [columnsCount]);

  const isFiltered = query !== "";
  const total = table.rows.length;

  // The stacked mobile layout can squeeze this pane below the grid's natural
  // height (the old DOM table overflowed visibly in the same case). Floor the
  // wrapper at the header plus a usable window of rows — flex-1 still fills
  // taller panes, and Glide scrolls internally for the rest.
  const gridMinHeight = HEADER_HEIGHT + Math.min(view.length, MAX_VISIBLE_ROWS) * ROW_HEIGHT;

  const clearSearch = () => {
    setSearchInput("");
    setQuery("");
  };

  // Header clicks sort with our comparator (Glide renders no sort logic of
  // its own); the same click selects the column through the grid's native
  // column selection. On a double-click in editable mode, restore the
  // pre-first-click sort state and open an inline header rename input over
  // the header bounds.
  const handleHeaderClicked = useCallback(
    (colIndex: number, event?: HeaderClickEvent) => {
      if (colIndex < GUTTER_COLUMNS) return; // the gutter header is not sortable or editable
      const visiblePos = colIndex - GUTTER_COLUMNS;
      const col = visibleColIndicesRef.current[visiblePos];
      if (col === undefined) return;
      if (editable && event?.isDoubleClick) {
        setSort(preClickSortRef.current);
        const currentHeader = latestRef.current.table.headers[col] ?? "";
        const wrapRect = gridWrapRef.current?.getBoundingClientRect();
        const rawBounds = event.bounds;
        const bounds: Rectangle =
          rawBounds && wrapRect && (wrapRect.width > 0 || wrapRect.height > 0)
            ? {
                x: Math.max(0, rawBounds.x - wrapRect.left),
                y: Math.max(0, rawBounds.y - wrapRect.top),
                width: rawBounds.width,
                height: rawBounds.height,
              }
            : rawBounds ?? {
                x: GUTTER_WIDTH + visiblePos * columnWidth,
                y: 0,
                width: columnWidth,
                height: HEADER_HEIGHT,
              };
        setHeaderDraft(currentHeader);
        setEditingHeader({ col, bounds });
        return;
      }
      preClickSortRef.current = sortRef.current;
      setEditingHeader(null);
      setSort((prev) => {
        if (!prev || prev.col !== col) return { col, dir: "asc" };
        if (prev.dir === "asc") return { col, dir: "desc" };
        return null;
      });
    },
    [editable, columnWidth]
  );

  const commitHeaderRename = useCallback(() => {
    if (!editingHeader) return;
    const { col } = editingHeader;
    setEditingHeader(null);
    if (!onCellCommit) return;
    const { text: sourceText, table: current } = latestRef.current;
    const oldHeader = current.headers[col] ?? "";
    const nextText = renameHeader(sourceText, current, col, headerDraft);
    if (nextText !== sourceText) {
      if (
        oldHeader !== "" &&
        oldHeader !== headerDraft &&
        effectiveColumnTypes[oldHeader] !== undefined
      ) {
        const nextTypes = { ...effectiveColumnTypes };
        const existingMode = nextTypes[oldHeader];
        delete nextTypes[oldHeader];
        if (headerDraft !== "" && existingMode !== undefined) {
          nextTypes[headerDraft] = existingMode;
        }
        updateColumnTypes(nextTypes);
      }
      onCellCommit(nextText);
    }
  }, [editingHeader, headerDraft, onCellCommit, effectiveColumnTypes, updateColumnTypes]);

  const cancelHeaderRename = useCallback(() => {
    setEditingHeader(null);
  }, []);

  useEffect(() => {
    if (!editingHeader) return;
    const input = headerInputRef.current;
    if (!input) return;
    input.focus();
    input.select();
  }, [editingHeader]);

  // Gutter clicks select rows. Plain click replaces, cmd/ctrl toggles, and
  // shift extends a range across the current view order — the same contract
  // the DOM gutter had, now forwarded into the controlled grid selection.
  const onGutterClick = useCallback((event: GutterClickEvent, viewRow: number) => {
    const view = viewRef.current;
    const source = view[viewRow];
    if (source === undefined) return;
    const selected = selectedSourcesRef.current;
    const anchor = anchorRef.current;
    let next: Set<number>;
    if (event.shiftKey && anchor !== null && anchor !== source) {
      const anchorPos = view.indexOf(anchor);
      const clickPos = view.indexOf(source);
      const from = anchorPos === -1 ? clickPos : anchorPos;
      const [lo, hi] = from <= clickPos ? [from, clickPos] : [clickPos, from];
      next = event.metaKey || event.ctrlKey ? new Set(selected) : new Set<number>();
      for (let p = lo; p <= hi; p++) {
        const s = view[p];
        if (s !== undefined) next.add(s);
      }
    } else if (event.metaKey || event.ctrlKey) {
      next = new Set(selected);
      if (next.has(source)) next.delete(source);
      else next.add(source);
    } else {
      next = new Set([source]);
    }
    anchorRef.current = source;
    selectedSourcesRef.current = next;
    setSelectedSources(next);
    const visible = [...next]
      .map((s) => view.indexOf(s))
      .filter((v) => v !== -1)
      .sort((a, b) => a - b);
    setGridSelection((prev) => ({
      current: prev?.current,
      columns: prev?.columns ?? CompactSelection.empty(),
      rows: visible.reduce((acc, v) => acc.add(v), CompactSelection.empty()),
    }));
  }, []);

  const clearSelection = useCallback(() => {
    anchorRef.current = null;
    selectedSourcesRef.current = new Set();
    setSelectedSources(new Set());
    setGridSelection(undefined);
  }, []);

  const handleGridSelectionChange = useCallback((next: GridSelection) => {
    const sources = new Set<number>();
    for (const viewRow of next.rows) {
      const source = viewRef.current[viewRow];
      if (source !== undefined) sources.add(source);
    }
    selectedSourcesRef.current = sources;
    setSelectedSources(sources);
    setGridSelection(next);
  }, []);

  const handleSelectionCleared = useCallback(() => {
    clearSelection();
  }, [clearSelection]);

  // Selected rows currently visible in the view. The chip counts THESE —
  // never the raw selection set — so the number always matches what Copy
  // as CSV emits. Hidden selections stay keyed by source index and come
  // back when the filter clears.
  const selectedInView = useMemo(() => view.filter((source) => selectedSources.has(source)), [view, selectedSources]);
  // Selected columns as 0-based DATA column indices (the grid selection
  // counts the gutter as column 0, and the gutter is not a data column —
  // the chip, Copy, and deletion all count data columns only).
  const selectedDataColumns = useMemo(
    () =>
      [...(gridSelection?.columns ?? [])]
        .filter((c) => c >= GUTTER_COLUMNS)
        .map((c) => visibleColIndices[c - GUTTER_COLUMNS])
        .filter((col): col is number => col !== undefined),
    [gridSelection, visibleColIndices]
  );
  const selectedColumnCount = selectedDataColumns.length;
  const selectedColumnHeaders = useMemo(
    () =>
      selectedDataColumns
        .map((colIndex) => table.headers[colIndex])
        .filter((header): header is string => header !== undefined),
    [selectedDataColumns, table.headers]
  );
  const sharedSelectedColumnType = useMemo<ColumnTypeOverride | null>(() => {
    if (selectedColumnHeaders.length === 0) return null;
    const first = effectiveColumnTypes[selectedColumnHeaders[0]] ?? "auto";
    for (let i = 1; i < selectedColumnHeaders.length; i += 1) {
      const mode = effectiveColumnTypes[selectedColumnHeaders[i]] ?? "auto";
      if (mode !== first) return null;
    }
    return first;
  }, [selectedColumnHeaders, effectiveColumnTypes]);
  const setSelectedColumnsType = useCallback(
    (mode: ColumnTypeOverride) => {
      if (!editable || selectedColumnHeaders.length === 0) return;
      const next: Record<string, ColumnTypeOverride> = {
        ...effectiveColumnTypes,
      };
      for (const header of selectedColumnHeaders) {
        if (mode === "auto") {
          delete next[header];
        } else {
          next[header] = mode;
        }
      }
      updateColumnTypes(next);
    },
    [editable, selectedColumnHeaders, effectiveColumnTypes, updateColumnTypes]
  );
  const pinnedColumnCount = useMemo(() => {
    if (!editable) return 0;
    return table.headers.filter(
      (header) => columnTypeBadge(effectiveColumnTypes[header]) !== null
    ).length;
  }, [editable, table.headers, effectiveColumnTypes]);
  const selection = useMemo<SelectionShape>(
    () => ({
      ranges: gridSelection?.current
        ? [gridSelection.current.range, ...gridSelection.current.rangeStack]
        : [],
      columns: gridSelection ? [...gridSelection.columns] : [],
      rows:
        selectedSources.size > 0
          ? view.reduce<number[]>((acc, source, viewRow) => {
              if (selectedSources.has(source)) acc.push(viewRow);
              return acc;
            }, [])
          : gridSelection
            ? [...gridSelection.rows]
            : [],
    }),
    [gridSelection, selectedSources, view]
  );
  const gutterColumns = GUTTER_COLUMNS;
  const selectionStats = useMemo(
    () => computeSelectionStats(visibleTable, view, selection, gutterColumns),
    [visibleTable, view, selection, gutterColumns]
  );
  const showSelectionChip =
    selectedInView.length > 0 || selectedColumnCount > 0 || selectionStats !== null;

  const onCopySelectionRef = useRef(onCopySelection);
  onCopySelectionRef.current = onCopySelection;

  const copySelection = () => {
    const selection = gridSelectionRef.current;
    const payload = serializeGridSelection(
      latestRef.current.visibleTable,
      viewRef.current,
      {
        ranges: selection?.current ? [selection.current.range, ...selection.current.rangeStack] : [],
        columns: selection ? [...selection.columns] : [],
        rows: selection ? [...selection.rows] : [],
      },
      GUTTER_COLUMNS
    );
    if (payload === null) return;
    onCopySelectionRef.current?.();
    navigator.clipboard?.writeText(payload).catch(() => {
      // Clipboard denial (permission, insecure context) degrades to a no-op —
      // same posture as the localStorage vote ids, never a broken page.
    });
  };

  // Glide's built-in copy emits TSV. Intercept the copy event while the grid
  // holds focus and write RFC 4180 CSV of the selection instead — ranges,
  // rows, or columns, exactly what the toolbar button emits.
  useEffect(() => {
    const onCopy = (event: ClipboardEvent) => {
      const root = rootRef.current;
      if (!root || !root.contains(document.activeElement)) return;
      const active = document.activeElement as HTMLElement | null;
      if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA" || active.isContentEditable)) {
        return; // the cell editor owns the clipboard — native text copy
      }
      const selection = gridSelectionRef.current;
      const payload = serializeGridSelection(
        latestRef.current.visibleTable,
        viewRef.current,
        {
          ranges: selection?.current ? [selection.current.range, ...selection.current.rangeStack] : [],
          columns: selection ? [...selection.columns] : [],
          rows: selection ? [...selection.rows] : [],
        },
        GUTTER_COLUMNS
      );
      if (payload === null) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      event.clipboardData?.setData("text/plain", payload);
      onCopySelectionRef.current?.();
    };
    window.addEventListener("copy", onCopy, { capture: true });
    return () => window.removeEventListener("copy", onCopy, { capture: true });
  }, []);

  // Keyboard Undo/Redo while focus is inside the grid container, yielding to
  // native text editing when an inline cell-editor, header-rename, or search
  // input/textarea holds focus.
  useEffect(() => {
    if (!onUndo && !onRedo) return;
    const onKeyDown = (event: KeyboardEvent) => {
      const root = rootRef.current;
      if (!root) return;
      const targetInRoot = event.target instanceof Node && root.contains(event.target);
      const activeInRoot =
        document.activeElement instanceof Node && root.contains(document.activeElement);
      if (!targetInRoot && !activeInRoot) return;
      if (isTextEntryElement(event.target) || isTextEntryElement(document.activeElement)) {
        return;
      }
      const action = matchHistoryShortcut(event);
      if (action === "undo" && onUndo) {
        event.preventDefault();
        onUndo();
      } else if (action === "redo" && onRedo) {
        event.preventDefault();
        onRedo();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onUndo, onRedo]);

  // Deletion commit path (input table only): a deletion splices the raw
  // CSV text byte-preserving — the same fidelity contract a cell edit
  // takes, so untouched rows keep their exact bytes (line endings, BOM,
  // trailing newline, ragged fields) — and hands the text to the same
  // guarded reconversion, the raw CSV staying the single source of truth.
  // A deletion changes row/column counts, so the selection (keyed by
  // source indices that shift or vanish) is cleared with the commit;
  // filter, sort, and the count chip re-derive from the new parse.
  const commitDeletion = useCallback(
    (nextText: string) => {
      const hadFocus =
        rootRef.current !== null &&
        document.activeElement instanceof Node &&
        rootRef.current.contains(document.activeElement);
      clearSelection();
      onCellCommit?.(nextText);
      if (hadFocus) {
        gridWrapRef.current?.focus({ preventScroll: true });
      }
    },
    [clearSelection, onCellCommit]
  );

  const allColumnsSelected = columnsCount > 0 && selectedDataColumns.length >= columnsCount;

  const deleteSelectedRows = () => {
    if (!editable || selectedInView.length === 0) return;
    commitDeletion(deleteRows(latestRef.current.text, latestRef.current.table, selectedInView));
  };

  const deleteSelectedColumns = () => {
    // Last-column guard: the serializer needs ≥1 column to reconvert.
    if (!editable || allColumnsSelected || selectedDataColumns.length === 0) return;
    commitDeletion(deleteColumns(latestRef.current.text, latestRef.current.table, selectedDataColumns));
  };

  // Keyboard Delete/Backspace (Glide onDelete, verified against the pinned
  // 6.0.3 source): whole selected rows first, then whole selected columns,
  // then the rows spanned by the current cell range(s). Returns false in
  // every case — a boolean true would make Glide ALSO clear the selection's
  // cells by splicing empty strings through onCellsEdited over the fresh
  // text, and a returned GridSelection would re-target stale geometry.
  // In 6.0.3, `onDelete` returning false is the documented way to say
  // "already handled — do nothing further".
  const onDeleteSelection = useCallback(
    (selection: GridSelection): boolean => {
      const commit = onCellCommit;
      if (!commit) return false;
      const { text: sourceText, table: current } = latestRef.current;
      const view = viewRef.current;

      if (selection.rows.length > 0) {
        const sources = [...selection.rows]
          .map((viewRow) => view[viewRow])
          .filter((source): source is number => source !== undefined);
        if (sources.length > 0) {
          commitDeletion(deleteRows(sourceText, current, sources));
          return false;
        }
      }
      if (selection.columns.length > 0) {
        const dataCols = [...selection.columns]
          .filter((c) => c >= GUTTER_COLUMNS)
          .map((c) => visibleColIndicesRef.current[c - GUTTER_COLUMNS])
          .filter((col): col is number => col !== undefined && col >= 0 && col < current.headers.length);
        // Last-column guard — same rule as the toolbar action.
        if (dataCols.length > 0 && dataCols.length < current.headers.length) {
          commitDeletion(deleteColumns(sourceText, current, dataCols));
        }
        return false;
      }
      // A plain cell range (drag or shift+arrow) deletes the rows it
      // spans — the primary range plus any stacked multi-rect ranges.
      const ranges =
        selection.current === undefined ? [] : [selection.current.range, ...selection.current.rangeStack];
      const sources: number[] = [];
      for (const range of ranges) {
        const from = Math.max(0, Math.min(range.y, view.length));
        const to = Math.max(0, Math.min(range.y + range.height, view.length));
        for (let v = from; v < to; v++) {
          const source = view[v];
          if (source !== undefined && !sources.includes(source)) sources.push(source);
        }
      }
      if (sources.length > 0) {
        commitDeletion(deleteRows(sourceText, current, sources));
      }
      return false;
    },
    [commitDeletion, onCellCommit]
  );

  // Cell-edit commit path: splice each edited row's exact byte span out of
  // the source and hand the new text to onCellCommit — the same guarded
  // reconversion any raw-view keystroke takes. Paste and fill arrive here
  // as batches; earlier splices shift later spans, so walk ascending with a
  // cumulative byte delta.
  const onCellsEdited = useCallback(
    (newValues: readonly { location: Item; value: EditableGridCell }[]): boolean => {
      const commit = onCellCommit;
      if (!commit) return false;
      const { text: sourceText, table: current } = latestRef.current;
      const view = viewRef.current;
      const ordered = [...newValues].sort((a, b) => a.location[1] - b.location[1]);
      let working = sourceText;
      let delta = 0;
      for (const { location, value } of ordered) {
        const visiblePos = location[0] - GUTTER_COLUMNS;
        const dataCol = visiblePos >= 0 ? visibleColIndicesRef.current[visiblePos] : undefined;
        const viewRow = location[1];
        if (dataCol === undefined || dataCol < 0 || value.kind !== GridCellKind.Text) continue;
        const source = view[viewRow];
        const span = source === undefined ? undefined : current.rowSpans[source];
        if (!span) continue;
        const rawRow = working.slice(span.start + delta, span.end + delta);
        const cells = parseCsvRecord(rawRow, current.delimiter);
        while (cells.length <= dataCol) cells.push("");
        const next = value.data ?? "";
        if (cells[dataCol] === next) continue;
        cells[dataCol] = next;
        const rowText = serializeCsvRow(cells, current.delimiter);
        working = working.slice(0, span.start + delta) + rowText + working.slice(span.end + delta);
        delta += rowText.length - (span.end - span.start);
      }
      if (working !== sourceText) commit(working);
      return true;
    },
    [onCellCommit]
  );

  // The grid asks for cells on demand (that IS the virtualization) — map
  // view rows back to source rows and grid columns back to data columns.
  const getCellContent = useCallback(
    (cell: Item): GridCell => {
      const [col, viewRow] = cell;
      const source = viewRef.current[viewRow];
      if (col < GUTTER_COLUMNS || source === undefined) {
        const label = source === undefined ? "" : String(source + 1);
        return {
          kind: GridCellKind.Text,
          data: label,
          displayData: label,
          allowOverlay: false,
          readonly: true,
          contentAlign: "right",
        };
      }
      const sourceCol = visibleColIndicesRef.current[col - GUTTER_COLUMNS];
      const value =
        sourceCol === undefined ? "" : (latestRef.current.table.rows[source]?.[sourceCol] ?? "");
      return {
        kind: GridCellKind.Text,
        data: value,
        displayData: value,
        allowOverlay: editable,
        readonly: !editable || undefined,
      };
    },
    [editable]
  );

  // Fill and the grid's own copy internals read cells through this window.
  const getCellsForSelection = useCallback(
    (selection: Rectangle): GridCell[][] => {
      const cells: GridCell[][] = [];
      for (let y = selection.y; y < selection.y + selection.height; y++) {
        const row: GridCell[] = [];
        for (let x = selection.x; x < selection.x + selection.width; x++) {
          row.push(getCellContent([x, y]));
        }
        cells.push(row);
      }
      return cells;
    },
    [getCellContent]
  );

  const onCellClicked = useCallback(
    (cell: Item, event: GutterClickEvent) => {
      if (cell[0] >= GUTTER_COLUMNS) return;
      onGutterClick(event, cell[1]);
    },
    [onGutterClick]
  );

  // Columns: the source-row gutter plus one per visible header. Uppercase in
  // the title (canvas has no text-transform); numeric columns get the mono
  // base font through a per-column theme override. Memoized — the grid
  // redraws when the array identity changes.
  const columns = useMemo<GridColumn[]>(() => {
    const gutter: GridColumn = {
      title: "#",
      id: "__gutter",
      width: GUTTER_WIDTH,
      themeOverride: { baseFontStyle: `11px ${MONO_FONT}`, textDark: "hsla(240, 3.8%, 46.1%, 0.4)" },
    };
    const data: GridColumn[] = visibleColIndices.map((sourceCol) => {
      const header = table.headers[sourceCol] ?? "";
      const badge = editable
        ? columnTypeBadge(effectiveColumnTypes[header])
        : null;
      return {
        title: badge ? `${header.toUpperCase()} [${badge}]` : header.toUpperCase(),
        id: `c${sourceCol}`,
        width: columnWidth,
        themeOverride: numeric[sourceCol] ? { baseFontStyle: `12px ${MONO_FONT}` } : undefined,
      };
    });
    return [gutter, ...data];
  }, [table.headers, visibleColIndices, numeric, columnWidth, editable, effectiveColumnTypes]);

  // Header strip: mono uppercase muted text, sort glyph on the sorted
  // column, right-aligned "#" in the gutter. A selected column header
  // gets the wash treatment — see the buildTheme contract note: Glide
  // pre-fills it with accentColor (inverted ink), so paint the opaque
  // bgHeaderHovered wash over that block plus a 2px accentColor bottom
  // border; the title then draws in textHeaderSelected, which contrasts
  // with the wash in both themes.
  const drawHeader = useCallback<DrawHeaderCallback>(
    (args, drawContent) => {
      const { ctx, columnIndex, rect, theme, isSelected } = args;
      ctx.save();
      try {
        (ctx as unknown as WithLetterSpacing).letterSpacing = "0.5px";
        if (isSelected) {
          ctx.fillStyle = theme.bgHeaderHovered;
          ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
          ctx.fillStyle = theme.accentColor;
          ctx.fillRect(rect.x, rect.y + rect.height - 2, rect.width, 2);
        }
        if (columnIndex < GUTTER_COLUMNS) {
          ctx.fillStyle = theme.bgHeader;
          if (!isSelected) ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
          ctx.fillStyle = theme.textLight;
          ctx.fillText("#", rect.x + rect.width - 8, rect.y + rect.height / 2 + 0.5);
          return;
        }
        drawContent();
        const sourceCol = visibleColIndices[columnIndex - GUTTER_COLUMNS];
        const sortDir = sort && sort.col === sourceCol ? sort.dir : null;
        if (sortDir !== null) {
          const cx = rect.x + rect.width - 11;
          const cy = rect.y + rect.height / 2;
          ctx.fillStyle = isSelected ? theme.textHeaderSelected : theme.textHeader;
          ctx.beginPath();
          if (sortDir === "asc") {
            ctx.moveTo(cx, cy - 2.5);
            ctx.lineTo(cx + 4, cy + 2.5);
            ctx.lineTo(cx - 4, cy + 2.5);
          } else {
            ctx.moveTo(cx, cy + 2.5);
            ctx.lineTo(cx + 4, cy - 2.5);
            ctx.lineTo(cx - 4, cy - 2.5);
          }
          ctx.closePath();
          ctx.fill();
        }
      } finally {
        (ctx as unknown as WithLetterSpacing).letterSpacing = "0px";
        ctx.restore();
      }
    },
    [sort, visibleColIndices]
  );

  // Cell layer: amber wash behind search matches (the DOM table's <mark>),
  // em-dash for empty cells.
  const drawCell = useCallback<DrawCellCallback>(
    (args, drawContent) => {
      const { ctx, cell, rect, col, theme } = args;
      const dataCol = col - GUTTER_COLUMNS;
      if (dataCol >= 0 && isFiltered && cell.kind === GridCellKind.Text) {
        const parts = splitHighlightParts(cell.data, query);
        if (parts !== null) {
          ctx.save();
          try {
            const cellFont = `${theme.baseFontStyle} ${theme.fontFamily}`;
            ctx.font = cellFont;
            let cursorX = rect.x + theme.cellHorizontalPadding;
            const midY = rect.y + rect.height / 2 + getMiddleCenterBias(ctx, cellFont);
            for (const part of parts) {
              const width = ctx.measureText(part.text).width;
              if (part.hit && width > 0) {
                ctx.fillStyle = matchWash;
                ctx.fillRect(cursorX - 1, midY - 7, width + 2, 14);
              }
              cursorX += width;
            }
          } finally {
            ctx.restore();
          }
        }
      }
      drawContent();
      if (dataCol >= 0 && cell.kind === GridCellKind.Text && cell.data === "") {
        ctx.save();
        try {
          ctx.font = `${theme.baseFontStyle} ${theme.fontFamily}`;
          ctx.fillStyle = theme.textLight;
          ctx.fillText("—", rect.x + theme.cellHorizontalPadding, rect.y + rect.height / 2 + 0.5);
        } finally {
          ctx.restore();
        }
      }
    },
    [isFiltered, query, matchWash]
  );

  // Selected-row wash — the DOM table used bg-muted on selected rows.
  const getRowThemeOverride = useCallback(
    (row: number): Partial<Theme> | undefined => {
      const source = viewRef.current[row];
      return source !== undefined && selectedSourcesRef.current.has(source)
        ? { bgCell: selectedRowBg, bgCellMedium: selectedRowBg }
        : undefined;
    },
    [selectedRowBg]
  );

  if (columnsCount === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-sm text-muted-foreground">
        No columns detected.
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col" ref={rootRef}>
      {/* Toolbar: dense strip matching the table chrome; sits above the
          sticky header so it never scrolls away with the body. */}
      <div
        data-testid={`${testId}-toolbar`}
        className="flex flex-none flex-wrap items-center gap-1.5 border-b border-border bg-panel px-2 py-1"
      >
        <div className="relative min-w-32 flex-1 sm:max-w-64">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-1.5 top-1/2 size-3 -translate-y-1/2 text-muted-foreground/60"
          />
          <input
            type="text"
            data-testid={`${testId}-search`}
            aria-label="Search rows"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") clearSearch();
            }}
            placeholder="Search…"
            className="h-6 w-full rounded-md border border-border bg-background pl-6 pr-6 text-xs text-foreground outline-none placeholder:text-muted-foreground/50 focus-visible:ring-3 focus-visible:ring-ring/50"
          />
          {searchInput !== "" && (
            <button
              type="button"
              data-testid={`${testId}-clear-search`}
              aria-label="Clear search"
              onClick={clearSearch}
              className="absolute right-1 top-1/2 -translate-y-1/2 cursor-pointer rounded p-0.5 text-muted-foreground/60 outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <X aria-hidden="true" className="size-3" />
            </button>
          )}
        </div>
        <span
          data-testid={`${testId}-count`}
          role="status"
          className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium tabular-nums text-muted-foreground"
        >
          {isFiltered
            ? `${view.length.toLocaleString()} of ${total.toLocaleString()}`
            : `${total.toLocaleString()} rows`}
        </span>
        {editable && pinnedColumnCount > 0 && (
          <button
            type="button"
            data-testid="input-table-column-types-reset"
            onClick={() => updateColumnTypes({})}
            title="Reset all pinned column types to Auto"
            className={TOOLBAR_BUTTON}
          >
            {`${pinnedColumnCount} ${
              pinnedColumnCount === 1 ? "column type" : "column types"
            } pinned`}
            <X aria-hidden="true" className="size-3 text-muted-foreground" />
          </button>
        )}
        <div ref={columnsContainerRef} className="relative">
          <button
            type="button"
            data-testid={`${testId}-columns-button`}
            aria-expanded={columnsOpen}
            aria-haspopup="dialog"
            aria-label="Columns"
            onClick={() => setColumnsOpen((prev) => !prev)}
            className={cn(
              TOOLBAR_BUTTON,
              hasHiddenColumns && "border-foreground/30 bg-muted font-semibold"
            )}
          >
            <Columns3 aria-hidden="true" className="size-3" />
            <span>
              {hasHiddenColumns
                ? `Columns (${visibleColIndices.length}/${columnsCount})`
                : "Columns"}
            </span>
          </button>
          {columnsOpen && (
            <div
              data-testid={`${testId}-columns-popout`}
              role="dialog"
              aria-label="Visible columns"
              className="absolute left-0 top-7 z-30 min-w-44 max-w-64 rounded-md border border-border bg-panel p-1.5 shadow-md"
            >
              <div className="mb-1 flex items-center justify-between gap-2 border-b border-border px-1.5 pb-1">
                <span className="text-[11px] font-semibold text-foreground">
                  Columns ({visibleColIndices.length}/{columnsCount})
                </span>
                {hasHiddenColumns && (
                  <button
                    type="button"
                    data-testid={`${testId}-columns-reset`}
                    onClick={resetColumnsVisibility}
                    className="cursor-pointer rounded px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    Show all
                  </button>
                )}
              </div>
              <div className="max-h-56 overflow-y-auto">
                {table.headers.map((header, colIdx) => {
                  const checked = !hiddenCols.has(colIdx);
                  const isLastVisible = checked && visibleColIndices.length <= 1;
                  const label = header !== "" ? header : `Column ${colIdx + 1}`;
                  return (
                    <label
                      key={colIdx}
                      className={cn(
                        "flex items-center gap-2 rounded px-1.5 py-1 text-xs",
                        isLastVisible
                          ? "cursor-not-allowed opacity-60"
                          : "cursor-pointer hover:bg-muted"
                      )}
                    >
                      <input
                        type="checkbox"
                        data-testid={`${testId}-column-toggle-${colIdx}`}
                        checked={checked}
                        disabled={isLastVisible}
                        onChange={() => toggleColumnVisibility(colIdx)}
                        className="size-3.5 accent-foreground"
                      />
                      <span className="truncate font-mono text-[11px] text-foreground">
                        {label}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        {hasActiveViewTransform && (
          <button
            type="button"
            data-testid={`${testId}-apply-view`}
            aria-pressed={applyViewToOutput}
            onClick={() => setApplyViewToOutput((prev) => !prev)}
            className={cn(
              "inline-flex cursor-pointer items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
              applyViewToOutput
                ? "border-foreground bg-foreground text-background hover:bg-foreground/90"
                : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            Apply view to output
          </button>
        )}
        {showSelectionChip && (
          <span className="flex flex-wrap items-center gap-1.5">
            <span
              data-testid={`${testId}-selected-count`}
              className="text-[11px] font-medium tabular-nums text-muted-foreground"
            >
              {selectedInView.length > 0
                ? `${selectedInView.length.toLocaleString()} selected`
                : selectedColumnCount > 0
                  ? `${selectedColumnCount.toLocaleString()} ${
                      selectedColumnCount === 1 ? "column" : "columns"
                    } selected`
                  : `${(selectionStats?.cellCount ?? 0).toLocaleString()} cells selected`}
            </span>
            {selectionStats !== null && (
              <span
                data-testid={`${testId}-selection-stats`}
                className="rounded-md bg-muted px-2 py-0.5 font-mono text-[11px] font-medium tabular-nums text-muted-foreground"
              >
                {formatSelectionStatsLabel(selectionStats)}
              </span>
            )}
            <button type="button" data-testid={`${testId}-copy`} onClick={copySelection} className={TOOLBAR_BUTTON}>
              <Copy aria-hidden="true" className="size-3" />
              Copy as CSV
            </button>
            {editable && selectedInView.length > 0 && (
              <button
                type="button"
                data-testid={`${testId}-delete-rows`}
                onClick={deleteSelectedRows}
                title={`Deletes the ${selectedInView.length} selected ${
                  selectedInView.length === 1 ? "row" : "rows"
                } from the source CSV`}
                className={TOOLBAR_BUTTON}
              >
                <Trash2 aria-hidden="true" className="size-3" />
                Delete {selectedInView.length.toLocaleString()}{" "}
                {selectedInView.length === 1 ? "row" : "rows"}
              </button>
            )}
            {editable && selectedColumnCount > 0 && (
              <>
                <span
                  role="group"
                  aria-label="Column type override"
                  data-testid="input-table-column-type-group"
                  className="inline-flex items-center gap-0.5 rounded-md border border-border bg-muted/60 p-0.5"
                >
                  {COLUMN_TYPE_OPTIONS.map(({ mode, label }) => {
                    const active = sharedSelectedColumnType === mode;
                    return (
                      <button
                        key={mode}
                        type="button"
                        data-testid={`input-table-column-type-${mode}`}
                        aria-pressed={active}
                        onClick={() => setSelectedColumnsType(mode)}
                        className={
                          active
                            ? "cursor-pointer rounded bg-background px-1.5 py-0.5 text-[11px] font-medium text-foreground shadow-2xs outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                            : "cursor-pointer rounded px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
                        }
                      >
                        {label}
                      </button>
                    );
                  })}
                </span>
                <button
                  type="button"
                  data-testid={`${testId}-delete-columns`}
                  onClick={deleteSelectedColumns}
                  disabled={allColumnsSelected}
                  title={
                    allColumnsSelected
                      ? "At least one column must remain — the converter needs a column to detect"
                      : `Deletes the ${selectedColumnCount} selected ${
                          selectedColumnCount === 1 ? "column" : "columns"
                        } from the source CSV`
                  }
                  className={`${TOOLBAR_BUTTON} disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  <Trash2 aria-hidden="true" className="size-3" />
                  Delete {selectedColumnCount.toLocaleString()}{" "}
                  {selectedColumnCount === 1 ? "column" : "columns"}
                </button>
              </>
            )}
            <button
              type="button"
              data-testid={`${testId}-clear-selection`}
              onClick={clearSelection}
              className={TOOLBAR_BUTTON}
            >
              Clear
            </button>
          </span>
        )}
      </div>
      <div
        ref={gridWrapRef}
        data-testid={testId}
        role="grid"
        tabIndex={-1}
        aria-rowcount={view.length + 1}
        className="relative min-h-0 flex-1 outline-none"
        style={{ minHeight: gridMinHeight }}
      >
        <div className="absolute inset-0">
          <DataEditorCore
            imageWindowLoader={imageWindowLoaderRef.current}
            // DataEditorCore builds no renderer map on its own — without this
            // the overlay editor mounts an empty shell (no text editor).
            renderers={AllCellRenderers}
            columns={columns}
            rows={view.length}
            getCellContent={getCellContent}
            getCellsForSelection={getCellsForSelection}
            onCellsEdited={editable ? onCellsEdited : undefined}
            onDelete={editable ? onDeleteSelection : undefined}
            onCellClicked={onCellClicked}
            onHeaderClicked={handleHeaderClicked}
            onGridSelectionChange={handleGridSelectionChange}
            onSelectionCleared={handleSelectionCleared}
            gridSelection={gridSelection}
            rangeSelect="multi-rect"
            columnSelect="multi"
            rowSelect="multi"
            rowHeight={ROW_HEIGHT}
            headerHeight={HEADER_HEIGHT}
            freezeColumns={GUTTER_COLUMNS}
            fillHandle={editable}
            onPaste={editable ? () => true : false}
            keybindings={{ search: false }}
            theme={palette}
            drawHeader={drawHeader}
            drawCell={drawCell}
            getRowThemeOverride={getRowThemeOverride}
            minColumnWidth={COLUMN_MIN_WIDTH}
            smoothScrollX
            smoothScrollY
            verticalBorder={false}
          />
        </div>
        {editingHeader !== null && (
          <input
            ref={headerInputRef}
            type="text"
            data-testid="csv-header-rename-input"
            aria-label={`Rename column ${table.headers[editingHeader.col] ?? ""}`}
            value={headerDraft}
            onChange={(event) => setHeaderDraft(event.target.value)}
            onBlur={commitHeaderRename}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                event.stopPropagation();
                commitHeaderRename();
              } else if (event.key === "Escape") {
                event.preventDefault();
                event.stopPropagation();
                cancelHeaderRename();
              }
            }}
            style={{
              left: editingHeader.bounds.x,
              top: editingHeader.bounds.y,
              width: Math.max(60, editingHeader.bounds.width),
              height: editingHeader.bounds.height,
            }}
            className="absolute z-20 border border-ring bg-background px-2 font-mono text-[11px] font-semibold tracking-wider text-foreground outline-none ring-2 ring-ring/50"
          />
        )}
        {isFiltered && view.length === 0 && (
          <div
            data-testid={`${testId}-empty-filter`}
            className="absolute inset-x-0 top-0 z-10 flex flex-col items-center gap-2 p-6 text-sm text-muted-foreground"
          >
            <span>No rows matching “{query}”.</span>
            <button type="button" onClick={clearSearch} className={TOOLBAR_BUTTON}>
              Show all rows
            </button>
          </div>
        )}
        {/* Input-pane guidance only — the read-only output pane accepts
            neither paste nor upload, so headers-only output (what deleting
            all input rows produces) shows no overlay at all. */}
        {editable && !isFiltered && view.length === 0 && (
          <div
            data-testid={`${testId}-empty-rows`}
            className="absolute inset-x-0 top-0 z-10 flex flex-col items-center gap-2 p-6 text-sm text-muted-foreground"
          >
            <span>No rows. Paste or upload data to start over.</span>
          </div>
        )}
      </div>
    </div>
  );
}

/** Highlight split for the current query — null when the cell has no hit. */
function splitHighlightParts(text: string, query: string): { text: string; hit: boolean }[] | null {
  if (query === "" || text === "") return null;
  const needle = query.toLowerCase();
  if (!text.toLowerCase().includes(needle)) return null;
  const parts: { text: string; hit: boolean }[] = [];
  const haystack = text.toLowerCase();
  let cursor = 0;
  for (;;) {
    const at = haystack.indexOf(needle, cursor);
    if (at === -1) break;
    if (at > cursor) parts.push({ text: text.slice(cursor, at), hit: false });
    parts.push({ text: text.slice(at, at + needle.length), hit: true });
    cursor = at + needle.length;
  }
  if (cursor < text.length) parts.push({ text: text.slice(cursor), hit: false });
  return parts;
}
