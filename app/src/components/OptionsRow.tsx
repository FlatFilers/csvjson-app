import type { ConverterOptions, Direction } from "@/lib/convert";
import { useId, useState } from "react";

type OptionsRowProps = {
  direction: Direction;
  options: ConverterOptions;
  onChange: (patch: Partial<ConverterOptions>) => void;
  /** e.g. "6 rows · 3 cols" — shown right-aligned. */
  meta?: string | null;
  /** Quiet hint ("Large file — converting on pause"), distinct from errors. */
  notice?: string | null;
};

const SEPARATOR_OPTIONS: Array<{ value: ConverterOptions["separator"]; label: string }> = [
  { value: "auto", label: "Auto-detect" },
  { value: ",", label: "Comma" },
  { value: ";", label: "Semicolon" },
  { value: "\t", label: "Tab" },
];

/**
 * One checkbox option with its optional i-hint. The hint text is rendered
 * into the DOM at load (hidden) and the click only toggles visibility —
 * never mounted-on-click (spec: Option hints, SEO initial-DOM rule).
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
    <span className="inline-flex items-center">
      <label className="flex cursor-pointer items-center gap-1.5 text-foreground">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          className="h-3.5 w-3.5 accent-primary"
        />
        {label}
      </label>
      {hint ? <OptionHint text={hint} /> : null}
    </span>
  );
}

function OptionHint({ text }: { text: string }) {
  const hintId = useId();
  const [open, setOpen] = useState(false);
  return (
    <span className="relative ml-1 inline-flex items-center">
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
        className="ml-1.5 text-muted-foreground"
      >
        {text}
      </span>
    </span>
  );
}

/**
 * Bottom options bar, direction-conditional: CSV → JSON shows separator,
 * parse numbers, parse JSON, transpose, hash output, minify; JSON → CSV
 * shows separator and flatten (minify does not apply to CSV output).
 */
export function OptionsRow({
  direction,
  options,
  onChange,
  meta,
  notice,
}: OptionsRowProps) {
  const csvToJson = direction === "csv2json";
  return (
    <div
      data-testid="options-row"
      className="flex flex-shrink-0 flex-wrap items-center gap-4 border-t border-border bg-panel px-4 py-2 text-[12.5px] text-muted-foreground"
    >
      <label className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
        Separator
        <select
          data-testid="opt-separator"
          value={options.separator}
          onChange={(event) =>
            onChange({ separator: event.target.value as ConverterOptions["separator"] })
          }
          className="cursor-pointer rounded border border-border bg-panel px-1.5 py-0.5 text-xs text-foreground"
        >
          {SEPARATOR_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      {csvToJson ? (
        <>
          <ToggleOption
            label="Parse numbers"
            checked={options.parseNumbers}
            onChange={(parseNumbers) => onChange({ parseNumbers })}
            hint="Off by default — it turns 00721 into 7. Enable to convert plain numeric cells to real numbers."
          />
          <ToggleOption
            label="Parse JSON"
            checked={options.parseJSON}
            onChange={(parseJSON) => onChange({ parseJSON })}
            hint="Turns null, true, false, [] and {} into real JSON values instead of strings."
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
      {meta ? (
        <span data-testid="options-meta" className="text-muted-foreground">
          {meta}
        </span>
      ) : null}
    </div>
  );
}
