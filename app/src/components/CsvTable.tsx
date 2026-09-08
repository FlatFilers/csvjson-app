import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DataEditorCore,
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
import { Copy, Search, X } from "lucide-react";
import { numericColumns, parseCsvRecord, parseCsvTable, serializeCsvRow } from "@/lib/csvTable";
import { filterRowIndices, sortRowIndices, type SortDir } from "@/lib/tableView";
import { serializeGridSelection } from "@/lib/tableSelection";

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
 * aware sort (BigInt-safe), RFC 4180 copy serialization, and the guarded
 * reconversion path — every cell edit splices the edited row's exact bytes
 * and hands the result to onCellCommit, so the raw CSV is the single
 * source of truth. The output pane renders this same component with no
 * onCellCommit: strictly read-only, no editor, no editing affordances.
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
};

type SortState = { col: number; dir: SortDir } | null;

type GutterClickEvent = { shiftKey?: boolean; metaKey?: boolean; ctrlKey?: boolean };

/** Toolbar button classes — dense chrome matching the header strip. */
const TOOLBAR_BUTTON =
  "inline-flex cursor-pointer items-center gap-1 rounded-md border border-border bg-background px-1.5 py-0.5 text-[11px] font-medium text-foreground hover:bg-muted outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

/** Canvas has no CSS variables — resolve the palette per theme explicitly. */
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

export function CsvTable({ text, delimiter, testId = "csv-table", dark = false, onCellCommit }: CsvTableProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const gridWrapRef = useRef<HTMLDivElement>(null);
  /** Source index of the last direct selection — the shift-click range anchor. */
  const anchorRef = useRef<number | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortState>(null);
  const [gridSelection, setGridSelection] = useState<GridSelection | undefined>(undefined);
  /** Selected rows as SOURCE indices — survives filter and sort. */
  const [selectedSources, setSelectedSources] = useState<Set<number>>(() => new Set<number>());
  const selectedSourcesRef = useRef(selectedSources);
  /** Measured container width — drives the master table's 1fr column growth. */
  const [containerWidth, setContainerWidth] = useState(0);

  const editable = onCellCommit !== undefined;
  const palette = useMemo(() => buildTheme(dark), [dark]);
  const matchWash = highlightColor(dark);
  const selectedRowBg = dark ? "hsl(240 3.7% 15.9%)" : "hsl(240 4.8% 95.9%)";
  // Required prop in 6.0.3 even though this grid renders no image cells —
  // one loader per grid instance, alive for its lifetime.
  const imageWindowLoaderRef = useRef<ImageWindowLoaderImpl>();
  if (imageWindowLoaderRef.current === undefined) imageWindowLoaderRef.current = new ImageWindowLoaderImpl();

  const table = useMemo(() => parseCsvTable(text, delimiter), [text, delimiter]);
  const numeric = useMemo(() => numericColumns(table), [table]);
  const columnsCount = table.headers.length;

  // Latest-value mirrors: event handlers (copy key, edit commits, canvas
  // draw callbacks) must always see the props of the last completed render.
  const latestRef = useRef({ text, table });
  latestRef.current = { text, table };
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
    Math.floor((containerWidth - GUTTER_WIDTH) / Math.max(1, columnsCount))
  );

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
  // column selection.
  const cycleSort = useCallback((colIndex: number) => {
    if (colIndex < GUTTER_COLUMNS) return; // the gutter header is not sortable
    const col = colIndex - GUTTER_COLUMNS;
    setSort((prev) => {
      if (!prev || prev.col !== col) return { col, dir: "asc" };
      if (prev.dir === "asc") return { col, dir: "desc" };
      return null;
    });
  }, []);

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

  const clearSelection = () => {
    anchorRef.current = null;
    selectedSourcesRef.current = new Set();
    setSelectedSources(new Set());
    setGridSelection(undefined);
  };

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
  }, []);

  // Selected rows currently visible in the view. The chip counts THESE —
  // never the raw selection set — so the number always matches what Copy
  // as CSV emits. Hidden selections stay keyed by source index and come
  // back when the filter clears.
  const selectedInView = useMemo(() => view.filter((source) => selectedSources.has(source)), [view, selectedSources]);
  const selectedColumnCount = gridSelection?.columns.length ?? 0;
  const showSelectionChip = selectedInView.length > 0 || selectedColumnCount > 0;

  const copySelection = () => {
    const selection = gridSelectionRef.current;
    const payload = serializeGridSelection(
      latestRef.current.table,
      viewRef.current,
      {
        ranges: selection?.current ? [selection.current.range, ...selection.current.rangeStack] : [],
        columns: selection ? [...selection.columns] : [],
        rows: selection ? [...selection.rows] : [],
      },
      GUTTER_COLUMNS
    );
    if (payload === null) return;
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
        latestRef.current.table,
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
    };
    window.addEventListener("copy", onCopy, { capture: true });
    return () => window.removeEventListener("copy", onCopy, { capture: true });
  }, []);

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
        const dataCol = location[0] - GUTTER_COLUMNS;
        const viewRow = location[1];
        if (dataCol < 0 || value.kind !== GridCellKind.Text) continue;
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
      const value = latestRef.current.table.rows[source]?.[col - GUTTER_COLUMNS] ?? "";
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

  // Columns: the source-row gutter plus one per header. Uppercase in the
  // title (canvas has no text-transform); numeric columns get the mono
  // base font through a per-column theme override. Memoized — the grid
  // redraws when the array identity changes.
  const columns = useMemo<GridColumn[]>(() => {
    const gutter: GridColumn = {
      title: "#",
      id: "__gutter",
      width: GUTTER_WIDTH,
      themeOverride: { baseFontStyle: `11px ${MONO_FONT}`, textDark: "hsla(240, 3.8%, 46.1%, 0.4)" },
    };
    const data: GridColumn[] = table.headers.map((header, index) => ({
      title: header.toUpperCase(),
      id: `c${index}`,
      width: columnWidth,
      themeOverride: numeric[index] ? { baseFontStyle: `12px ${MONO_FONT}` } : undefined,
    }));
    return [gutter, ...data];
  }, [table.headers, numeric, columnWidth]);

  // Header strip: mono uppercase muted text, sort glyph on the sorted
  // column, right-aligned "#" in the gutter.
  const drawHeader = useCallback<DrawHeaderCallback>(
    (args, drawContent) => {
      const { ctx, columnIndex, rect, theme } = args;
      ctx.save();
      try {
        (ctx as unknown as WithLetterSpacing).letterSpacing = "0.5px";
        if (columnIndex < GUTTER_COLUMNS) {
          ctx.fillStyle = theme.bgHeader;
          ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
          ctx.fillStyle = theme.textLight;
          ctx.fillText("#", rect.x + rect.width - 8, rect.y + rect.height / 2 + 0.5);
          return;
        }
        drawContent();
        const sortDir = sort && sort.col === columnIndex - GUTTER_COLUMNS ? sort.dir : null;
        if (sortDir !== null) {
          const cx = rect.x + rect.width - 11;
          const cy = rect.y + rect.height / 2;
          ctx.fillStyle = theme.textHeader;
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
    [sort]
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
        {showSelectionChip && (
          <span className="flex items-center gap-1.5">
            <span
              data-testid={`${testId}-selected-count`}
              className="text-[11px] font-medium tabular-nums text-muted-foreground"
            >
              {selectedInView.length > 0
                ? `${selectedInView.length.toLocaleString()} selected`
                : `${selectedColumnCount.toLocaleString()} ${
                    selectedColumnCount === 1 ? "column" : "columns"
                  } selected`}
            </span>
            <button type="button" data-testid={`${testId}-copy`} onClick={copySelection} className={TOOLBAR_BUTTON}>
              <Copy aria-hidden="true" className="size-3" />
              Copy as CSV
            </button>
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
        aria-rowcount={view.length + 1}
        className="relative min-h-0 flex-1"
        style={{ minHeight: gridMinHeight }}
      >
        <div className="absolute inset-0">
          <DataEditorCore
            imageWindowLoader={imageWindowLoaderRef.current}
            columns={columns}
            rows={view.length}
            getCellContent={getCellContent}
            getCellsForSelection={getCellsForSelection}
            onCellsEdited={editable ? onCellsEdited : undefined}
            onCellClicked={onCellClicked}
            onHeaderClicked={cycleSort}
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
