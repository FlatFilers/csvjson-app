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
 * "stacked": below 768px the panes stack vertically and the seam becomes a
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
  // and aria-orientation. The md: breakpoint (768px) must stay in sync with
  // App.tsx's useMediaQuery("(min-width: 768px)").
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
          "flex min-h-0 min-w-0 flex-col border-border bg-panel",
          // Stacked: --split sizes the pane's height; side-by-side: its width.
          "h-[var(--split)] border-b",
          "md:h-auto md:w-[var(--split)] md:border-b-0 md:border-r"
        )}
      >
        {left}
      </div>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-panel">{right}</div>

      {/* Invisible drag strip centered on the seam; the switch floats on it. */}
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
          "absolute z-10",
          // Stacked: a zero-height horizontal strip across the full width.
          "top-[var(--split)] left-0 right-0 h-0 cursor-row-resize",
          // Side-by-side: a zero-width vertical strip down the full height.
          "md:top-0 md:right-auto md:bottom-0 md:left-[var(--split)] md:h-auto md:w-0 md:cursor-col-resize"
        )}
      >
        {/* 12px invisible hit area so the 1px seam is grabbable */}
        <div
          className={cn(
            "absolute",
            // Stacked: 12px tall, centered on the zero-height strip.
            "left-0 right-0 -top-1.5 h-3",
            // Side-by-side: 12px wide, centered on the zero-width strip.
            "md:top-0 md:right-auto md:bottom-0 md:-left-1.5 md:h-auto md:w-3"
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
