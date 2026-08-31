import type { ReactNode } from "react";

type PaneStatus = {
  kind: "error" | "notice";
  message: string;
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
      <div className="flex min-h-[42px] flex-shrink-0 items-center justify-between gap-3 border-b border-border px-3.5 py-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
          {title}
        </span>
        <div className="flex items-center gap-2">
          {actions}
          {meta ? (
            <span data-testid="pane-meta" className="text-xs text-muted-foreground">
              {meta}
            </span>
          ) : null}
        </div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      {status ? (
        <div
          data-testid="pane-status"
          className={
            status.kind === "error"
              ? "flex-shrink-0 px-3.5 pb-2 text-xs text-destructive"
              : "flex-shrink-0 px-3.5 pb-2 text-xs text-muted-foreground"
          }
          role="status"
        >
          {status.message}
        </div>
      ) : null}
    </div>
  );
}
