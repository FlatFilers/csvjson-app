import { useCallback, useEffect, useRef, useState } from "react";
import { Clock, Trash2, X } from "lucide-react";
import {
  formatRelativeTimestamp,
  type RecentSnapshot,
} from "@/lib/recentHistory";

export interface RecentHistoryButtonProps {
  snapshots: RecentSnapshot[];
  onSelect: (snapshot: RecentSnapshot) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
}

function directionBadgeLabel(direction: RecentSnapshot["direction"]): string {
  return direction === "csv2json" ? "CSV→JSON" : "JSON→CSV";
}

function shapeSummary(rows: number, cols: number): string {
  if (rows > 0 && cols > 0) return `${rows} rows · ${cols} cols`;
  if (rows > 0) return `${rows} rows`;
  if (cols > 0) return `${cols} cols`;
  return "0 rows";
}

export function RecentHistoryButton({
  snapshots,
  onSelect,
  onRemove,
  onClear,
}: RecentHistoryButtonProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  const closePopout = useCallback(() => {
    setOpen(false);
  }, []);

  const wasOpenRef = useRef(false);
  useEffect(() => {
    if (wasOpenRef.current && !open) {
      triggerRef.current?.focus();
    }
    wasOpenRef.current = open;
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closePopout();
    };
    const onClickOutside = (event: MouseEvent) => {
      const container = containerRef.current;
      if (container === null || !(event.target instanceof Node)) return;
      if (!container.contains(event.target)) closePopout();
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("click", onClickOutside);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("click", onClickOutside);
    };
  }, [open, closePopout]);

  const count = snapshots.length;

  return (
    <div
      data-testid="recent-history"
      ref={containerRef}
      className="relative max-sm:static"
    >
      <button
        type="button"
        data-testid="recent-history-toggle"
        ref={triggerRef}
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label="Recent conversions"
        title="Recent conversions"
        className="relative inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-panel px-2.5 text-xs font-medium text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <Clock size={14} strokeWidth={2} aria-hidden="true" />
        <span className="hidden sm:inline">Recent</span>
        {count > 0 && (
          <span
            data-testid="recent-history-count"
            className="rounded-full bg-muted px-1.5 py-px text-[10px] font-semibold tabular-nums text-foreground"
          >
            {count}
          </span>
        )}
      </button>

      {open && (
        <div
          data-testid="recent-history-popout"
          role="dialog"
          aria-label="Recent conversions"
          className="absolute right-0 top-9 z-50 w-80 rounded-md border border-border bg-panel shadow-md max-sm:inset-x-2 max-sm:top-14 max-sm:w-auto"
        >
          <div className="flex items-center justify-between border-b border-border py-1.5 pl-3 pr-1.5">
            <span className="text-xs font-semibold tracking-tight text-foreground">
              Recent conversions
            </span>
            <div className="flex items-center gap-1">
              {count > 0 && (
                <button
                  type="button"
                  data-testid="recent-history-clear"
                  onClick={() => {
                    onClear();
                  }}
                  className="cursor-pointer rounded-md px-2 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  Clear history
                </button>
              )}
              <button
                type="button"
                data-testid="recent-history-close"
                onClick={closePopout}
                aria-label="Close recent conversions"
                className="flex size-6 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X size={14} strokeWidth={2} aria-hidden="true" />
              </button>
            </div>
          </div>

          {count === 0 ? (
            <div
              data-testid="recent-history-empty"
              className="px-3 py-6 text-center text-xs text-muted-foreground"
            >
              No recent conversions saved on this device yet.
            </div>
          ) : (
            <div className="max-h-96 divide-y divide-border overflow-y-auto">
              {snapshots.map((snapshot) => (
                <div
                  key={snapshot.id}
                  className="flex items-start justify-between gap-1 px-2 py-2 transition-colors hover:bg-muted/50"
                >
                  <button
                    type="button"
                    data-testid={`recent-history-item-${snapshot.id}`}
                    onClick={() => {
                      onSelect(snapshot);
                      closePopout();
                    }}
                    className="flex min-w-0 flex-1 cursor-pointer flex-col items-start text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/50 rounded-sm px-1 py-0.5"
                  >
                    <div className="mb-1 flex w-full items-center gap-1.5">
                      <span className="rounded-full border border-border px-1.5 py-px text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                        {directionBadgeLabel(snapshot.direction)}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {shapeSummary(snapshot.rows, snapshot.cols)}
                      </span>
                      <span className="ml-auto text-[11px] text-muted-foreground">
                        {formatRelativeTimestamp(snapshot.createdAt)}
                      </span>
                    </div>
                    <span className="w-full truncate font-mono text-xs text-foreground">
                      {snapshot.filename ?? snapshot.preview}
                    </span>
                  </button>
                  <button
                    type="button"
                    data-testid={`recent-history-delete-${snapshot.id}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      onRemove(snapshot.id);
                    }}
                    aria-label={`Delete recent snapshot ${snapshot.filename ?? snapshot.preview}`}
                    title="Delete snapshot"
                    className="mt-0.5 flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <Trash2 size={13} strokeWidth={2} aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
