import type { ReactNode } from "react";
import type { Theme } from "@/lib/theme";
function ThemeIcon({ theme }: { theme: Theme }) {
  // Sun in dark mode (click to go light), moon in light mode.
  if (theme === "dark") {
    return (
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2" />
        <path d="M12 20v2" />
        <path d="m4.93 4.93 1.41 1.41" />
        <path d="m17.66 17.66 1.41 1.41" />
        <path d="M2 12h2" />
        <path d="M20 12h2" />
        <path d="m6.34 17.66-1.41 1.41" />
        <path d="m19.07 4.93-1.41 1.41" />
      </svg>
    );
  }
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  );
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
      className="flex h-14 flex-shrink-0 items-center gap-3 border-b border-border bg-panel px-5"
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
