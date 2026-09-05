import type { ConverterOptions, Direction } from "@/lib/convert";
import { UPLOAD_ENCODINGS, type UploadEncoding } from "@/lib/files";
import { useId, useState } from "react";
import { cn } from "@/lib/utils";

type OptionsRowProps = {
  direction: Direction;
  options: ConverterOptions;
  onChange: (patch: Partial<ConverterOptions>) => void;
  /** Quiet hint ("Large file — converting on pause"), distinct from errors. */
  notice?: string | null;
  /** Upload decode label (spec B7 — issue #106); omit to hide the select. */
  uploadEncoding?: UploadEncoding;
  onUploadEncodingChange?: (encoding: UploadEncoding) => void;
};

const SEPARATOR_OPTIONS: Array<{ value: ConverterOptions["separator"]; label: string }> = [
  { value: "auto", label: "Auto-detect" },
  { value: ",", label: "Comma" },
  { value: ";", label: "Semicolon" },
  { value: "\t", label: "Tab" },
  { value: "|", label: "Pipe" },
];

/**
 * Group divider between the footer's option clusters (v0 port).
 */
function Divider() {
  return <div className="h-5 w-px shrink-0 bg-border" aria-hidden="true" />;
}

/** v0's MiniSelect: unstyled native select with an overlaid chevron. */
function selectClass() {
  return "h-7 cursor-pointer appearance-none rounded-md border border-border bg-background py-0 pl-2.5 pr-6 text-[13px] font-medium text-foreground transition-colors outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50";
}

function Chevron() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className="pointer-events-none absolute top-1/2 right-1.5 size-3.5 -translate-y-1/2 text-muted-foreground"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path d="m4 6 4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** v0's eyebrow label for an option group. */
function GroupLabel({ children }: { children: string }) {
  return (
    <span className="font-mono text-[11px] font-semibold tracking-[0.14em] whitespace-nowrap text-muted-foreground/70 uppercase">
      {children}
    </span>
  );
}

/**
 * One boolean option rendered as v0's Switch pill with its optional i-hint.
 * The pill is the control (role="switch", aria-checked); the hint text is
 * rendered into the DOM at load (hidden) and the click only toggles
 * visibility — never mounted-on-click (spec: Option hints, SEO initial-DOM
 * rule). Same state and onChange contract as the checkbox it replaces.
 */
function ToggleOption({
  label,
  checked,
  onChange,
  hint,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  hint?: string;
}) {
  return (
    <span className="inline-flex items-center gap-1">
      <label className="flex cursor-pointer items-center gap-2 whitespace-nowrap text-[13px] text-muted-foreground transition-colors hover:text-foreground">
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          aria-label={label}
          onClick={() => onChange(!checked)}
          className={cn(
            "relative inline-flex h-[18px] w-8 shrink-0 cursor-pointer items-center rounded-full border transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
            checked ? "border-primary bg-primary" : "border-border bg-muted"
          )}
        >
          <span
            className={cn(
              "pointer-events-none inline-block size-3 rounded-full bg-background shadow-sm transition-transform",
              checked ? "translate-x-[15px]" : "translate-x-[2px]"
            )}
          />
        </button>
        <span className="select-none">{label}</span>
      </label>
      {hint ? <OptionHint text={hint} /> : null}
    </span>
  );
}

function OptionHint({ text }: { text: string }) {
  const hintId = useId();
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-flex items-center">
      <button
        type="button"
        aria-label="What does this option do?"
        aria-expanded={open}
        aria-describedby={hintId}
        title="What does this option do?"
        onClick={() => setOpen((current) => !current)}
        className="flex h-4 w-4 cursor-pointer items-center justify-center rounded-full border border-border text-[9px] font-semibold leading-none text-muted-foreground hover:text-foreground"
      >
        i
      </button>
      <span
        data-hint
        id={hintId}
        hidden={!open}
        className="ml-1 text-muted-foreground"
      >
        {text}
      </span>
    </span>
  );
}

/**
 * Bottom options bar, direction-conditional: CSV → JSON shows separator,
 * parse numbers, parse JSON, skip empty fields, NULL as null, transpose,
 * hash output, minify; JSON → CSV shows separator and flatten (minify does
 * not apply to CSV output).
 */
export function OptionsRow({
  direction,
  options,
  onChange,
  notice,
  uploadEncoding,
  onUploadEncodingChange,
}: OptionsRowProps) {
  const csvToJson = direction === "csv2json";
  return (
    <div
      data-testid="options-row"
      className="flex flex-shrink-0 flex-wrap items-center gap-5 border-t border-border bg-panel px-5 py-2.5 text-[13px] text-muted-foreground"
    >
      <span className="inline-flex items-center gap-2">
        <label className="flex items-center gap-2">
          <GroupLabel>Separator</GroupLabel>
          <span className="relative inline-flex">
            <select
              data-testid="opt-separator"
              value={options.separator}
              onChange={(event) =>
                onChange({ separator: event.target.value as ConverterOptions["separator"] })
              }
              className={selectClass()}
            >
              {SEPARATOR_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <Chevron />
          </span>
        </label>
        <OptionHint text="Auto-detect is conservative — it only picks comma, semicolon, or tab. Pipe never auto-detects because normal prose is full of pipes, so pipe-separated text must be selected explicitly." />
      </span>

      {uploadEncoding && onUploadEncodingChange ? (
        <>
          <Divider />
          <span className="inline-flex items-center gap-2">
            <label className="flex items-center gap-2">
              <GroupLabel>Encoding</GroupLabel>
              <span className="relative inline-flex">
                <select
                  data-testid="opt-encoding"
                  value={uploadEncoding}
                  onChange={(event) =>
                    onUploadEncodingChange(event.target.value as UploadEncoding)
                  }
                  className={selectClass()}
                >
                  {UPLOAD_ENCODINGS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <Chevron />
              </span>
            </label>
            <OptionHint text="Applies to file uploads and drops only — pasted or typed text is always read as UTF-8. Switch to Windows-1252 for CSVs saved by legacy Excel to fix mangled accents like ü and ö." />
          </span>
        </>
      ) : null}

      <Divider />
      {csvToJson ? (
        <>
          <ToggleOption
            label="Parse numbers"
            checked={options.parseNumbers}
            onChange={(parseNumbers) => onChange({ parseNumbers })}
            hint="On by default — plain numbers like 5 or 19.99 become real JSON numbers; leading-zero values like 00721 and very long IDs stay strings. Uncheck to keep numeric cells as strings — booleans, null, and containers still convert while Parse JSON is on."
          />
          <ToggleOption
            label="Parse JSON"
            checked={options.parseJSON}
            onChange={(parseJSON) => onChange({ parseJSON })}
            hint="Turns null, true, false, [] and {} into real JSON values instead of strings."
          />
          <ToggleOption
            label="Skip empty fields"
            checked={options.emptyFields === "skip"}
            onChange={(skip) => onChange({ emptyFields: skip ? "skip" : "keep" })}
            hint={
              'Empty cells are dropped from the output instead of becoming "" — a column that is empty in every row disappears from the output and the counts.'
            }
          />
          <ToggleOption
            label="NULL as null"
            checked={options.nullLiterals === "null"}
            onChange={(asNull) =>
              onChange({ nullLiterals: asNull ? "null" : "string" })
            }
            hint={
              'The string NULL becomes JSON null. Matching is exact and case-sensitive — SQL exports write uppercase NULL; Null and nULL are untouched, and lowercase null already converts when Parse JSON is on.'
            }
          />
          <ToggleOption
            label="Transpose"
            checked={options.transpose}
            onChange={(transpose) => onChange({ transpose })}
            hint="Flip rows and columns — the first column becomes the header row."
          />
          <ToggleOption
            label="Hash output"
            checked={options.hash}
            onChange={(hash) => onChange({ hash })}
            hint="The first column becomes the object key instead of a field."
          />
          <ToggleOption
            label="Minify"
            checked={options.minify}
            onChange={(minify) => onChange({ minify })}
            hint="Remove indentation from the JSON output. Data is untouched."
          />
        </>
      ) : (
        <ToggleOption
          label="Flatten nested arrays"
          checked={options.flatten}
          onChange={(flatten) => onChange({ flatten })}
          hint="Explode nested arrays into extra rows with dotted keys — needed when the JSON isn't a flat table."
        />
      )}

      <div className="flex-1" />
      {notice ? (
        <span data-testid="options-notice" className="text-muted-foreground">
          {notice}
        </span>
      ) : null}
    </div>
  );
}
