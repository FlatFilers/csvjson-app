/**
 * Shared compact action language (v0 port): quiet 28px ghost chip used by
 * every pane action — copy, clear, upload, download, revert, discard — so
 * the language cannot drift between panes.
 */
export const actionButtonClass =
  "inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-md px-2 text-[13px] font-medium text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-40 [&_svg]:size-3.5";
