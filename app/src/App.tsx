import { useEffect, useMemo, useState } from "react";
import { DividerSwitch } from "@/components/DividerSwitch";
import { OptionsRow } from "@/components/OptionsRow";
import { OutputView } from "@/components/OutputView";
import { PaneShell } from "@/components/PaneShell";
import { SplitPane, type SplitLayout } from "@/components/SplitPane";
import { TopBar } from "@/components/TopBar";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import {
  convertText,
  DEFAULT_OPTIONS,
  type ConverterOptions,
  type Direction,
} from "@/lib/convert";
import { SAMPLE_CSV, SAMPLE_JSON } from "@/lib/samples";
import { initialTheme, persistTheme, type Theme } from "@/lib/theme";

/** Past this size, live conversion stretches its debounce (spec: Throttled). */
const LARGE_INPUT_CHARS = 2 * 1024 * 1024;
const DEBOUNCE_MS = 150;
const LARGE_INPUT_DEBOUNCE_MS = 1000;

function metaLabel(rows: number, cols: number): string | null {
  if (rows === 0) return null;
  return cols > 0 ? `${rows} rows · ${cols} cols` : `${rows} rows`;
}

export default function App() {
  const [theme, setTheme] = useState<Theme>(initialTheme);
  // index.html applies the pre-mount theme (no white flash); React stays the
  // source of truth after hydration.
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);
  // Persist only an explicit choice — an OS-derived theme isn't a preference.
  const toggleTheme = () =>
    setTheme((current) => {
      const next = current === "dark" ? "light" : "dark";
      persistTheme(next);
      return next;
    });

  const [direction, setDirection] = useState<Direction>("csv2json");
  const [input, setInput] = useState("");
  const [options, setOptions] = useState<ConverterOptions>(DEFAULT_OPTIONS);
  const [split, setSplit] = useState(50);

  const desktop = useMediaQuery("(min-width: 768px)");
  const layout: SplitLayout = desktop ? "side-by-side" : "stacked";

  const inputEmpty = input.trim() === "";
  const debounceMs =
    input.length > LARGE_INPUT_CHARS ? LARGE_INPUT_DEBOUNCE_MS : DEBOUNCE_MS;
  const debouncedInput = useDebouncedValue(input, inputEmpty ? 0 : debounceMs);

  const result = useMemo(
    () => convertText(direction, debouncedInput, options),
    [direction, debouncedInput, options]
  );

  // The last valid output survives parse failures (spec: States → Invalid
  // input, Direction flip rule).
  const [lastValidOutput, setLastValidOutput] = useState<string | null>(null);
  useEffect(() => {
    if (debouncedInput.trim() === "") return;
    if (result.ok) setLastValidOutput(result.text);
  }, [result, debouncedInput]);

  const handleFlip = () => {
    setDirection((current) => (current === "csv2json" ? "json2csv" : "csv2json"));
    // Flip rule: the last valid output becomes the new input; an error
    // output leaves the input untouched. Convert the *current* input — the
    // memoized result lags `input` by the debounce window (1 s for large
    // files), so using it here could wipe a freshly typed value.
    if (!inputEmpty) {
      const current = convertText(direction, input, options);
      if (current.ok) setInput(current.text);
    }
  };

  const csvToJson = direction === "csv2json";
  const inputFormat = csvToJson ? "CSV" : "JSON";
  const outputFormat = csvToJson ? "JSON" : "CSV";
  const meta = result.ok ? metaLabel(result.rows, result.cols) : null;
  const largeInput = input.length > LARGE_INPUT_CHARS;

  const leftPane = (
    <PaneShell title={inputFormat} meta={inputEmpty ? null : meta}>
      {/* The editor stays mounted so paste/typing always works; the
          empty-state hint sits above it and yields once input arrives. */}
      <div
        data-testid="input-hint"
        className={inputEmpty ? "flex flex-col items-center justify-center p-6 text-center" : "hidden"}
      >
        <p className="text-sm text-muted-foreground">
          Drag &amp; drop, paste, or browse — {csvToJson ? "CSV / TSV" : "JSON"}{" "}
          <button
            type="button"
            data-testid="try-example"
            onClick={() => setInput(csvToJson ? SAMPLE_CSV : SAMPLE_JSON)}
            className="cursor-pointer text-sky-700 underline underline-offset-4 hover:opacity-80 dark:text-sky-300"
          >
            or try an example
          </button>
        </p>
      </div>
      <textarea
        data-testid="input-editor"
        value={input}
        onChange={(event) => setInput(event.target.value)}
        spellCheck={false}
        placeholder={`Paste ${inputFormat} here…`}
        className="flex-1 resize-none bg-transparent p-3 font-mono text-[12.5px] leading-relaxed focus:outline-none"
      />
    </PaneShell>
  );

  const rightPane = (
    <PaneShell
      title={outputFormat}
      status={result.ok ? null : { kind: "error", message: result.error }}
    >
      {inputEmpty ? (
        <div className="flex flex-1 items-center justify-center p-6 text-sm text-muted-foreground">
          Your {outputFormat} appears here.
        </div>
      ) : lastValidOutput ? (
        <OutputView
          text={lastValidOutput}
          format={outputFormat === "JSON" ? "json" : "csv"}
        />
      ) : null}
    </PaneShell>
  );

  return (
    <div className="flex h-svh flex-col bg-background text-foreground">
      <TopBar theme={theme} onToggleTheme={toggleTheme} />
      <SplitPane
        layout={layout}
        split={split}
        onSplitChange={setSplit}
        left={leftPane}
        right={rightPane}
      >
        <DividerSwitch direction={direction} onFlip={handleFlip} />
      </SplitPane>
      <OptionsRow
        direction={direction}
        options={options}
        onChange={(patch) => setOptions((current) => ({ ...current, ...patch }))}
        meta={meta}
        notice={
          largeInput ? "Large file — conversion pauses briefly while typing" : null
        }
      />
    </div>
  );
}
