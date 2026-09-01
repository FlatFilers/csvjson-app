import { useEffect, useMemo, useState } from "react";
import { trackPermalinkView } from "@/analytics/analytics";
import { DividerSwitch } from "@/components/DividerSwitch";
import { Faq } from "@/components/Faq";
import { FeedbackBanner } from "@/components/FeedbackBanner";
import { InputPane } from "@/components/InputPane";
import { OptionsRow } from "@/components/OptionsRow";
import { OutputPane } from "@/components/OutputPane";
import { PermalinkNotice } from "@/components/PermalinkNotice";
import { SplitPane, type SplitLayout } from "@/components/SplitPane";
import { TopBar } from "@/components/TopBar";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useLegacyPermalink } from "@/hooks/useLegacyPermalink";
import {
  convertText,
  DEFAULT_OPTIONS,
  type ConverterOptions,
  type Direction,
} from "@/lib/convert";
import { copyText } from "@/lib/clipboard";
import { downloadText } from "@/lib/download";
import { isTextFile } from "@/lib/files";
import { SAMPLE_CSV, SAMPLE_JSON } from "@/lib/samples";
import { initialTheme, persistTheme } from "@/lib/theme";
import { parsePermalinkPath } from "@/lib/permalink";

/** Past this size, live conversion stretches its debounce (spec: Throttled). */
const LARGE_INPUT_CHARS = 2 * 1024 * 1024;
const DEBOUNCE_MS = 150;
const LARGE_INPUT_DEBOUNCE_MS = 1000;

function metaLabel(rows: number, cols: number): string | null {
  if (rows === 0) return null;
  return cols > 0 ? `${rows} rows · ${cols} cols` : `${rows} rows`;
}

export default function App() {
  const [theme, setTheme] = useState(initialTheme);
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
  // Upload bookkeeping: source filename, reader spinner, rejection notice.
  const [filename, setFilename] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const desktop = useMediaQuery("(min-width: 768px)");
  const layout: SplitLayout = desktop ? "side-by-side" : "stacked";

  const csvToJson = direction === "csv2json";
  const inputFormat = csvToJson ? "CSV" : "JSON";
  const outputFormat = csvToJson ? "JSON" : "CSV";

  const inputEmpty = input.trim() === "";
  const debounceMs =
    input.length > LARGE_INPUT_CHARS ? LARGE_INPUT_DEBOUNCE_MS : DEBOUNCE_MS;
  const debouncedInput = useDebouncedValue(input, inputEmpty ? 0 : debounceMs);


  // Legacy permalinks: /<tool>/<32-hex-id> hydrates the converter from the
  // S3 object, read-only. The URL is never rewritten; edits behave normally
  // afterward (spec: Old share links keep resolving — read-only).
  const permalinkPath = useMemo(
    // SSR/prerender has no window — the permalink path only exists in the
    // browser, so the shell renders the default converter state (same
    // typeof-window guard as initialTheme and useMediaQuery).
    () =>
      typeof window === "undefined"
        ? null
        : parsePermalinkPath(window.location.pathname),
    []
  );
  const permalink = useLegacyPermalink(permalinkPath);

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
  // Hydration applies exactly once per fetch, like a paste: direction,
  // input text, and the saved option values merged over the defaults.
  const hydratedState = permalink.hydrated;
  useEffect(() => {
    if (hydratedState === null) return;
    setDirection(hydratedState.direction);
    setInput(hydratedState.input);
    setOptions((current) => ({ ...current, ...hydratedState.options }));
    // The mount pageview already carried the permalink URL, so hydration
    // fires a distinct event — never a second pageview.
    trackPermalinkView();
  }, [hydratedState]);

  // FileReader upload — files never touch the network (spec: Input; the
  // legacy /upload endpoint is deleted).
  const readFile = (file: File) => {
    if (!isTextFile(file)) {
      setNotice(
        `Can't read "${file.name}" as text — drop a ${csvToJson ? ".csv / .tsv" : ".json"} file.`
      );
      return;
    }
    setNotice(null);
    setReading(true);
    const reader = new FileReader();
    reader.onload = () => {
      setInput(String(reader.result ?? ""));
      setFilename(file.name);
      setReading(false);
    };
    reader.onerror = () => {
      setReading(false);
      setNotice(`Couldn't read "${file.name}".`);
    };
    reader.readAsText(file);
  };

  const meta = result.ok ? metaLabel(result.rows, result.cols) : null;
  const largeInput = input.length > LARGE_INPUT_CHARS;

  const copyInput = () => void copyText(input);
  const copyOutput = () => {
    if (lastValidOutput) void copyText(lastValidOutput);
  };
  const downloadInput = () =>
    downloadText(input, filename ?? (csvToJson ? "data.csv" : "data.json"), {
      mime: csvToJson ? "text/csv" : "application/json",
      bom: csvToJson,
    });
  // CSV downloads carry a UTF-8 BOM (spec: Download); JSON never does.
  const downloadOutput = () =>
    downloadText(lastValidOutput ?? "", csvToJson ? "data.json" : "data.csv", {
      mime: csvToJson ? "application/json" : "text/csv",
      bom: !csvToJson,
    });

  const leftPane = (
    <InputPane
      format={inputFormat}
      input={input}
      onInputChange={(value) => {
        setNotice(null);
        setInput(value);
      }}
      onFile={readFile}
      onTryExample={() => {
        setNotice(null);
        setInput(csvToJson ? SAMPLE_CSV : SAMPLE_JSON);
      }}
      onClear={() => {
        setInput("");
        setFilename(null);
      }}
      onCopy={copyInput}
      onDownload={downloadInput}
      filename={filename}
      reading={reading}
      meta={meta}
      error={null}
      notice={notice}
      delimiter={options.separator === "auto" ? undefined : options.separator}
      dark={theme === "dark"}
    />
  );

  const rightPane = (
    <OutputPane
      format={outputFormat}
      inputEmpty={inputEmpty}
      outputText={lastValidOutput}
      error={result.ok ? null : result.error}
      meta={meta}
      dark={theme === "dark"}
      onCopy={copyOutput}
      onDownload={downloadOutput}
    />
  );

  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground">
      {/* The one H1 the page ships (spec: SEO on-page targets) — quiet, so
          the tool itself stays the interface. */}
      <h1 className="sr-only">CSV to JSON and JSON to CSV converter</h1>
      {/* The converter keeps a full viewport; the FAQ accordion sits below
          the fold (spec: SEO — collapsed FAQ below the tool). */}
      <div className="flex h-svh min-h-0 flex-col">
        {/* Launch-week banner sits above the TopBar inside the h-svh column,
            so the flex panes absorb its height instead of overflowing. */}
        <FeedbackBanner />
        <TopBar theme={theme} onToggleTheme={toggleTheme} />
      {permalinkPath &&
      (permalink.phase === "loading" ||
        permalink.phase === "not-found" ||
        permalink.phase === "unsupported" ||
        permalink.phase === "error") ? (
        <PermalinkNotice
          phase={permalink.phase}
          message={permalink.phase === "error" ? permalink.message : undefined}
          onRetry={permalink.retry}
        />
      ) : null}
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
          notice={largeInput ? "Large file — converting on pause" : null}
      />
      </div>
      <Faq />
    </div>
  );
}
