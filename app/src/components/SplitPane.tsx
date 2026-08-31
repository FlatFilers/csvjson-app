import { useEffect, useRef, useState, type ReactNode } from "react";
import { SPLIT_MAX, SPLIT_MIN, SPLIT_RESET, clampSplit } from "@/lib/split";
import { cn } from "@/lib/utils";

/**
 * "side-by-side": input left, output right, seam is a vertical line.
 * "stacked": below 768px the panes stack vertically and the seam becomes a
 * horizontal drag strip (spec: Split screen with a direction switch).
 */
export type SplitLayout = "side-by-side" | "stacked";

type SplitPaneProps = {
  layout: SplitLayout;
  /** Position of the seam as a percentage of the split axis (clamped 20–80). */
  split: number;
  onSplitChange: (split: number) => void;
  left: ReactNode;
  right: ReactNode;
  /** Rendered centered on the seam — the direction switch. */
  children?: ReactNode;
};

export function SplitPane({
  layout,
  split,
  onSplitChange,
  left,
  right,
  children,
}: SplitPaneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const stacked = layout === "stacked";

  useEffect(() => {
    if (!dragging) return;
    const onMove = (event: MouseEvent) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect || rect.width === 0 || rect.height === 0) return;
      const fraction = stacked
        ? (event.clientY - rect.top) / rect.height
        : (event.clientX - rect.left) / rect.width;
      onSplitChange(clampSplit(fraction * 100));
    };
    const onUp = () => setDragging(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [dragging, stacked, onSplitChange]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative flex min-h-0 flex-1 select-none",
        stacked ? "flex-col" : "flex-row"
      )}
    >
      {/* Left pane gets the border — that 1px line IS the flush seam (no gutter). */}
      <div
        data-testid="pane-left"
        style={stacked ? { height: `${split}%` } : { width: `${split}%` }}
        className={cn(
          "flex min-h-0 min-w-0 flex-col border-border bg-panel",
          stacked ? "border-b" : "border-r"
        )}
      >
        {left}
      </div>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-panel">{right}</div>

      {/* Invisible drag strip centered on the seam; the switch floats on it. */}
      <div
        data-testid="seam"
        role="separator"
        aria-orientation={stacked ? "horizontal" : "vertical"}
        aria-valuenow={Math.round(split)}
        aria-valuemin={SPLIT_MIN}
        aria-valuemax={SPLIT_MAX}
        title="Drag to resize · double-click to reset"
        onMouseDown={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDoubleClick={() => onSplitChange(SPLIT_RESET)}
        className={cn(
          "absolute z-10",
          stacked ? "inset-x-0 cursor-row-resize" : "inset-y-0 cursor-col-resize"
        )}
        style={
          stacked ? { top: `${split}%`, height: 0 } : { left: `${split}%`, width: 0 }
        }
      >
        {/* 12px invisible hit area so the 1px seam is grabbable */}
        <div
          className={cn(
            "absolute",
            stacked ? "inset-x-0 -top-1.5 h-3" : "inset-y-0 -left-1.5 w-3"
          )}
        />
        {children ? (
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            {children}
          </div>
        ) : null}
      </div>
    </div>
  );
}
