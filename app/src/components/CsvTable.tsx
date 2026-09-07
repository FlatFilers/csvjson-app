import { useEffect, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ChevronDown, ChevronUp, Search, X } from "lucide-react";
import { numericColumns, parseCsvTable } from "@/lib/csvTable";
import { filterRowIndices, sortRowIndices, splitHighlight, type SortDir } from "@/lib/tableView";

/**
 * Dense full-bleed CSV/TSV table (spec: CSV pane — sticky header, compact
 * rows, monospace numerics; criterion 5 — ~10k+ rows render virtualized
 * without frame freeze). Full-bleed inside its pane: no card chrome.
 *
 * v0 port: mono uppercase muted headers, a right-aligned row-number
 * column, hairline row rules with a hover wash, and em-dashes for empty
 * cells. Virtualization is untouched.
 *
 * Rows render through TanStack Virtual; row height is fixed so the estimate
 * is exact — no per-row measurement passes. Headers are position:sticky and
 * share the horizontal scroll with the rows; header and rows use the same
 * grid template so columns align.
 *
 * View powers (spec: CSV table superpowers, PR A): the toolbar's search
 * filter and the header sorts are pure index mappings over the parsed grid
 * (lib/tableView.ts) — the raw text is the single source of truth and is
 * never re-parsed while interacting. The view array maps virtual rows back
 * to source rows, so the gutter always shows the source row number and
 * selection (a set of source indices) survives filtering and sorting. Both
 * the input and output tables are this one component.
 */

const ROW_HEIGHT = 24;
const HEADER_HEIGHT = 26;
/** Minimum width per column; narrower viewports scroll horizontally. */
const COLUMN_MIN_WIDTH = 110;
/** Width of the leading row-number column. */
const ROW_NUMBER_WIDTH = 40;

type CsvTableProps = {
  text: string;
  /** Forced separator (, ; \t |) mirroring the converter's separator option; omitted → auto-detect. */
  delimiter?: string;
  testId?: string;
};

type SortState = { col: number; dir: SortDir } | null;

/** Toolbar button classes — dense chrome matching the header strip. */
const TOOLBAR_BUTTON =
  "inline-flex cursor-pointer items-center gap-1 rounded-md border border-border bg-background px-1.5 py-0.5 text-[11px] font-medium text-foreground hover:bg-muted outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

export function CsvTable({ text, delimiter, testId = "csv-table" }: CsvTableProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortState>(null);

  const table = useMemo(() => parseCsvTable(text, delimiter), [text, delimiter]);
  const numeric = useMemo(() => numericColumns(table), [table]);
  const columns = table.headers.length;

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

  // The virtualizer counts view rows, not source rows — the window renderer
  // maps each view slot back to its source row via view[virtualRow.index].
  const virtualizer = useVirtualizer({
    count: view.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
  });
  const virtualRows = virtualizer.getVirtualItems();

  if (columns === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-sm text-muted-foreground">
        No columns detected.
      </div>
    );
  }

  const gridTemplate = `${ROW_NUMBER_WIDTH}px repeat(${columns}, minmax(${COLUMN_MIN_WIDTH}px, 1fr))`;
  const totalMinWidth = columns * COLUMN_MIN_WIDTH + ROW_NUMBER_WIDTH;
  const isFiltered = query !== "";
  const total = table.rows.length;

  const clearSearch = () => {
    setSearchInput("");
    setQuery("");
  };

  // Tri-state: asc → desc → natural (null), restarting at asc for a new column.
  const cycleSort = (col: number) =>
    setSort((prev) => {
      if (!prev || prev.col !== col) return { col, dir: "asc" };
      if (prev.dir === "asc") return { col, dir: "desc" };
      return null;
    });

  return (
    <div className="flex min-h-0 flex-1 flex-col">
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
      </div>
      <div
        ref={scrollRef}
        data-testid={testId}
        role="grid"
        aria-rowcount={view.length + 1}
        className="min-h-0 flex-1 overflow-auto"
      >
        {/* Total height = header + virtualized body; the spacer drives scrollbar size. */}
        <div
          className="relative"
          style={{
            height: virtualizer.getTotalSize() + HEADER_HEIGHT,
            minWidth: totalMinWidth,
          }}
        >
          <div
            className="sticky top-0 z-10 grid items-center border-b border-border bg-panel font-mono text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
            style={{ height: HEADER_HEIGHT, gridTemplateColumns: gridTemplate }}
            role="row"
          >
            <div
              className="truncate px-2 py-1 text-right font-normal text-muted-foreground/50 leading-[14px]"
              aria-hidden="true"
            >
              #
            </div>
            {table.headers.map((header, index) => {
              const activeSort = sort?.col === index ? sort : null;
              return (
                <button
                  key={`${header}-${index}`}
                  type="button"
                  role="columnheader"
                  aria-sort={activeSort ? (activeSort.dir === "asc" ? "ascending" : "descending") : undefined}
                  onClick={() => cycleSort(index)}
                  title={header}
                  className="cursor-pointer truncate px-2 py-1 text-left leading-[14px] outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <span className="inline-flex items-center gap-0.5">
                    {header}
                    {activeSort && (
                      activeSort.dir === "asc" ? (
                        <ChevronUp aria-hidden="true" className="size-3" />
                      ) : (
                        <ChevronDown aria-hidden="true" className="size-3" />
                      )
                    )}
                  </span>
                </button>
              );
            })}
          </div>
          {view.length === 0 && isFiltered ? (
            <div
              data-testid={`${testId}-empty-filter`}
              className="absolute inset-x-0 flex flex-col items-center gap-2 p-6 text-sm text-muted-foreground"
              style={{ top: HEADER_HEIGHT }}
            >
              <span>No rows matching “{query}”.</span>
              <button type="button" onClick={clearSearch} className={TOOLBAR_BUTTON}>
                Clear search
              </button>
            </div>
          ) : (
            <div className="absolute inset-x-0" style={{ top: HEADER_HEIGHT, minWidth: totalMinWidth }}>
              {virtualRows.map((virtualRow) => {
                const sourceIndex = view[virtualRow.index];
                const row = table.rows[sourceIndex];
                return (
                  <div
                    key={virtualRow.key}
                    data-row-index={virtualRow.index}
                    data-source-index={sourceIndex}
                    role="row"
                    className="absolute inset-x-0 grid items-center border-b border-border/60 text-[12px] leading-none transition-colors hover:bg-muted/50"
                    style={{
                      top: virtualRow.start,
                      height: ROW_HEIGHT,
                      gridTemplateColumns: gridTemplate,
                    }}
                  >
                    <div
                      className="truncate px-2 text-right font-mono text-[11px] tabular-nums text-muted-foreground/40"
                    >
                      {sourceIndex + 1}
                    </div>
                    {row.map((cell, c) => {
                      const segments = cell === "" || !isFiltered ? null : splitHighlight(cell, query);
                      return (
                        <div
                          key={c}
                          className={
                            "truncate px-2" +
                            (cell === ""
                              ? // Empty cells keep their em-dash purely visual via
                                // ::after — copying the table yields empty strings.
                                " after:content-['—'] after:text-muted-foreground/30"
                              : numeric[c]
                                ? " font-mono tabular-nums"
                                : "")
                          }
                          title={cell}
                        >
                          {segments
                            ? segments.map((segment, s) =>
                                segment.hit ? (
                                  <mark
                                    key={s}
                                    className="rounded-[2px] bg-amber-100 text-foreground dark:bg-amber-400/30 dark:text-amber-100"
                                  >
                                    {segment.text}
                                  </mark>
                                ) : (
                                  <span key={s}>{segment.text}</span>
                                )
                              )
                            : cell}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
