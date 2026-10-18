import type { ConverterOptions, Direction } from "@/lib/convert";
import { UPLOAD_ENCODINGS, type UploadEncoding } from "@/lib/files";
import { ChevronDown } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useMediaQuery } from "@/hooks/useMediaQuery";
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
 * Group divider between the footer's option clusters (v0 port). Hidden below
 * the fit threshold: the drop-up panel wraps, and a rule dangling at a line
 * break reads as a stray mark. `fit` is the measured threshold in index.css.
 */
function Divider() {
  return <div className="hidden h-5 w-px shrink-0 bg-border fit:block" aria-hidden="true" />;
}

function summarizeActiveOptions(
  direction: Direction,
  options: ConverterOptions
): string {
  const sepLabel =
    options.separator === "auto"
      ? "Auto"
      : (SEPARATOR_OPTIONS.find((o) => o.value === options.separator)?.label ??
        "Auto");
  const parts: string[] = [sepLabel];
  if (direction === "csv2json") {
    if (options.parseNumbers) parts.push("Parse numbers");
    if (options.parseJSON) parts.push("Parse JSON");
    if (options.emptyFields === "skip") parts.push("Skip empty");
    if (options.nullLiterals === "null") parts.push("NULL→null");
    if (options.transpose) parts.push("Transpose");
    if (options.hash) parts.push("Hash");
    if (options.minify) parts.push("Minify");
  } else if (options.flatten) {
    parts.push("Flatten");
  }
  return parts.join(" · ");
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
 * The button is the control (role="switch", aria-checked) and doubles as a
 * 24px-tall hit area around the 18px pill (WCAG 2.5.8 target size); the
 * hint text is rendered into the DOM at load (hidden) and the click only
 * toggles visibility — never mounted-on-click (spec: Option hints, SEO
 * initial-DOM rule). Same state and onChange contract as the checkbox it
 * replaces.
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
          className="flex h-6 shrink-0 cursor-pointer items-center rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <span
            className={cn(
              "relative inline-flex h-[18px] w-8 items-center rounded-full border transition-colors",
              checked ? "border-primary bg-primary" : "border-border bg-muted"
            )}
          >
            <span
              className={cn(
                "pointer-events-none inline-block size-3 rounded-full bg-background shadow-sm transition-transform",
                checked ? "translate-x-[15px]" : "translate-x-[2px]"
              )}
            />
          </span>
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
 *
 * Fit rule (spec: parse settings menu, art_kW2qUlGL): below the width where
 * the full control set fits on one line — the measured `fit` breakpoint in
 * index.css (98.5rem = 1576px; the widest set, csv→json with encoding, needs
 * ~1507px plus a scrollbar's gutter) — the bar collapses to a single
 * "Parse settings" line (trigger, live summary, large-file notice) with the
 * full control set in a drop-up panel above the trigger. At the threshold
 * and above, the controls render inline as today's unwrapped row. Both presentations keep every
 * control and hint in the DOM at load (SEO initial-DOM rule); the notice
 * always sits on the visible row, never inside the menu.
 */
export function OptionsRow({
  direction,
  options,
  onChange,
  notice,
  uploadEncoding,
  onUploadEncodingChange,
}: OptionsRowProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  // One breakpoint for both directions (locked decision): the widest set —
  // csv→json with encoding — is what stops fitting, so it sets the threshold.
  // `fit` is defined in index.css (98.5rem = 1576px, measured); media
  // queries can't read CSS vars, so the value is mirrored here.
  const expanded = useMediaQuery("(min-width: 98.5rem)");
  const csvToJson = direction === "csv2json";
  const summary = summarizeActiveOptions(direction, options);

  /** Close the drop-up and return focus to the trigger (every dismissal path). */
  const closeMenu = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  // While open: Escape dismisses and a click outside the whole bar closes
  // the same way. Click (not mousedown) per the jsdom/user-event contract
  // the tests rely on; the trigger re-click is handled by the button itself
  // (the document listener ignores clicks inside the container, so the two
  // paths never double-fire).
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMenu();
    };
    const onClick = (event: MouseEvent) => {
      const container = containerRef.current;
      if (container === null || !(event.target instanceof Node)) return;
      if (!container.contains(event.target)) closeMenu();
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("click", onClick);
    };
  }, [open, closeMenu]);

  const controls = (
    <>
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
    </>
  );

  if (expanded) {
    // At the fit threshold and above: today's single unwrapped row.
    return (
      <div
        data-testid="options-row"
        className="flex flex-shrink-0 flex-row items-center gap-5 border-t border-border bg-panel px-5 py-2.5 text-[13px] text-muted-foreground"
      >
        <div
          data-testid="options-settings-menu"
          role="group"
          aria-label="Parse settings"
          className="flex flex-1 flex-wrap items-center gap-x-4 gap-y-2.5"
        >
          {controls}
          {notice ? (
            <>
              <div className="flex-1" />
              <span data-testid="options-notice">{notice}</span>
            </>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div
      data-testid="options-row"
      ref={containerRef}
      className="relative flex flex-shrink-0 flex-col border-t border-border bg-panel px-3.5 py-2 text-[13px] text-muted-foreground md:px-4"
    >
      {/* Collapsed row: one line, always — trigger, live summary, notice. */}
      <div className="flex w-full items-center gap-2">
        <button
          type="button"
          ref={triggerRef}
          data-testid="options-settings-toggle"
          aria-expanded={open}
          aria-haspopup="true"
          onClick={() => (open ? closeMenu() : setOpen(true))}
          className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-md py-0.5 text-[13px] font-medium text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          Parse settings
          <ChevronDown
            aria-hidden="true"
            className={cn(
              "size-3.5 shrink-0 transition-transform",
              open && "rotate-180"
            )}
          />
        </button>
        <span
          data-testid="options-settings-summary"
          className="min-w-0 truncate"
        >
          {summary}
        </span>
        {notice ? (
          <span
            data-testid="options-notice"
            className="ml-auto shrink-0 text-right"
          >
            {notice}
          </span>
        ) : null}
      </div>

      {/* Drop-up panel: anchored above the trigger, overlaying the panes —
          no layout shift, unlike the accordion it replaces. Content mounts
          at load, hidden until opened (SEO initial-DOM rule). */}
      <div
        data-testid="options-settings-menu"
        role="group"
        aria-label="Parse settings"
        hidden={!open}
        className={cn(
          "absolute bottom-full left-0 z-50 mb-2 w-full items-center gap-x-4 gap-y-2.5 rounded-md border border-border bg-panel p-3 shadow-md",
          open ? "flex flex-wrap" : "hidden"
        )}
      >
        {controls}
      </div>
    </div>
  );
}
