import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { trackPermalinkView } from "@/analytics/analytics";
import {
  createConversionTracker,
  trackExport,
  type ConversionTracker,
} from "@/analytics/events";
import { DividerSwitch } from "@/components/DividerSwitch";
import { Faq } from "@/components/Faq";
import { FeedbackBanner } from "@/components/FeedbackBanner";
import { FeedbackVote } from "@/components/FeedbackVote";
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
import { downloadText, outputFilenameFor } from "@/lib/download";
import {
  decodeUpload,
  isTextFile,
  type UploadEncoding,
} from "@/lib/files";
import { isEditablePasteTarget } from "@/lib/paste";
import { SAMPLE_CSV, SAMPLE_JSON } from "@/lib/samples";
import { initialTheme, persistTheme } from "@/lib/theme";
import { parsePermalinkPath } from "@/lib/permalink";

/** Past this size, live conversion stretches its debounce (spec: Throttled). */
const LARGE_INPUT_CHARS = 2 * 1024 * 1024;
const DEBOUNCE_MS = 150;
const LARGE_INPUT_DEBOUNCE_MS = 1000;

/** Quiet period before a settled input counts as a conversion event. */
const CONVERSION_SETTLE_MS = 2000;
/** Never more than one conversion event per window (analytics events spec). */
const CONVERSION_MIN_WINDOW_MS = 2000;

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
  // Upload decode label (spec B7 — issue #106). Upload-scoped: pasted and
  // typed text already arrived as decoded strings, so the select never
  // touches them.
  const [uploadEncoding, setUploadEncoding] = useState<UploadEncoding>("utf-8");

  // Latest converter state for the conversion-event validity predicate —
  // fires happen up to 2s after the last edit (or synchronously for a
  // permalink hydration), so they must read values current at fire time,
  // not at the keystroke. Refreshed after the memoized result below.
  const converterStateRef = useRef({
    direction,
    options,
    input,
    resultOk: true,
  });

  const trackerRef = useRef<ConversionTracker | null>(null);
  if (!trackerRef.current) {
    trackerRef.current = createConversionTracker({
      settleMs: CONVERSION_SETTLE_MS,
      minWindowMs: CONVERSION_MIN_WINDOW_MS,
      isValid: (direction, text) => {
        // Settle fires land ≥2s after the last edit, by which time the
        // memoized result corresponds to exactly this text — trust it
        // instead of paying a second full conversion on the main thread.
        // Discrete fires (upload/drop/permalink) can land before React has
        // rendered the new input, so convert that text directly then.
        const current = converterStateRef.current;
        if (text === current.input) return current.resultOk;
        return convertText(
          direction === "csv_to_json" ? "csv2json" : "json2csv",
          text,
          current.options
        ).ok;
      },
    });
  }
  const tracker = trackerRef.current;

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
  // Fire-time validity reads this; assigned after the memo so it always
  // holds the freshest state (see the tracker's isValid above).
  converterStateRef.current = {
    direction,
    options,
    input,
    resultOk: result.ok,
  };

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
    const hydratedOptions = {
      ...converterStateRef.current.options,
      ...hydratedState.options,
    };
    // The immediate validity check must see the hydrated state, not the
    // pre-hydration values still in the refs (no render has happened yet).
    converterStateRef.current = {
      direction: hydratedState.direction,
      options: hydratedOptions,
      input: hydratedState.input,
      resultOk: convertText(
        hydratedState.direction,
        hydratedState.input,
        hydratedOptions
      ).ok,
    };
    setDirection(hydratedState.direction);
    setInput(hydratedState.input);
    setOptions((current) => ({ ...current, ...hydratedState.options }));
    // The mount pageview already carried the permalink URL, so hydration
    // fires a distinct event — never a second pageview.
    trackPermalinkView();
    // Hydration is also a discrete conversion input (analytics events spec).
    tracker.discrete(
      hydratedState.direction === "csv2json" ? "csv_to_json" : "json_to_csv",
      "permalink",
      hydratedState.input
    );
  }, [hydratedState, tracker]);

  // The upload still feeding the input — file, its ingest source, and the
  // exact text its decode produced. The encoding select re-decodes the held
  // file only while the input still IS that text: the mojibake-recovery
  // flow (upload → mangled accents → switch label → fixed) works without a
  // re-upload, while any edit, paste, flip, or clear quietly disarms it —
  // a later encoding switch must never clobber text that moved on.
  const uploadedRef = useRef<{
    file: File;
    source: "picker" | "drop";
    text: string;
  } | null>(null);

  // Upload decode — files never touch the network (spec: Input; the legacy
  // /upload endpoint is deleted). Bytes are decoded locally under the
  // selected label (spec B7 — issue #106); the utf-8 default is the exact
  // FileReader.readAsText behavior this replaced.
  const readFile = async (file: File, source: "picker" | "drop") => {
    if (!isTextFile(file)) {
      setNotice(
        `Can't read "${file.name}" as text — drop a ${csvToJson ? ".csv / .tsv" : ".json"} file.`
      );
      return;
    }
    setNotice(null);
    setReading(true);
    try {
      const text = await decodeUpload(file, uploadEncoding);
      uploadedRef.current = { file, source, text };
      setInput(text);
      setFilename(file.name);
      setReading(false);
      // A completed upload/drop is a discrete conversion input — fire
      // immediately (the tracker still gates on a valid result + 2s window).
      tracker.discrete(
        csvToJson ? "csv_to_json" : "json_to_csv",
        source === "drop" ? "drag" : "file",
        text
      );
    } catch {
      setReading(false);
      setNotice(`Couldn't read "${file.name}".`);
    }
  };

  const handleUploadEncodingChange = async (encoding: UploadEncoding) => {
    const previous = uploadEncoding;
    setUploadEncoding(encoding);
    const uploaded = uploadedRef.current;
    if (!uploaded || input !== uploaded.text) return;
    setReading(true);
    try {
      const text = await decodeUpload(uploaded.file, encoding);
      uploadedRef.current = { ...uploaded, text };
      setInput(text);
      setReading(false);
      tracker.discrete(
        csvToJson ? "csv_to_json" : "json_to_csv",
        uploaded.source === "drop" ? "drag" : "file",
        text
      );
    } catch {
      setReading(false);
      // The label must name the decode that produced the displayed text:
      // the input still shows the previous decode, so revert the select.
      setUploadEncoding(previous);
      setNotice(`Couldn't read "${uploaded.file.name}".`);
    }
  };

  // Shared input path — every text ingestion (typed, pasted in-pane, or
  // pasted anywhere on the page) funnels through here: notices clear, the
  // input is set, and the settle tracker attributes the edit.
  const handleInputChange = useCallback(
    (value: string) => {
      setNotice(null);
      setInput(value);
      tracker.edit(csvToJson ? "csv_to_json" : "json_to_csv", value);
    },
    [csvToJson, tracker]
  );

  // Global paste routing (spec: paste-anywhere). Paste used to work only
  // while focus sat inside the input pane; this document-level capture
  // listener catches every other surface — page background, top bar,
  // options bar, output pane. A body-level paste has no caret context, so
  // routing REPLACES the input (the Excel workflow: copy table → paste →
  // converted). Editable controls keep their native paste: the handler
  // returns before preventDefault, so the event reaches the input editors
  // (textarea, CodeMirror) untouched. The output CodeMirror is read-only
  // but still owns its pane — isEditablePasteTarget keeps those pastes
  // local too. stopPropagation keeps the empty-state pane handler from
  // double-ingesting a routed paste.
  useEffect(() => {
    const onDocumentPaste = (event: ClipboardEvent) => {
      const text = event.clipboardData?.getData("text/plain");
      if (!text || isEditablePasteTarget(event.target)) return;
      event.preventDefault();
      event.stopPropagation();
      setFilename(null); // replaced input is no longer the uploaded file
      handleInputChange(text);
    };
    document.addEventListener("paste", onDocumentPaste, true);
    return () =>
      document.removeEventListener("paste", onDocumentPaste, true);
  }, [handleInputChange]);

  const meta = result.ok ? metaLabel(result.rows, result.cols) : null;
  // Stale-output validity label (spec: States → Invalid input): when the
  // current input errors but an earlier conversion succeeded, the output
  // pane still shows that retained result — label it; never block or clear.
  const staleNotice =
    !result.ok && lastValidOutput ? "Last valid result — input has errors" : null;
  // Malformed-CSV warnings (spec: silent reinterpretation) ride the output
  // pane's notice status — same non-blocking channel as the validity label.
  // They describe the CURRENT conversion, so an error result shows none.
  const warnings =
    result.ok && result.warnings && result.warnings.length > 0
      ? result.warnings
      : null;
  const largeInput = input.length > LARGE_INPUT_CHARS;

  // Every intentional copy/download is an export event; format is the
  // resolved format of the pane's text (input pane carries the input format).
  const copyInput = () => {
    trackExport({ via: "copy", format: csvToJson ? "csv" : "json" });
    void copyText(input);
  };
  const copyOutput = () => {
    trackExport({ via: "copy", format: csvToJson ? "json" : "csv" });
    if (lastValidOutput) void copyText(lastValidOutput);
  };
  const downloadInput = () => {
    trackExport({ via: "download", format: csvToJson ? "csv" : "json" });
    downloadText(input, filename ?? (csvToJson ? "data.csv" : "data.json"), {
      mime: csvToJson ? "text/csv" : "application/json",
      bom: csvToJson,
    });
  };
  // CSV downloads carry a UTF-8 BOM (spec: Download); JSON never does.
  // The output name swaps the uploaded source's extension (spec B3: #79 #102);
  // pasted input has no source and falls back to data.json / data.csv.
  const downloadOutput = () => {
    trackExport({ via: "download", format: csvToJson ? "json" : "csv" });
    downloadText(
      lastValidOutput ?? "",
      outputFilenameFor(filename, csvToJson ? "csv2json" : "json2csv"),
      {
        mime: csvToJson ? "application/json" : "text/csv",
        bom: !csvToJson,
      }
    );
  };

  const leftPane = (
    <InputPane
      format={inputFormat}
      input={input}
      onInputChange={handleInputChange}
      onFile={readFile}
      onTryExample={() => {
        setNotice(null);
        const sample = csvToJson ? SAMPLE_CSV : SAMPLE_JSON;
        setInput(sample);
        tracker.edit(csvToJson ? "csv_to_json" : "json_to_csv", sample);
      }}
      onClear={() => {
        setInput("");
        setFilename(null);
        tracker.cancel();
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
      staleNotice={staleNotice}
      warnings={warnings}
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
        <TopBar theme={theme} onToggleTheme={toggleTheme} slot={<FeedbackVote />} />
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
        uploadEncoding={uploadEncoding}
        onUploadEncodingChange={handleUploadEncodingChange}
          notice={largeInput ? "Large file — converting on pause" : null}
      />
      </div>
      <Faq />
    </div>
  );
}
