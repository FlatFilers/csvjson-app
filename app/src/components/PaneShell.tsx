import type { ReactNode } from "react";

type PaneStatus = {
  kind: "error" | "notice";
  message: string;
  /** Optional inline action (the edited-output freeze notice's discard). */
  action?: ReactNode;
} | null;

type PaneShellProps = {
  title: string;
  /** Header hint: row/col counts, byte size, filename, or a reader spinner. */
  meta?: ReactNode;
  actions?: ReactNode;
  status?: PaneStatus;
  children: ReactNode;
};

/**
 * Full-bleed pane chrome: slim header, content fills the rest (no card).
 * The status line keeps inline errors under the content without displacing
 * the last valid output (spec: States → Invalid input).
 */
export function PaneShell({ title, meta, actions, status, children }: PaneShellProps) {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      {/* Wrap-and-tighten (spec: mobile toolbar compaction): the input
          pane's five controls reflow into tidy rows below the md:
          breakpoint instead of overflowing; counts stay attached to the
          title group and output exports stay visible without scrolling.
          Desktop (md+) is v0's fixed h-12 header; mobile keeps the
          min-height so wrapped rows can grow. */}
      <div className="flex min-h-[42px] flex-shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border px-3 py-2 pl-5 max-md:gap-2 md:h-12 md:py-0">
        <div className="flex items-center gap-3">
          <span className="font-mono text-[11px] font-semibold tracking-[0.18em] text-muted-foreground">
            {title}
          </span>
          {meta ? (
            <span
              data-testid="pane-meta"
              className="text-xs tabular-nums text-muted-foreground/70"
            >
              {meta}
            </span>
          ) : null}
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-0.5 max-md:gap-1">
          {actions}
        </div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      {status ? (
        <div
          data-testid="pane-status"
          className={
            status.kind === "error"
              ? "flex-shrink-0 px-3.5 pb-2 text-xs text-destructive"
              : "flex-shrink-0 whitespace-pre-line px-3.5 pb-2 text-xs text-muted-foreground"
          }
          role="status"
        >
          {status.message}
          {status.action}
        </div>
      ) : null}
    </div>
  );
}
