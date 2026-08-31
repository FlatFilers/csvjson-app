/**
 * Empty-state dropzone (spec: States → Empty). Exists only while the input
 * is empty — it is replaced by the data view the moment content arrives.
 * Dashed border, paste/browse affordances, and the sample-dataset link.
 */

type DropzoneProps = {
  format: "CSV" | "JSON";
  onBrowse: () => void;
  onTryExample: () => void;
};

export function Dropzone({ format, onBrowse, onTryExample }: DropzoneProps) {
  return (
    <div
      data-testid="dropzone"
      tabIndex={0}
      aria-label={`Empty input — drag & drop, paste, or browse for a ${format} file`}
      className="m-3 flex flex-1 cursor-pointer flex-col items-center justify-center gap-3 rounded-md border-2 border-dashed border-border p-6 text-center text-muted-foreground transition-colors focus:outline-none focus-visible:border-sky-600 dark:focus-visible:border-sky-400"
    >
      <p className="text-sm text-muted-foreground">
        Drag &amp; drop, paste, or{" "}
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
