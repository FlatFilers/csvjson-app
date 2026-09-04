/**
 * Empty-state dropzone (spec: States → Empty). Exists only while the input
 * is empty — it is replaced by the data view the moment content arrives.
 * Dashed border, paste-anywhere affordance (the shortcut chip teaches that
 * paste works everywhere on the page, not just in a field), browse, and the
 * sample-dataset link.
 */

import { useEffect, useRef } from "react";
import { pasteShortcutFor } from "@/lib/platform";

type DropzoneProps = {
  format: "CSV" | "JSON";
  onBrowse: () => void;
  onTryExample: () => void;
};

export function Dropzone({ format, onBrowse, onTryExample }: DropzoneProps) {
  // Build-time prerender has no navigator — the static HTML ships both
  // shortcuts; the client mount re-renders with the platform's real one.
  const shortcut = pasteShortcutFor(
    typeof navigator === "undefined" ? undefined : navigator
  );
  // Hold focus while empty so keyboard users land in the pane (paste itself
  // works anywhere via the document-level router — spec: paste-anywhere).
  const zoneRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    zoneRef.current?.focus();
  }, []);

  return (
    <div
      ref={zoneRef}
      data-testid="dropzone"
      tabIndex={0}
      role="button"
      onKeyDown={(event) => {
        // Only the container itself activates browse — Enter/Space bubbling
        // from a nested button must keep its native activation.
        if (event.target !== event.currentTarget) return;
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        event.stopPropagation();
        onBrowse();
      }}
      onClick={(event) => {
        event.stopPropagation();
        onBrowse();
      }}
      aria-label={`Empty input — press ${shortcut} to paste anywhere on this page, drag & drop, or browse for a ${format} file`}
      className="m-3 flex flex-1 cursor-pointer flex-col items-center justify-center gap-3 rounded-md border-2 border-dashed border-border p-6 text-center text-muted-foreground transition-colors focus:outline-none focus-visible:border-sky-600 dark:focus-visible:border-sky-400"
    >
      {/* Lead with the behavior (spec: paste-anywhere affordance): the
          shortcut chip teaches that paste works everywhere on the page. */}
      <p className="text-sm text-muted-foreground">
        Press{" "}
        <kbd
          data-testid="paste-shortcut"
          className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[11px] font-medium text-foreground"
        >
          {shortcut}
        </kbd>{" "}
        to paste your data — anywhere on this page
      </p>
      <p className="text-xs text-muted-foreground">
        Drag &amp; drop, or{" "}
        <button
          type="button"
          data-testid="browse"
          onClick={(event) => {
            event.stopPropagation();
            onBrowse();
          }}
          className="cursor-pointer text-sky-700 underline underline-offset-4 hover:opacity-80 dark:text-sky-300"
        >
          browse
        </button>
      </p>
      <button
        type="button"
        data-testid="try-example"
        onClick={(event) => {
          event.stopPropagation();
          onTryExample();
        }}
        className="cursor-pointer text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
      >
        Try an example
      </button>
    </div>
  );
}
