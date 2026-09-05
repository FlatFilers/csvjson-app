import { useMemo, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { numericColumns, parseCsvTable } from "@/lib/csvTable";

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

export function CsvTable({ text, delimiter, testId = "csv-table" }: CsvTableProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const table = useMemo(() => parseCsvTable(text, delimiter), [text, delimiter]);
  const numeric = useMemo(() => numericColumns(table), [table]);
  const columns = table.headers.length;

  const virtualizer = useVirtualizer({
    count: table.rows.length,
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

  return (
    <div ref={scrollRef} data-testid={testId} className="min-h-0 flex-1 overflow-auto">
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
          {table.headers.map((header, index) => (
            <div
              key={`${header}-${index}`}
              className="truncate px-2 py-1 leading-[14px]"
              title={header}
            >
              {header}
            </div>
          ))}
        </div>
        <div
          className="absolute inset-x-0"
          style={{ top: HEADER_HEIGHT, minWidth: totalMinWidth }}
        >
          {virtualRows.map((virtualRow) => {
            const row = table.rows[virtualRow.index];
            return (
              <div
                key={virtualRow.key}
                data-row-index={virtualRow.index}
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
                  aria-hidden="true"
                >
                  {virtualRow.index + 1}
                </div>
                {row.map((cell, c) => (
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
                    {cell}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
