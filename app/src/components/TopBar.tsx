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
};

/**
 * Top bar: wordmark, chat-promo slot (empty — the promo is a sibling task),
 * and the persisted dark/light toggle.
 */
export function TopBar({ theme, onToggleTheme }: TopBarProps) {
  return (
    <header
      data-testid="topbar"
      className="flex flex-shrink-0 items-center gap-3 border-b border-border bg-panel px-4 py-2.5"
    >
      <span className="text-base font-bold tracking-[-0.02em] whitespace-nowrap">
        csvjson
        <span className="font-medium text-muted-foreground/70">.com</span>
      </span>
      <div className="flex-1" />
      {/* Reserved slot for the sibling chat-promo task — intentionally empty. */}
      <div data-testid="chat-promo-slot" />
      <button
        type="button"
        data-testid="theme-toggle"
        onClick={onToggleTheme}
        aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-border bg-panel text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <ThemeIcon theme={theme} />
      </button>
    </header>
  );
}
