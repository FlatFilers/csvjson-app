import { Moon, Sun } from "lucide-react";
import type { ReactNode } from "react";
import type { Theme } from "@/lib/theme";
function ThemeIcon({ theme }: { theme: Theme }) {
  // Sun in dark mode (click to go light), moon in light mode.
  // Same 15px rendered size and stroke the hand-rolled SVGs used.
  if (theme === "dark") {
    return <Sun size={15} strokeWidth={2} aria-hidden="true" />;
  }
  return <Moon size={15} strokeWidth={2} aria-hidden="true" />;
}

type TopBarProps = {
  theme: Theme;
  onToggleTheme: () => void;
  /**
   * Extension point between the wordmark and the theme toggle (kept
   * intentionally empty for v1 — the promo was cut before launch).
   */
  slot?: ReactNode;
};

/**
 * Top bar: wordmark, extension slot, and the persisted dark/light toggle.
 */
export function TopBar({ theme, onToggleTheme, slot }: TopBarProps) {
  return (
    <header
      data-testid="topbar"
      // Positioning context for small-screen popouts: the slot widgets go
      // static on mobile, so their panels anchor to this header and can
      // span the viewport instead of overflowing off their button.
      className="relative flex h-14 flex-shrink-0 items-center gap-3 border-b border-border bg-panel px-5"
    >
      <div className="flex items-baseline gap-2">
        <span className="text-[15px] font-semibold tracking-tight text-foreground whitespace-nowrap">
          csvjson
        </span>
        <span className="hidden text-[13px] font-medium text-muted-foreground sm:inline">
          CSV → JSON converter
        </span>
      </div>
      <div className="flex-1" />
      <div data-testid="topbar-slot">{slot}</div>
      <button
        type="button"
        data-testid="theme-toggle"
        onClick={onToggleTheme}
        aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        className="inline-flex size-8 cursor-pointer items-center justify-center rounded-lg border border-border bg-panel text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <ThemeIcon theme={theme} />
      </button>
    </header>
  );
}
