import "./test/glideDataEditorMock";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";

const SAMPLE_CSV_INPUT = "album,year\nElephant,2003\nDe Stijl,2000";

// Export assertions spy on the platform helpers; everything else passes
// through to the real implementations.
vi.mock("@/lib/clipboard", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/clipboard")>()),
  copyText: vi.fn(),
}));
vi.mock("@/lib/download", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/download")>()),
  downloadText: vi.fn(),
}));
vi.mock("@/lib/convert", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/convert")>();
  return {
    ...actual,
    convertText: vi.fn(actual.convertText),
  };
});
import { copyText } from "@/lib/clipboard";
import { convertText } from "@/lib/convert";
import { downloadText } from "@/lib/download";
import { ErrorBoundary } from "./components/ErrorBoundary";

async function flip() {
  const user = userEvent.setup();
  await user.click(screen.getByTestId("divider-switch"));
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
});

describe("direction flip", () => {
  it("turns the last valid output into the new input", async () => {
    render(<App />);
    fireEvent.click(screen.getByTestId("try-example"));

    // CSV → JSON: output is JSON for the two rows.
    // Wait for the converted CONTENT, not just the pane — under a loaded
    // runner the pane can mount before the async pipeline fills it.
    let jsonOutput = "";
    await waitFor(() => {
      jsonOutput = screen.getByTestId("output-view").textContent ?? "";
      expect(jsonOutput).toContain('"Elephant"');
    });

    // Flip: the JSON output becomes the input, panes swap roles.
    await flip();
    await waitFor(() => {
      // The JSON input editor renders the flipped output as its document.
      expect(screen.getByTestId("input-editor").textContent).toBe(jsonOutput);
    });
    expect(screen.getByTestId("output-table")).toBeInTheDocument();
  });

  it("flips without waiting for the debounce and never wipes the input", async () => {
    render(<App />);
    // Paste and flip immediately — inside the 150ms debounce window. The
    // memoized result still holds the previous (empty) conversion; the
    // handler must convert the CURRENT input instead.
    fireEvent.paste(screen.getByTestId("input-pane"), {
      clipboardData: { getData: () => SAMPLE_CSV_INPUT },
    });
    await flip();
    await waitFor(() => {
      expect(screen.getByTestId("output-table")).toBeInTheDocument();
    });
    expect(screen.getByTestId("input-editor").textContent).toContain("Elephant");
  });

  it("leaves the input untouched when the output is an error", async () => {
    render(<App />);
    fireEvent.paste(screen.getByTestId("input-pane"), {
      clipboardData: { getData: () => SAMPLE_CSV_INPUT },
    });

    // Switch to the raw editor (the table view is display-only) and break
    // the CSV so conversion fails with a parse position.
    fireEvent.click(screen.getByTestId("raw-toggle"));
    const editor = screen.getByTestId("input-editor") as HTMLTextAreaElement;
    fireEvent.change(editor, { target: { value: 'a,b\n"x"y,z' } });
    await waitFor(
      () => {
        expect(screen.getByTestId("pane-status")).toHaveTextContent(/line 2/i);
      },
      { timeout: 2000 }
    );

    const broken = editor.value;
    await flip();
    // Flip with an error output: the input editor keeps the broken text
    // (CodeMirror renders it per-line; join without the newline) instead
    // of adopting the error output.
    expect(screen.getByTestId("input-editor").textContent).toBe(broken.replace(/\n/g, ""));
  });
});

describe("global paste routing (paste-anywhere)", () => {
  function pasteOn(target: Element, text: string) {
    fireEvent.paste(target, {
      clipboardData: { getData: () => text },
    });
  }

  it("routes a body-level paste into the empty converter and converts it", async () => {
    render(<App />);
    // Focus sits outside the pane (page background) — the old field-paste
    // path never fired here.
    pasteOn(document.body, SAMPLE_CSV_INPUT);

    await waitFor(() => {
      expect(screen.getByTestId("output-view").textContent).toContain(
        "Elephant"
      );
    });
  });

  it("replaces existing input content on a body-level paste", async () => {
    render(<App />);
    fireEvent.click(screen.getByTestId("try-example"));
    await waitFor(() => {
      expect(screen.getByTestId("input-table")).toBeInTheDocument();
    });

    pasteOn(document.body, "a,b\n1,2");

    // The CSV table view virtualizes its rows — assert on the JSON output
    // (a CodeMirror doc renders the full text) for the replaced content.
    await waitFor(() => {
      expect(screen.getByTestId("output-view").textContent).toContain('"a"');
    });
    expect(screen.getByTestId("output-view").textContent).not.toContain(
      "Elephant"
    );
  });

  it("does not reroute a paste inside a text field", async () => {
    render(<App />);
    fireEvent.click(screen.getByTestId("try-example"));
    // The raw CSV editor is a real textarea — native paste owns the caret.
    fireEvent.click(screen.getByTestId("raw-toggle"));
    const editor = screen.getByTestId("input-editor") as HTMLTextAreaElement;
    const before = editor.value;

    pasteOn(editor, "INJECTED");

    // The router must have skipped the textarea: the controlled value is
    // untouched (jsdom's native paste inserts nothing, so any reroute —
    // which replaces the whole input — would surface here).
    expect(editor.value).toBe(before);
  });

  it("leaves a paste inside the empty-state paste field to the field alone", async () => {
    render(<App />);
    const field = screen.getByTestId("paste-field");
    expect(field.tagName).toBe("TEXTAREA");

    // The paste event itself must be ignored by BOTH interceptors — the
    // document-level router (editable-target skip) and the pane fallback
    // (field-ownership skip) — because the field's native caret paste owns
    // it. jsdom inserts nothing natively, so any interception here would
    // surface as an already-populated view.
    pasteOn(field, "INJECTED");
    expect(screen.queryByTestId("input-table")).not.toBeInTheDocument();
    expect(screen.getByTestId("dropzone")).toBeInTheDocument();

    // The insertion completing (real browsers) is the field's change event
    // — the one ingest path, fired exactly once: no duplicated content, no
    // second conversion event from a reroute.
    fireEvent.change(field, { target: { value: SAMPLE_CSV_INPUT } });
    await screen.findByTestId("input-table");
    expect(screen.queryByTestId("dropzone")).not.toBeInTheDocument();
  });

  it("swaps the paste field for the data view on the first typed character", async () => {
    const user = userEvent.setup();
    render(<App />);
    const field = screen.getByTestId("paste-field");

    // Typing ingests too — first content replaces the empty state with the
    // existing data view (the field unmounts, so type a single character).
    await user.type(field, "a");
    await screen.findByTestId("input-table");
    expect(screen.queryByTestId("paste-field")).not.toBeInTheDocument();
  });

  it("keeps a paste into the editable output CodeMirror native at the caret", async () => {
    render(<App />);
    fireEvent.click(screen.getByTestId("try-example"));
    await waitFor(() => {
      expect(screen.getByTestId("output-view")).toBeInTheDocument();
    });

    // The valid CSV→JSON output is editable — its .cm-content is
    // contenteditable=true, so the paste is native: it edits the output in
    // place at the caret and marks it edited, instead of routing to the
    // input (PR #197's routing applies to non-editable surfaces only).
    const outputView = screen.getByTestId("output-view");
    const content = outputView.querySelector(".cm-content") as HTMLElement;
    expect(content.getAttribute("contenteditable")).toBe("true");
    pasteOn(content, "INJECTED");

    // Native caret paste: clipboard text inserted, existing doc kept.
    await waitFor(() => {
      expect(outputView.textContent).toContain("INJECTED");
    });
    expect(outputView.textContent).toContain("Elephant");

    // The input never saw the paste; the edited state took over the pane.
    // (Headers render uppercase via the canvas grid; assert on row data.)
    expect(screen.getByTestId("input-table").textContent).toContain(
      "The White Stripes"
    );
    await screen.findByTestId("edited-badge");
    expect(
      within(screen.getByTestId("output-pane")).getByTestId("pane-status")
    ).toHaveTextContent("Output edited — CSV and option changes aren't applied.");
  });

  it("routes a paste over the output pane chrome into the input while the output is editable", async () => {
    render(<App />);
    fireEvent.click(screen.getByTestId("try-example"));
    await waitFor(() => {
      expect(screen.getByTestId("output-view")).toBeInTheDocument();
    });

    // Chrome around the editable editor ([data-surface="output"] but not
    // contenteditable) has no editable target of its own — the paste still
    // routes to the input exactly like a body paste (PR #197 behavior).
    pasteOn(screen.getByTestId("output-pane"), "a,b\n1,2");

    // The routed paste replaced the input; the conversion regenerated the
    // output from it (the dense table renders cells without commas, so the
    // output JSON is the reliable signal).
    await waitFor(() => {
      expect(screen.getByTestId("output-view").textContent).toContain('"a"');
    });
    // No edit happened — the routed paste regenerates the output normally.
    expect(screen.queryByTestId("edited-badge")).not.toBeInTheDocument();
  });

  it("routes a paste over the read-only retained output into the input", async () => {
    render(<App />);
    fireEvent.click(screen.getByTestId("try-example"));
    await waitFor(() => {
      expect(screen.getByTestId("output-view")).toBeInTheDocument();
    });

    // Break the input: the last valid output stays visible, read-only.
    fireEvent.click(screen.getByTestId("raw-toggle"));
    fireEvent.change(screen.getByTestId("input-editor") as HTMLTextAreaElement, {
      target: { value: 'a,b\n"x"y,z' },
    });
    // The retained state's signal is the header label (pane-status carries
    // the parse error itself).
    await waitFor(
      () => {
        expect(screen.getByTestId("stale-notice")).toHaveTextContent(
          /Last valid result/
        );
      },
      { timeout: 2000 }
    );
    const content = screen
      .getByTestId("output-view")
      .querySelector(".cm-content") as HTMLElement;
    expect(content.getAttribute("contenteditable")).toBe("false");

    // PR #197 preserved for the remaining read-only surface: the paste
    // routes to the input (replaces it), the conversion recovers. The
    // input is still in raw mode, so the textarea holds the pasted text.
    const line = screen
      .getByTestId("output-view")
      .querySelector(".cm-line") as HTMLElement;
    pasteOn(line, "album,year\nFever Dog,2001");
    await waitFor(() => {
      expect(
        (screen.getByTestId("input-editor") as HTMLTextAreaElement).value
      ).toContain("Fever Dog");
    });
    await waitFor(() => {
      expect(screen.getByTestId("output-view").textContent).toContain(
        '"Fever Dog"'
      );
    });
  });

  it("routes a paste over the empty-state output pane exactly once", async () => {
    const gtag = vi.fn();
    vi.stubGlobal("gtag", gtag);

    render(<App />);
    // Empty state: the output pane is placeholder chrome (no editor, no
    // caret) — the exact surface from the defect report.
    pasteOn(screen.getByTestId("output-pane"), SAMPLE_CSV_INPUT);

    // Populated-state transition fires: the paste ingested, the empty
    // state swapped for the data view.
    await screen.findByTestId("input-table");

    // Exactly-once ingest: the routed paste never re-enters through the
    // pane change-event fallback — the raw editor holds the pasted text
    // verbatim, one copy.
    fireEvent.click(screen.getByTestId("raw-toggle"));
    const editor = screen.getByTestId("input-editor") as HTMLTextAreaElement;
    expect(editor.value).toBe(SAMPLE_CSV_INPUT);

    // And one ingest means one conversion event.
    await waitFor(
      () => {
        expect(
          gtag.mock.calls.filter((call) => call[1] === "conversion")
        ).toHaveLength(1);
      },
      { timeout: 4000 }
    );
    vi.unstubAllGlobals();
  });

  it("routes a paste over the output CSV table after a direction switch to JSON→CSV", async () => {
    render(<App />);
    await flip();
    pasteOn(document.body, '[{"zip":"00721"}]');
    await waitFor(() => {
      expect(screen.getByTestId("output-table")).toBeInTheDocument();
    });

    // Paste over the output table chrome — routes per the active
    // direction: the JSON input adopts the clipboard text.
    pasteOn(screen.getByTestId("output-table"), '[{"color":"blue"}]');

    await waitFor(() => {
      expect(screen.getByTestId("input-editor").textContent).toContain(
        "blue"
      );
    });
    // The output converted the new input: the CSV table rebuilt around the
    // "color" key. Headers render uppercase via the canvas grid; the data
    // row is the reliable full-render surface.
    await waitFor(() => {
      expect(screen.getByTestId("output-table").textContent).toContain(
        "blue"
      );
    });
  });

  it("keeps a paste into the editable input CodeMirror native at caret", async () => {
    render(<App />);
    await flip();
    pasteOn(document.body, '[{"zip":"00721"}]');
    await waitFor(() => {
      expect(screen.getByTestId("input-editor").textContent).toContain(
        "00721"
      );
    });

    // The editable input editor's .cm-content is contenteditable=true —
    // the [contenteditable="true"] predicate branch owns the paste there.
    // CodeMirror inserts the clipboard text at the caret natively (works
    // in jsdom too): the document GROWS around the caret instead of being
    // replaced by the clipboard text, which is what a routed paste — the
    // defect class — would do.
    const host = screen.getByTestId("input-editor");
    const content = host.querySelector(".cm-content") as HTMLElement;
    expect(content.getAttribute("contenteditable")).toBe("true");
    pasteOn(content, "INJECTED");

    // Native caret paste: clipboard text inserted, existing doc kept.
    // (A routed paste would leave exactly "INJECTED" — full replacement.)
    await waitFor(() => {
      expect(screen.getByTestId("input-editor").textContent).toContain(
        "INJECTED"
      );
    });
    expect(screen.getByTestId("input-editor").textContent).toContain("00721");
  });

  it("routes to the JSON editor after a direction switch to JSON→CSV", async () => {
    render(<App />);
    await flip();
    pasteOn(document.body, '[{"zip":"00721"}]');

    await waitFor(() => {
      expect(screen.getByTestId("input-editor").textContent).toContain("00721");
    });
    // The converted output lands after the 150ms debounce — wait for it.
    await waitFor(() => {
      expect(screen.getByTestId("output-table")).toBeInTheDocument();
    });
  });

  it("shows the shortcut chip in the empty state", () => {
    render(<App />);
    expect(screen.getByTestId("paste-shortcut")).toBeInTheDocument();
  });
});

describe("direction-conditional options", () => {
  it("shows CSV→JSON options only in CSV mode", () => {
    render(<App />);
    expect(screen.getByLabelText(/Parse numbers/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Parse JSON/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Transpose/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Hash output/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Minify/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Flatten/)).not.toBeInTheDocument();
  });

  it("shows JSON→CSV options only in JSON mode", async () => {
    render(<App />);
    await flip();
    expect(screen.getByLabelText(/Flatten nested arrays/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Parse numbers/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Transpose/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Hash output/)).not.toBeInTheDocument();
  });
});

describe("theme persistence", () => {
  it("toggles dark class and persists the choice to localStorage", async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(document.documentElement).not.toHaveClass("dark");

    await user.click(screen.getByTestId("theme-toggle"));
    expect(document.documentElement).toHaveClass("dark");
    await waitFor(() => {
      expect(localStorage.getItem("csvjson-theme")).toBe("dark");
    });

    await user.click(screen.getByTestId("theme-toggle"));
    expect(document.documentElement).not.toHaveClass("dark");
    await waitFor(() => {
      expect(localStorage.getItem("csvjson-theme")).toBe("light");
    });
  });
});


describe("analytics events", () => {
  function installAnalytics() {
    const gtag = vi.fn();
    const plausible = vi.fn();
    (window as { gtag?: unknown }).gtag = gtag;
    (window as { plausible?: unknown }).plausible = plausible;
    return { gtag, plausible };
  }

  afterEach(() => {
    delete (window as { gtag?: unknown }).gtag;
    delete (window as { plausible?: unknown }).plausible;
  });

  it("fires exactly one conversion event after the example input settles", async () => {
    const { gtag, plausible } = installAnalytics();

    render(<App />);
    fireEvent.click(screen.getByTestId("try-example"));
    await waitFor(() => {
      expect(screen.getByTestId("output-view")).toBeInTheDocument();
    });

    // Settle window is 2s after the last edit — the event must appear.
    await waitFor(
      () => {
        expect(
          gtag.mock.calls.filter((call) => call[1] === "conversion")
        ).toHaveLength(1);
      },
      { timeout: 4000 }
    );
    const call = gtag.mock.calls.find((c) => c[1] === "conversion");
    expect(call).toEqual([
      "event",
      "conversion",
      { direction: "csv_to_json", input: "paste", size: "<10KB" },
    ]);
    expect(plausible).toHaveBeenCalledWith("Conversion", {
      props: { direction: "csv_to_json", input: "paste", size: "<10KB" },
    });
  });

  it("fires an export event on every output copy click", async () => {
    const gtag = vi.fn();
    const plausible = vi.fn();
    (window as { gtag?: unknown }).gtag = gtag;
    (window as { plausible?: unknown }).plausible = plausible;

    render(<App />);
    fireEvent.click(screen.getByTestId("try-example"));
    await waitFor(() => {
      expect(screen.getByTestId("output-view")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("copy-output"));
    expect(gtag).toHaveBeenCalledWith("event", "export", {
      via: "copy",
      format: "json",
    });
    expect(plausible).toHaveBeenCalledWith("Export", {
      props: { via: "copy", format: "json" },
    });
  });
});

describe("stale output validity label", () => {
  const BROKEN_CSV = 'a,b\n"x"y,z';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Valid sample → break the input → error state with the retained result.
  async function renderStaleOutput() {
    render(<App />);
    fireEvent.click(screen.getByTestId("try-example"));
    await waitFor(() => {
      expect(screen.getByTestId("output-view")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId("raw-toggle"));
    const editor = screen.getByTestId("input-editor") as HTMLTextAreaElement;
    fireEvent.change(editor, { target: { value: BROKEN_CSV } });
    await waitFor(
      () => {
        expect(screen.getByTestId("pane-status")).toHaveTextContent(/line 2/i);
      },
      { timeout: 2000 }
    );
    return editor;
  }

  it("keeps the last valid output visible and labels it during an input error", async () => {
    await renderStaleOutput();
    // The retained conversion is still on screen...
    expect(screen.getByTestId("output-view").textContent).toContain("Elephant");
    // ...with the validity label in the header meta slot.
    expect(screen.getByTestId("stale-notice")).toHaveTextContent(
      "Last valid result — input has errors"
    );
  });

  it("exports the retained result from Copy and Download during an input error", async () => {
    await renderStaleOutput();

    fireEvent.click(screen.getByTestId("copy-output"));
    expect(copyText).toHaveBeenLastCalledWith(
      expect.stringContaining("Elephant")
    );

    fireEvent.click(screen.getByTestId("download-output"));
    expect(downloadText).toHaveBeenLastCalledWith(
      expect.stringContaining("Elephant"),
      "data.json",
      expect.objectContaining({ mime: "application/json", bom: false })
    );
  });

  it("shows the count instead of the label on valid input", async () => {
    render(<App />);
    fireEvent.click(screen.getByTestId("try-example"));
    await waitFor(() => {
      expect(screen.getByTestId("output-view")).toBeInTheDocument();
    });

    expect(screen.queryByTestId("stale-notice")).not.toBeInTheDocument();
    // The input pane carries its own count — assert on the output header.
    expect(
      within(screen.getByTestId("output-pane")).getByTestId("pane-meta")
    ).toHaveTextContent("6 rows · 3 cols");
    // Count consolidation (spec: hierarchy): the options bar no longer
    // repeats the count — each pane header carries exactly one.
    expect(screen.queryByTestId("options-meta")).not.toBeInTheDocument();
    expect(screen.getAllByTestId("pane-meta")).toHaveLength(2);
  });

  it("clears the label after the input is fixed", async () => {
    const editor = await renderStaleOutput();
    expect(screen.getByTestId("stale-notice")).toBeInTheDocument();

    fireEvent.change(editor, { target: { value: SAMPLE_CSV_INPUT } });
    await waitFor(
      () => {
        expect(screen.queryByTestId("stale-notice")).not.toBeInTheDocument();
      },
      { timeout: 2000 }
    );
    // The count returns in the label's place.
    expect(
      within(screen.getByTestId("output-pane")).getByTestId("pane-meta")
    ).toHaveTextContent("2 rows · 2 cols");
  });
});

describe("output download naming", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("derives the output name from the uploaded source file", async () => {
    render(<App />);
    // jsdom's File lacks Blob.stream(); attach a real web ReadableStream
    // over the bytes so the production decodeUpload path runs under test.
    const bytes = new TextEncoder().encode("album,year\nElephant,2003");
    const file = Object.assign(
      new File([bytes], "aaa.csv", { type: "text/csv" }),
      {
        stream: () =>
          new ReadableStream<Uint8Array>({
            start(controller) {
              controller.enqueue(bytes);
              controller.close();
            },
          }),
      }
    ) as unknown as File;
    fireEvent.change(screen.getByTestId("file-input"), {
      target: { files: [file] },
    });
    await waitFor(() => {
      expect(screen.getByTestId("output-view")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("download-output"));
    expect(downloadText).toHaveBeenLastCalledWith(
      expect.stringContaining("Elephant"),
      "aaa.json",
      expect.objectContaining({ mime: "application/json", bom: false })
    );
  });
});

describe("direction deep link (?direction=)", () => {
  const ID = "000c44f43e2f62cc15c48d9d7c5a4582";

  afterEach(() => {
    vi.restoreAllMocks();
    window.history.pushState({}, "", "/");
  });

  it("initializes JSON → CSV from ?direction=json2csv", () => {
    window.history.pushState({}, "", "/?direction=json2csv");
    render(<App />);
    expect(screen.getByTestId("divider-switch-label")).toHaveTextContent(
      "JSON → CSV"
    );
  });

  it("keeps CSV → JSON for an explicit ?direction=csv2json", () => {
    window.history.pushState({}, "", "/?direction=csv2json");
    render(<App />);
    expect(screen.getByTestId("divider-switch-label")).toHaveTextContent(
      "CSV → JSON"
    );
  });

  it("keeps the csv2json default for an unknown or absent param", () => {
    window.history.pushState({}, "", "/?direction=bogus");
    const { unmount } = render(<App />);
    expect(screen.getByTestId("divider-switch-label")).toHaveTextContent(
      "CSV → JSON"
    );
    unmount();

    window.history.pushState({}, "", "/");
    render(<App />);
    expect(screen.getByTestId("divider-switch-label")).toHaveTextContent(
      "CSV → JSON"
    );
  });

  it("shows the active direction as visible text and updates it on flip", async () => {
    render(<App />);
    expect(screen.getByTestId("divider-switch-label")).toHaveTextContent(
      "CSV → JSON"
    );
    await flip();
    expect(screen.getByTestId("divider-switch-label")).toHaveTextContent(
      "JSON → CSV"
    );
    await flip();
    expect(screen.getByTestId("divider-switch-label")).toHaveTextContent(
      "CSV → JSON"
    );
  });

  it("ignores ?direction during permalink hydration — the payload wins", async () => {
    // A json2csv permalink carrying ?direction=csv2json: hydration parses
    // the pathname only, so the legacy payload's json2csv direction must
    // survive — the param never overrides it.
    window.history.pushState(
      {},
      "",
      `/json2csv/${ID}?direction=csv2json`
    );
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ json: '{"album":"Elephant"}' }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    render(<App />);
    await waitFor(() => {
      expect(screen.getByTestId("divider-switch-label")).toHaveTextContent(
        "JSON → CSV"
      );
    });
  });
});

describe("JSON → CSV pipe separator output preview (AC-1)", () => {
  afterEach(() => {
    window.history.pushState({}, "", "/");
  });

  it("splits pipe-separated CSV output into columns and reports accurate cols count in OutputPane", async () => {
    window.history.pushState({}, "", "/?direction=json2csv");
    render(<App />);

    fireEvent.change(screen.getByTestId("opt-separator"), {
      target: { value: "|" },
    });
    fireEvent.paste(screen.getByTestId("input-pane"), {
      clipboardData: {
        getData: () =>
          JSON.stringify([
            { album: "De Stijl", year: 2000 },
            { album: "Elephant", year: 2003 },
          ]),
      },
    });

    await waitFor(() => {
      expect(screen.getByTestId("output-table")).toBeInTheDocument();
    });

    const outputPane = screen.getByTestId("output-pane");
    expect(within(outputPane).getByTestId("pane-meta")).toHaveTextContent(
      "2 rows · 2 cols"
    );

    const outputTable = screen.getByTestId("output-table");
    // Column 0 is the row-number gutter; columns 1 and 2 are the split data columns.
    expect(within(outputTable).getByTestId("glide-header-1")).toHaveTextContent(
      "ALBUM"
    );
    expect(within(outputTable).getByTestId("glide-header-2")).toHaveTextContent(
      "YEAR"
    );
    const firstRow = within(outputTable).getByTestId("glide-row-0");
    expect(firstRow).toHaveTextContent("De Stijl");
    expect(firstRow).toHaveTextContent("2000");
  });
});

describe("contextual JSON wrapper unwrap & JSONL in JSON → CSV (AC-4)", () => {
  afterEach(() => {
    window.history.pushState({}, "", "/");
  });

  it("shows json-unwrap-pill-data on wrapped JSON and unwraps the array on click", async () => {
    window.history.pushState({}, "", "/?direction=json2csv");
    render(<App />);

    const wrappedJson = JSON.stringify({
      data: [
        { id: 1, name: "Ada" },
        { id: 2, name: "Grace" },
      ],
      meta: { total: 2 },
    });

    fireEvent.paste(screen.getByTestId("input-pane"), {
      clipboardData: { getData: () => wrappedJson },
    });

    const pill = await screen.findByTestId("json-unwrap-pill-data");
    expect(pill).toHaveTextContent("Unwrap .data (2 rows)");

    fireEvent.click(pill);

    await waitFor(() => {
      expect(
        screen.queryByTestId("json-unwrap-pill-data")
      ).not.toBeInTheDocument();
      expect(
        within(screen.getByTestId("output-pane")).getByTestId("pane-meta")
      ).toHaveTextContent("2 rows · 2 cols");
    });

    fireEvent.click(screen.getByTestId("copy-output"));
    expect(copyText).toHaveBeenLastCalledWith('"id","name"\n1,"Ada"\n2,"Grace"');
  });

  it("converts pasted multi-line JSONL in JSON → CSV mode without error", async () => {
    window.history.pushState({}, "", "/?direction=json2csv");
    render(<App />);

    const jsonl = '{"id":1,"name":"Ada"}\n{"id":2,"name":"Grace"}';
    fireEvent.paste(screen.getByTestId("input-pane"), {
      clipboardData: { getData: () => jsonl },
    });

    await waitFor(() => {
      expect(
        within(screen.getByTestId("output-pane")).getByTestId("pane-meta")
      ).toHaveTextContent("2 rows · 2 cols");
    });

    fireEvent.click(screen.getByTestId("copy-output"));
    expect(copyText).toHaveBeenLastCalledWith('"id","name"\n1,"Ada"\n2,"Grace"');
  });
});

describe("contextual JSON Format / Minify toggle in JSON → CSV (AC-5)", () => {
  afterEach(() => {
    window.history.pushState({}, "", "/");
  });

  it("hides json-format-toggle when empty, in CSV → JSON mode, or when JSON is invalid", async () => {
    window.history.pushState({}, "", "/?direction=json2csv");
    render(<App />);

    // Hidden while empty.
    expect(
      screen.queryByTestId("json-format-toggle")
    ).not.toBeInTheDocument();

    // Paste invalid JSON — stays hidden.
    fireEvent.paste(screen.getByTestId("input-pane"), {
      clipboardData: { getData: () => "{broken: json" },
    });
    await waitFor(() => {
      expect(screen.getByTestId("input-editor")).toBeInTheDocument();
    });
    expect(
      screen.queryByTestId("json-format-toggle")
    ).not.toBeInTheDocument();

    // Switch to CSV → JSON mode — stays hidden even with valid content.
    window.history.pushState({}, "", "/");
    fireEvent.click(screen.getByTestId("clear-input"));
    await flip();
    fireEvent.paste(screen.getByTestId("input-pane"), {
      clipboardData: { getData: () => SAMPLE_CSV_INPUT },
    });
    await waitFor(() => {
      expect(screen.getByTestId("input-table")).toBeInTheDocument();
    });
    expect(
      screen.queryByTestId("json-format-toggle")
    ).not.toBeInTheDocument();
  });

  it("formats minified JSON to 2-space pretty-print and toggles to Minify", async () => {
    window.history.pushState({}, "", "/?direction=json2csv");
    render(<App />);

    const minified = '[{"id":1,"name":"Ada"},{"id":2,"name":"Grace"}]';
    const formatted = JSON.stringify(JSON.parse(minified), null, 2);

    fireEvent.paste(screen.getByTestId("input-pane"), {
      clipboardData: { getData: () => minified },
    });

    const toggle = await screen.findByTestId("json-format-toggle");
    expect(toggle).toHaveTextContent("Format");

    // Click Format → input becomes 2-space pretty-printed JSON and label flips to Minify.
    fireEvent.click(toggle);
    await waitFor(() => {
      expect(screen.getByTestId("json-format-toggle")).toHaveTextContent(
        "Minify"
      );
    });
    fireEvent.click(screen.getByTestId("copy-input"));
    expect(copyText).toHaveBeenLastCalledWith(formatted);

    // Click Minify → input compacts back to single-line JSON and label flips to Format.
    fireEvent.click(screen.getByTestId("json-format-toggle"));
    await waitFor(() => {
      expect(screen.getByTestId("json-format-toggle")).toHaveTextContent(
        "Format"
      );
    });
    fireEvent.click(screen.getByTestId("copy-input"));
    expect(copyText).toHaveBeenLastCalledWith(minified);
  });

  it("shows Format for valid multi-line JSONL and formats it into a 2-space JSON array", async () => {
    window.history.pushState({}, "", "/?direction=json2csv");
    render(<App />);

    const jsonl = '{"id":1,"name":"Ada"}\n{"id":2,"name":"Grace"}';
    const expectedFormatted = JSON.stringify(
      [
        { id: 1, name: "Ada" },
        { id: 2, name: "Grace" },
      ],
      null,
      2
    );

    fireEvent.paste(screen.getByTestId("input-pane"), {
      clipboardData: { getData: () => jsonl },
    });

    const toggle = await screen.findByTestId("json-format-toggle");
    expect(toggle).toHaveTextContent("Format");

    fireEvent.click(toggle);
    await waitFor(() => {
      expect(screen.getByTestId("json-format-toggle")).toHaveTextContent(
        "Minify"
      );
    });
    fireEvent.click(screen.getByTestId("copy-input"));
    expect(copyText).toHaveBeenLastCalledWith(expectedFormatted);
  });
});

describe("bounded Undo / Redo for CSV grid mutations (AC-2)", () => {
  it("steps backward and forward across cell edits, row deletions, and Clear via header buttons and shortcuts", async () => {
    const user = userEvent.setup();
    render(<App />);

    // Initial empty state and initial sample seed do not show undo/redo chrome.
    expect(screen.queryByTestId("csv-undo-button")).toBeNull();
    expect(screen.queryByTestId("csv-redo-button")).toBeNull();

    await user.click(screen.getByTestId("try-example"));
    const inputTable = await screen.findByTestId("input-table");
    expect(screen.queryByTestId("csv-undo-button")).toBeNull();
    expect(screen.queryByTestId("csv-redo-button")).toBeNull();
    expect(within(inputTable).getByTestId("glide-row-0")).toHaveTextContent(
      "The White Stripes"
    );

    // Step 1: edit row 0, col 1 via Glide mock commit button ("EDITED").
    await user.click(within(inputTable).getByTestId("glide-edit-0-1"));
    expect(within(inputTable).getByTestId("glide-row-0")).toHaveTextContent(
      "EDITED"
    );

    const undoBtn = screen.getByTestId("csv-undo-button");
    const redoBtn = screen.getByTestId("csv-redo-button");
    expect(undoBtn).not.toBeDisabled();
    expect(redoBtn).toBeDisabled();

    // Step 2: select row 0 and delete it.
    await user.click(within(inputTable).getByTestId("glide-row-select-0"));
    await user.click(screen.getByTestId("input-table-delete-rows"));
    expect(within(inputTable).getByTestId("glide-row-0")).toHaveTextContent(
      "De Stijl"
    );

    // Undo deletion via keyboard shortcut Mod+Z inside the grid.
    fireEvent.keyDown(inputTable, { key: "z", ctrlKey: true });
    expect(within(inputTable).getByTestId("glide-row-0")).toHaveTextContent(
      "EDITED"
    );
    expect(undoBtn).not.toBeDisabled();
    expect(redoBtn).not.toBeDisabled();

    // Undo cell edit via header button -> back to initial sample CSV.
    await user.click(undoBtn);
    expect(within(inputTable).getByTestId("glide-row-0")).toHaveTextContent(
      "The White Stripes"
    );
    expect(undoBtn).toBeDisabled();
    expect(redoBtn).not.toBeDisabled();

    // Redo cell edit via header button, then redo row deletion via Mod+Shift+Z.
    await user.click(redoBtn);
    expect(within(inputTable).getByTestId("glide-row-0")).toHaveTextContent(
      "EDITED"
    );
    fireEvent.keyDown(inputTable, {
      key: "z",
      metaKey: true,
      shiftKey: true,
    });
    expect(within(inputTable).getByTestId("glide-row-0")).toHaveTextContent(
      "De Stijl"
    );
    expect(redoBtn).toBeDisabled();
  });
});

describe("contextual CSV indexed array toggle pill (feat/csv-indexed-arrays)", () => {
  it("renders zero extra UI when no indexed header groups exist, and toggles between collapsed JSON arrays and flat keys when present", async () => {
    const user = userEvent.setup();
    render(<App />);

    // Empty state has no indexed array pill
    expect(screen.queryByTestId("csv-indexed-array-pill")).toBeNull();

    // Sample CSV (album, year, US_peak_chart_post) has no indexed headers -> no pill
    await user.click(screen.getByTestId("try-example"));
    await screen.findByTestId("input-table");
    expect(screen.queryByTestId("csv-indexed-array-pill")).toBeNull();

    // Paste CSV with indexed columns id,code.0,code.1,code.2
    const indexedCsv = "id,code.0,code.1,code.2\n1,a,b,c\n2,x,,";
    fireEvent.paste(screen.getByTestId("input-pane"), {
      clipboardData: { getData: () => indexedCsv },
    });

    const pill = await screen.findByTestId("csv-indexed-array-pill");
    expect(pill).toHaveAttribute("aria-pressed", "true");
    expect(pill).toHaveTextContent("Arrays: .0, .1 → []");

    await waitFor(() => {
      expect(screen.getByTestId("output-view").textContent).toContain(
        '"code": ['
      );
    });
    fireEvent.click(screen.getByTestId("copy-output"));
    expect(JSON.parse(vi.mocked(copyText).mock.lastCall?.[0] ?? "null")).toEqual([
      { id: 1, code: ["a", "b", "c"] },
      { id: 2, code: ["x"] },
    ]);

    // Click the contextual pill -> switches to flat literal keys ("code.0", "code.1", "code.2")
    await user.click(pill);
    expect(pill).toHaveAttribute("aria-pressed", "false");
    expect(pill).toHaveTextContent("Keep flat keys (.0, .1)");

    await waitFor(() => {
      expect(screen.getByTestId("output-view").textContent).toContain(
        '"code.0": "a"'
      );
    });
    fireEvent.click(screen.getByTestId("copy-output"));
    expect(JSON.parse(vi.mocked(copyText).mock.lastCall?.[0] ?? "null")).toEqual([
      { id: 1, "code.0": "a", "code.1": "b", "code.2": "c" },
      { id: 2, "code.0": "x", "code.1": "", "code.2": "" },
    ]);

    // Click the contextual pill again -> switches back to collapsed JSON arrays
    await user.click(pill);
    expect(pill).toHaveAttribute("aria-pressed", "true");
    await waitFor(() => {
      expect(screen.getByTestId("output-view").textContent).toContain(
        '"code": ['
      );
    });
  });
});

function createStreamableFile(
  name: string,
  content: string,
  type = "text/csv"
): File {
  const bytes = new TextEncoder().encode(content);
  const file = new File([bytes], name, { type });
  return Object.assign(file, {
    stream: () =>
      new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(bytes);
          controller.close();
        },
      }),
  }) as unknown as File;
}

describe("CSV upload responsiveness & blank-page resilience (AC-7 / art_cPIu3u6a)", () => {
  it("runs convertText at most ONCE for an uploaded CSV file and renders output immediately without flashing 'Resolve the error to see output.'", async () => {
    render(<App />);
    vi.mocked(convertText).mockClear();

    const uploadedCsv = "id,album,year\n1,Elephant,2003\n2,De Stijl,2000";
    const file = createStreamableFile("albums.csv", uploadedCsv);

    fireEvent.change(screen.getByTestId("file-input"), {
      target: { files: [file] },
    });

    await waitFor(() => {
      expect(screen.getByTestId("output-view").textContent).toContain(
        '"Elephant"'
      );
    });

    // Must never display the false error placeholder when error is null
    expect(
      screen.queryByText("Resolve the error to see output.")
    ).not.toBeInTheDocument();

    // convertText must be invoked at most ONCE with the uploaded CSV text
    const callsForUploadedCsv = vi
      .mocked(convertText)
      .mock.calls.filter(([, text]) => text === uploadedCsv);
    expect(callsForUploadedCsv).toHaveLength(1);
  });

  it("shows 'Converting…' (output-converting-placeholder) instead of 'Resolve the error to see output.' while typing debounce is pending", () => {
    render(<App />);

    // Trigger a paste so input becomes non-empty synchronously while
    // debouncedInput is still "" during the 150ms debounce window.
    fireEvent.paste(screen.getByTestId("input-pane"), {
      clipboardData: { getData: () => "name,score\nAda,100" },
    });

    expect(
      screen.getByTestId("output-converting-placeholder")
    ).toHaveTextContent("Converting…");
    expect(
      screen.queryByText("Resolve the error to see output.")
    ).not.toBeInTheDocument();
  });

  it("caps ultra-large JSON output preview in CodeMirror with large-output-preview-banner while Copy and Download preserve the full output", async () => {
    render(<App />);

    // Build a CSV whose pretty-printed JSON exceeds READONLY_PREVIEW_MAX_CHARS (2,000,000 chars)
    const rowLine =
      "100001,The White Stripes,Elephant,2003, XL Recordings ,Alternative Rock,true\n";
    const rowCount = 12_500;
    const largeCsv =
      "id,artist,album,year,label,genre,active\n" + rowLine.repeat(rowCount);
    const file = createStreamableFile("catalog-large.csv", largeCsv);

    fireEvent.change(screen.getByTestId("file-input"), {
      target: { files: [file] },
    });

    const banner = await screen.findByTestId("large-output-preview-banner");
    expect(banner).toHaveTextContent(
      /Showing first 512 KB preview in editor — Copy and Download include the full output/
    );

    // Editor DOM stays capped around 512 KB while Copy & Download receive the full >2 MB JSON
    const editorText = screen.getByTestId("output-view").textContent ?? "";
    expect(editorText.length).toBeLessThan(600 * 1024);

    vi.mocked(copyText).mockClear();
    fireEvent.click(screen.getByTestId("copy-output"));
    const copiedText = vi.mocked(copyText).mock.lastCall?.[0] ?? "";
    expect(copiedText.length).toBeGreaterThan(2_000_000);

    vi.mocked(downloadText).mockClear();
    fireEvent.click(screen.getByTestId("download-output"));
    const downloadedText = vi.mocked(downloadText).mock.lastCall?.[0] ?? "";
    expect(downloadedText).toBe(copiedText);
  });

  it("recovers from an unexpected pane render throw via ErrorBoundary instead of unmounting to a blank page", () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    try {
      let shouldThrow = true;
      function BombPane() {
        if (shouldThrow) {
          throw new Error("Simulated canvas assertion failure");
        }
        return <div data-testid="recovered-pane">Pane recovered cleanly</div>;
      }

      const onReset = vi.fn(() => {
        shouldThrow = false;
      });

      render(
        <ErrorBoundary
          fallbackTitle="CSV input encountered a display error."
          onReset={onReset}
        >
          <BombPane />
        </ErrorBoundary>
      );

      expect(screen.getByTestId("error-boundary-fallback")).toHaveTextContent(
        "CSV input encountered a display error."
      );
      expect(screen.getByTestId("error-boundary-fallback")).toHaveTextContent(
        "Simulated canvas assertion failure"
      );

      fireEvent.click(screen.getByTestId("error-boundary-reset"));
      expect(onReset).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId("recovered-pane")).toHaveTextContent(
        "Pane recovered cleanly"
      );
    } finally {
      consoleErrorSpy.mockRestore();
    }
  });
});

describe("mobile & small-screen layout polish (AC-8 / D7)", () => {
  it("unclamps the converter shell on <md, compacts secondary header action labels on <sm, and toggles mobile options disclosure", async () => {
    const user = userEvent.setup();
    render(<App />);

    // Converter shell uses min-h-svh on mobile and h-svh on md+
    const topbar = screen.getByTestId("topbar");
    const shell = topbar.parentElement;
    expect(shell).not.toBeNull();
    expect(shell?.className).toContain("min-h-svh");
    expect(shell?.className).toContain("md:h-svh");

    // Load sample CSV so the InputPane header action buttons render
    await user.click(screen.getByTestId("try-example"));

    // Secondary InputPane actions preserve accessible names via aria-label while hiding text labels below xl
    for (const [testId, label] of [
      ["upload", "Upload"],
      ["copy-input", "Copy"],
      ["clear-input", "Clear"],
      ["download-input", "Download"],
    ] as const) {
      const btn = screen.getByTestId(testId);
      expect(btn).toHaveAttribute("aria-label", label);
      const span = btn.querySelector("span");
      expect(span).not.toBeNull();
      expect(span?.className).toContain("hidden");
      expect(span?.className).toContain("xl:inline");
    }

    // Mobile options disclosure toggles aria-expanded and updates summary when direction flips
    const mobileToggle = screen.getByTestId("options-mobile-toggle");
    expect(mobileToggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByTestId("options-mobile-summary")).toHaveTextContent(
      "Auto · Parse numbers · Parse JSON"
    );

    await user.click(mobileToggle);
    expect(mobileToggle).toHaveAttribute("aria-expanded", "true");

    await user.click(screen.getByTestId("divider-switch"));
    expect(screen.getByTestId("options-mobile-summary")).toHaveTextContent(
      "Auto"
    );
  });
});

describe("smaller-desktop & half-screen layout polish (AC-9 / D8)", () => {
  it("uses md:min-h-12 on PaneShell headers, keeps InputPane and OutputPane secondary action labels icon-only until xl:inline, and adds md:px-16 seam clearance on Dropzone", async () => {
    const user = userEvent.setup();
    render(<App />);

    // Dropzone includes md:px-16 horizontal seam clearance so the floating DividerSwitch never overlaps the paste box
    const dropzone = screen.getByTestId("dropzone");
    expect(dropzone.className).toContain("md:px-16");

    // DividerSwitch uses compact md: sizing on side-by-side viewports
    const dividerSwitch = screen.getByTestId("divider-switch");
    expect(dividerSwitch.className).toContain("md:h-8");
    expect(dividerSwitch.className).toContain("md:px-2.5");
    expect(dividerSwitch.className).toContain("md:text-[11px]");

    // Both PaneShell headers use md:min-h-12 and md:py-1.5 rather than a rigid md:h-12 lock
    const inputHeader = screen
      .getByTestId("input-pane")
      .querySelector(".border-b");
    const outputHeader = screen
      .getByTestId("output-pane")
      .querySelector(".border-b");
    expect(inputHeader).not.toBeNull();
    expect(outputHeader).not.toBeNull();
    for (const header of [inputHeader, outputHeader]) {
      expect(header?.className).toContain("md:min-h-12");
      expect(header?.className).toContain("md:py-1.5");
      expect(header?.className).not.toMatch(/(?:^|\s)md:h-12(?:\s|$)/);
    }

    // Load sample CSV so all InputPane and OutputPane controls are active
    await user.click(screen.getByTestId("try-example"));

    for (const [testId, label] of [
      ["upload", "Upload"],
      ["copy-input", "Copy"],
      ["clear-input", "Clear"],
      ["download-input", "Download"],
      ["copy-output", "Copy"],
      ["download-output", "Download"],
    ] as const) {
      const btn = screen.getByTestId(testId);
      expect(btn).toHaveAttribute("aria-label", label);
      expect(btn).toHaveAttribute("title", label);
      const span = btn.querySelector("span");
      expect(span).not.toBeNull();
      expect(span?.className).toContain("hidden");
      expect(span?.className).toContain("xl:inline");
    }
  });
});





