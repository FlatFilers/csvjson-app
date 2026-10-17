import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { SPLIT_MAX, SPLIT_MIN, SPLIT_RESET, clampSplit } from "@/lib/split";
import { cn } from "@/lib/utils";

/**
 * "side-by-side": input left, output right, seam is a vertical line.
 * "stacked": below Tailwind's md: breakpoint (48rem — 768px at the 16px
 * default font) the panes stack vertically and the seam becomes a
 * horizontal drag strip (spec: Split screen with a direction switch).
 *
 * The visible orientation is CSS-first (`flex-col md:flex-row` + `--split`),
 * so the prerendered HTML paints correctly before React mounts. `layout`
 * only steers drag math and aria-orientation — never first-paint styling.
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
  // CSS-first orientation: media queries own the visible layout so the
  // prerendered HTML paints correctly without JS (no stacked→columns flash
  // on desktop). `stacked` survives only for drag math (clientY vs clientX)
  // and aria-orientation. The breakpoint lives in App.tsx as
  // useMediaQuery("(min-width: 48rem)") — the same units as Tailwind's
  // `md:` (min-width: 48rem), so the two can never diverge when the
  // browser's default font size changes.
  const stacked = layout === "stacked";

  // Pointer Events cover mouse, touch, and pen in one path; touch-action:
  // none on the seam stops the browser from claiming the gesture to scroll.
  useEffect(() => {
    if (!dragging) return;
    const onMove = (event: PointerEvent) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect || rect.width === 0 || rect.height === 0) return;
      const fraction = stacked
        ? (event.clientY - rect.top) / rect.height
        : (event.clientX - rect.left) / rect.width;
      onSplitChange(clampSplit(fraction * 100));
    };
    const onUp = () => setDragging(false);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    // Palm rejection / gesture takeover can cancel the pointer mid-drag;
    // without this the seam keeps tracking with no button held.
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [dragging, stacked, onSplitChange]);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 5 : 1;
    switch (event.key) {
      case "ArrowLeft":
      case "ArrowUp":
        event.preventDefault();
        onSplitChange(clampSplit(split - step));
        break;
      case "ArrowRight":
      case "ArrowDown":
        event.preventDefault();
        onSplitChange(clampSplit(split + step));
        break;
      case "Home":
        event.preventDefault();
        onSplitChange(SPLIT_MIN);
        break;
      case "End":
        event.preventDefault();
        onSplitChange(SPLIT_MAX);
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        onSplitChange(SPLIT_RESET);
        break;
    }
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative flex min-h-0 flex-1",
        // Orientation is CSS-first — see the note on `stacked` above.
        "flex-col md:flex-row",
        // Text must stay selectable in every pane (table cells, editors,
        // read-only output). The suppression is only for an active seam drag
        // so pointer drags don't highlight content — never a standing rule.
        dragging && "select-none"
      )}
    >
      {/* Left pane gets the border — that 1px line IS the flush seam (no gutter). */}
      <div
        data-testid="pane-left"
        style={{ "--split": `${split}%` } as CSSProperties}
        className={cn(
          "flex min-h-0 min-w-0 flex-col overflow-hidden border-border bg-panel max-md:min-h-[280px]",
          // Stacked: --split sizes the pane's height; side-by-side: its width.
          "h-[var(--split)] border-b",
          "md:h-auto md:w-[var(--split)] md:border-b-0 md:border-r"
        )}
      >
        {left}
      </div>

      {/* In-flow horizontal bar between stacked panes on <md; invisible drag
          strip centered on the vertical seam on md:. */}
      <div
        data-testid="seam"
        role="separator"
        tabIndex={0}
        aria-orientation={stacked ? "horizontal" : "vertical"}
        aria-valuenow={Math.round(split)}
        aria-valuemin={SPLIT_MIN}
        aria-valuemax={SPLIT_MAX}
        aria-label="Resize panes"
        title="Drag to resize · double-click to reset"
        onPointerDown={(event) => {
          // A pointerdown on the floating switch is the button's gesture.
          // Capturing it here would retarget the click to the seam and the
          // switch would never fire in a real browser.
          if (event.target instanceof Element && event.target.closest("button")) {
            return;
          }
          event.preventDefault();
          // jsdom lacks setPointerCapture; the window listeners below make
          // capture redundant for pointer-move tracking anyway.
          event.currentTarget.setPointerCapture?.(event.pointerId);
          setDragging(true);
        }}
        onPointerUp={() => setDragging(false)}
        onDoubleClick={() => onSplitChange(SPLIT_RESET)}
        onKeyDown={onKeyDown}
        style={{ "--split": `${split}%`, touchAction: "none" } as CSSProperties}
        className={cn(
          // Stacked (<md): in-flow horizontal bar between the two panes so the
          // direction switch never floats over table rows or pane headers.
          "relative z-10 flex h-9 flex-shrink-0 items-center justify-center border-b border-border bg-muted/20 cursor-row-resize",
          // Side-by-side (md:): a zero-width vertical strip down the full height.
          "md:absolute md:top-0 md:right-auto md:bottom-0 md:left-[var(--split)] md:h-auto md:w-0 md:border-b-0 md:bg-transparent md:cursor-col-resize"
        )}
      >
        {/* 12px invisible hit area so the 1px seam is grabbable */}
        <div
          className={cn(
            "absolute",
            // Stacked: covers the full in-flow seam bar.
            "inset-0",
            // Side-by-side: 12px wide, centered on the zero-width strip.
            "md:inset-auto md:top-0 md:right-auto md:bottom-0 md:-left-1.5 md:h-auto md:w-3"
          )}
        />
        {children ? (
          <div className="relative z-10 md:absolute md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2">
            {children}
          </div>
        ) : null}
      </div>

      <div
        data-testid="pane-right"
        className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-panel max-md:min-h-[240px]"
      >
        {right}
      </div>
    </div>
  );
}
