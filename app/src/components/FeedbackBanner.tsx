/**
 * Launch-week announcement banner (spec: full-width, above the TopBar,
 * non-dismissible — the team removes it after launch week).
 *
 * It renders as the first child of the converter's h-svh flex column, so the
 * flex layout absorbs its height instead of pushing the panes off-screen.
 */
export const FEEDBACK_DISCUSSION_URL =
  "https://github.com/FlatFilers/csvjson-app/discussions/163";

export function FeedbackBanner() {
  return (
    <div
      data-testid="feedback-banner"
      className="flex flex-shrink-0 items-center justify-center border-b border-border bg-muted px-4 py-1.5 text-sm text-muted-foreground"
    >
      <p className="truncate">
        Enjoy a cleaner, simpler CSVJSON.{" "}
        <a
          data-testid="feedback-link"
          href={FEEDBACK_DISCUSSION_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-sm font-medium text-foreground underline decoration-border underline-offset-2 transition-colors hover:decoration-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          Leave feedback or ask for features here
        </a>
        .
      </p>
    </div>
  );
}
