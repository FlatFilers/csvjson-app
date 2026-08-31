/**
 * Inline permalink states (spec: never a blank page). The converter stays
 * mounted underneath in every state — the notice is an inline banner, not
 * a route replacement.
 */
type PermalinkNoticeProps = {
  phase: "loading" | "not-found" | "unsupported" | "error";
  message?: string;
  onRetry: () => void;
};

export function PermalinkNotice({
  phase,
  message,
  onRetry,
}: PermalinkNoticeProps) {
  if (phase === "loading") {
    return (
      <div
        role="status"
        aria-busy="true"
        data-testid="permalink-loading"
        className="mx-4 mt-3 rounded-md border border-border bg-muted px-4 py-2 text-sm text-muted-foreground"
      >
        Loading shared data…
      </div>
    );
  }
  if (phase === "not-found") {
    return (
      <div
        role="alert"
        data-testid="permalink-notice"
        className="mx-4 mt-3 flex flex-wrap items-center gap-x-2 rounded-md border border-border bg-muted px-4 py-2 text-sm text-foreground"
      >
        <span>This data doesn't exist (or was deleted).</span>
        <a href="/" className="font-medium underline underline-offset-2">
          Go to the converter
        </a>
      </div>
    );
  }
  if (phase === "unsupported") {
    // The object is live in the bucket but its legacy shape (other tools,
    // Data Janitor sessions) has no converter equivalent — never claim it
    // doesn't exist.
    return (
      <div
        role="alert"
        data-testid="permalink-unsupported"
        className="mx-4 mt-3 flex flex-wrap items-center gap-x-2 rounded-md border border-border bg-muted px-4 py-2 text-sm text-foreground"
      >
        <span>This link's saved data can't be shown in the new converter.</span>
        <a href="/" className="font-medium underline underline-offset-2">
          Go to the converter
        </a>
      </div>
    );
  }
  return (
    <div
      role="alert"
      data-testid="permalink-notice"
      className="mx-4 mt-3 flex flex-wrap items-center gap-x-3 rounded-md border border-border bg-muted px-4 py-2 text-sm text-foreground"
    >
      <span>{message || "Couldn't load this data."}</span>
      <button
        type="button"
        data-testid="permalink-retry"
        onClick={onRetry}
        className="rounded-md border border-border bg-background px-2 py-1 text-sm font-medium hover:bg-accent"
      >
        Retry
      </button>
    </div>
  );
}
