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
import { setMediaQueryMatches } from "./test/setup";

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

  it("fires Input (valid: true) and Conversion immediately on 'Try an example' with input: 'example'", async () => {
    const { gtag, plausible } = installAnalytics();

    const { unmount } = render(<App />);
    fireEvent.click(screen.getByTestId("try-example"));
    await waitFor(() => {
      expect(screen.getByTestId("output-view")).toBeInTheDocument();
    });

    expect(
      gtag.mock.calls.filter((call) => call[1] === "input")
    ).toEqual([
      [
        "event",
        "input",
        {
          direction: "csv_to_json",
          input: "example",
          size: "<10KB",
          valid: true,
        },
      ],
    ]);
    expect(
      gtag.mock.calls.filter((call) => call[1] === "conversion")
    ).toEqual([
      [
        "event",
        "conversion",
        { direction: "csv_to_json", input: "example", size: "<10KB" },
      ],
    ]);
    expect(plausible).toHaveBeenCalledWith("Input", {
      props: {
        direction: "csv_to_json",
        input: "example",
        size: "<10KB",
        valid: true,
      },
    });
    expect(plausible).toHaveBeenCalledWith("Conversion", {
      props: { direction: "csv_to_json", input: "example", size: "<10KB" },
    });
    unmount();
  });

  it("fires Input (valid: false) without Conversion when invalid JSON settles in JSON→CSV mode", async () => {
    const { gtag, plausible } = installAnalytics();
    window.history.pushState({}, "", "/?direction=json2csv");

    try {
      const { unmount } = render(<App />);
      fireEvent.paste(screen.getByTestId("input-pane"), {
        clipboardData: { getData: () => "{broken: json" },
      });

      await waitFor(
        () => {
          expect(
            gtag.mock.calls.filter((call) => call[1] === "input")
          ).toHaveLength(1);
        },
        { timeout: 4000 }
      );
      expect(plausible).toHaveBeenCalledWith("Input", {
        props: {
          direction: "json_to_csv",
          input: "paste",
          size: "<10KB",
          valid: false,
        },
      });
      expect(
        gtag.mock.calls.filter((call) => call[1] === "conversion")
      ).toHaveLength(0);
      unmount();
    } finally {
      window.history.pushState({}, "", "/");
    }
  });

  it("fires Input and Conversion on file upload, drag-drop, and direction flip", async () => {
    const { gtag, plausible } = installAnalytics();
    const dateNowSpy = vi.spyOn(Date, "now");
    let fakeNow = 10_000;
    dateNowSpy.mockImplementation(() => fakeNow);

    try {
      render(<App />);

      // 1. File upload (via: "file")
      const uploadedCsv = "album,year\nElephant,2003";
      const file = createStreamableFile("albums.csv", uploadedCsv);
      fireEvent.change(screen.getByTestId("file-input"), {
        target: { files: [file] },
      });

      await waitFor(() => {
        expect(plausible).toHaveBeenCalledWith("Input", {
          props: {
            direction: "csv_to_json",
            input: "file",
            size: "<10KB",
            valid: true,
          },
        });
      });
      expect(plausible).toHaveBeenCalledWith("Conversion", {
        props: {
          direction: "csv_to_json",
          input: "file",
          size: "<10KB",
        },
      });

      // 2. Direction flip (via: "flip") past the 2s rate window
      fakeNow += 3_000;
      await flip();
      await waitFor(() => {
        expect(plausible).toHaveBeenCalledWith("Input", {
          props: {
            direction: "json_to_csv",
            input: "flip",
            size: "<10KB",
            valid: true,
          },
        });
      });
      expect(plausible).toHaveBeenCalledWith("Conversion", {
        props: {
          direction: "json_to_csv",
          input: "flip",
          size: "<10KB",
        },
      });

      // 3. Drag-and-drop (via: "drag") past the 2s rate window
      fakeNow += 3_000;
      const droppedJson = '[{"album":"De Stijl","year":2000}]';
      const dropFile = createStreamableFile(
        "albums.json",
        droppedJson,
        "application/json"
      );
      fireEvent.drop(screen.getByTestId("input-pane"), {
        dataTransfer: { files: [dropFile], types: ["Files"] },
      });

      await waitFor(() => {
        expect(plausible).toHaveBeenCalledWith("Input", {
          props: {
            direction: "json_to_csv",
            input: "drag",
            size: "<10KB",
            valid: true,
          },
        });
      });
      expect(plausible).toHaveBeenCalledWith("Conversion", {
        props: {
          direction: "json_to_csv",
          input: "drag",
          size: "<10KB",
        },
      });
      expect(gtag.mock.calls.filter((c) => c[1] === "input")).toHaveLength(3);
      expect(gtag.mock.calls.filter((c) => c[1] === "conversion")).toHaveLength(
        3
      );
    } finally {
      dateNowSpy.mockRestore();
    }
  });

  it("fires Export with pane and direction across button copy/download, native OutputPane copy, and CsvTable selection copy", async () => {
    const { gtag, plausible } = installAnalytics();

    render(<App />);
    fireEvent.click(screen.getByTestId("try-example"));
    await waitFor(() => {
      expect(screen.getByTestId("output-view")).toBeInTheDocument();
    });

    // 1. Output pane Copy button
    fireEvent.click(screen.getByTestId("copy-output"));
    expect(gtag).toHaveBeenLastCalledWith("event", "export", {
      via: "copy",
      format: "json",
      pane: "output",
      direction: "csv_to_json",
    });
    expect(plausible).toHaveBeenLastCalledWith("Export", {
      props: {
        via: "copy",
        format: "json",
        pane: "output",
        direction: "csv_to_json",
      },
    });

    // 2. Output pane Download button
    fireEvent.click(screen.getByTestId("download-output"));
    expect(plausible).toHaveBeenLastCalledWith("Export", {
      props: {
        via: "download",
        format: "json",
        pane: "output",
        direction: "csv_to_json",
      },
    });

    // 3. Input pane Copy & Download buttons
    fireEvent.click(screen.getByTestId("copy-input"));
    expect(plausible).toHaveBeenLastCalledWith("Export", {
      props: {
        via: "copy",
        format: "csv",
        pane: "input",
        direction: "csv_to_json",
      },
    });
    fireEvent.click(screen.getByTestId("download-input"));
    expect(plausible).toHaveBeenLastCalledWith("Export", {
      props: {
        via: "download",
        format: "csv",
        pane: "input",
        direction: "csv_to_json",
      },
    });

    // 4. Native keyboard copy (Cmd/Ctrl+C) inside JSON OutputPane
    fireEvent.copy(screen.getByTestId("output-view"));
    expect(plausible).toHaveBeenLastCalledWith("Export", {
      props: {
        via: "copy",
        format: "json",
        pane: "output",
        direction: "csv_to_json",
      },
    });

    // 5. CsvTable selection copy in InputPane ("Copy as CSV" chip)
    const inputTable = screen.getByTestId("input-table");
    fireEvent.click(within(inputTable).getByTestId("glide-row-select-0"));
    fireEvent.click(screen.getByTestId("input-table-copy"));
    expect(plausible).toHaveBeenLastCalledWith("Export", {
      props: {
        via: "copy",
        format: "csv",
        pane: "input",
        direction: "csv_to_json",
      },
    });

    // 6. Flip to JSON→CSV and test CsvTable selection copy in OutputPane (chip + Cmd/Ctrl+C)
    await flip();
    const outputTable = await screen.findByTestId("output-table");
    fireEvent.click(within(outputTable).getByTestId("glide-row-select-0"));
    fireEvent.click(screen.getByTestId("output-table-copy"));
    expect(plausible).toHaveBeenLastCalledWith("Export", {
      props: {
        via: "copy",
        format: "csv",
        pane: "output",
        direction: "json_to_csv",
      },
    });

    // Cmd/Ctrl+C inside the focused output grid
    plausible.mockClear();
    within(outputTable).getByTestId("glide-grid-mock").focus();
    const copyEvent = new Event("copy", { bubbles: true, cancelable: true });
    Object.defineProperty(copyEvent, "clipboardData", {
      value: { setData: () => {} },
    });
    window.dispatchEvent(copyEvent);
    expect(plausible).toHaveBeenCalledTimes(1);
    expect(plausible).toHaveBeenCalledWith("Export", {
      props: {
        via: "copy",
        format: "csv",
        pane: "output",
        direction: "json_to_csv",
      },
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
  it("unclamps the converter shell on <md, compacts secondary header action labels on <sm, and collapses the options bar into the Parse settings drop-up", async () => {
    const user = userEvent.setup();
    // Below the fit threshold (see index.css --breakpoint-fit): collapsed
    // options bar + stacked panes.
    setMediaQueryMatches(false);
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

    // The options bar collapses to the Parse settings drop-up trigger below
    // the fit threshold; the summary names the active options and flips with
    // the direction. Opening the menu then flipping direction also exercises
    // the outside-click dismissal (the seam switch is outside the bar).
    const settingsToggle = screen.getByTestId("options-settings-toggle");
    expect(settingsToggle).toHaveAttribute("aria-expanded", "false");
    expect(
      screen.getByTestId("options-settings-summary")
    ).toHaveTextContent("Auto · Parse numbers · Parse JSON");

    await user.click(settingsToggle);
    expect(settingsToggle).toHaveAttribute("aria-expanded", "true");

    await user.click(screen.getByTestId("divider-switch"));
    expect(screen.getByTestId("options-settings-summary")).toHaveTextContent(
      "Auto"
    );
    expect(settingsToggle).toHaveAttribute("aria-expanded", "false");
    expect(settingsToggle).toHaveFocus();
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

describe("TopBar Recent history popover & empty boot (AC-12 / D11)", () => {
  it("boots to the clean empty dropzone on reload even when snapshots exist, records valid conversions, restores on click (with CSV undo), and supports Clear history", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<App />);

    // Fresh visit starts at empty dropzone with no saved snapshots
    expect(screen.getByTestId("dropzone")).toBeInTheDocument();
    expect(screen.queryByTestId("recent-history-count")).toBeNull();

    // Load sample CSV -> settles valid conversion -> saved to recent history
    await user.click(screen.getByTestId("try-example"));
    await waitFor(() => {
      expect(screen.getByTestId("output-view").textContent).toContain(
        '"The White Stripes"'
      );
    });
    expect(screen.getByTestId("recent-history-count")).toHaveTextContent("1");

    // Upload a second CSV file so we have 2 distinct snapshots
    const secondCsv = "city,pop\nTokyo,14000000\nParis,2100000";
    const file = createStreamableFile("cities.csv", secondCsv);
    fireEvent.change(screen.getByTestId("file-input"), {
      target: { files: [file] },
    });
    await waitFor(() => {
      expect(screen.getByTestId("output-view").textContent).toContain('"Tokyo"');
    });
    expect(screen.getByTestId("recent-history-count")).toHaveTextContent("2");

    // Simulate reload: unmount and mount a fresh <App /> over the same localStorage
    unmount();
    render(<App />);

    // Must boot to the clean empty dropzone, NOT auto-restoring the last conversion
    expect(screen.getByTestId("dropzone")).toBeInTheDocument();
    expect(screen.getByTestId("recent-history-count")).toHaveTextContent("2");

    // Open the Recent popover and restore the uploaded cities.csv snapshot
    await user.click(screen.getByTestId("recent-history-toggle"));
    const popout = screen.getByTestId("recent-history-popout");
    const items = within(popout).getAllByTestId(/^recent-history-item-/);
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent("cities.csv");

    await user.click(items[0]);
    expect(screen.queryByTestId("recent-history-popout")).toBeNull();
    await waitFor(() => {
      expect(screen.getByTestId("output-view").textContent).toContain('"Tokyo"');
    });

    // Now restore the earlier sample snapshot while already in csv2json -> pushes prior CSV to undo history
    await user.click(screen.getByTestId("recent-history-toggle"));
    const updatedPopout = screen.getByTestId("recent-history-popout");
    const updatedItems = within(updatedPopout).getAllByTestId(
      /^recent-history-item-/
    );
    await user.click(updatedItems[1]);
    await waitFor(() => {
      expect(screen.getByTestId("output-view").textContent).toContain(
        '"The White Stripes"'
      );
    });
    expect(screen.getByTestId("csv-undo-button")).not.toBeDisabled();

    // Clear all history from the popover
    await user.click(screen.getByTestId("recent-history-toggle"));
    await user.click(screen.getByTestId("recent-history-clear"));
    expect(screen.getByTestId("recent-history-empty")).toBeInTheDocument();
    expect(screen.queryByTestId("recent-history-count")).toBeNull();
  });
});

describe("Developer egress formats in OutputPane header (AC-13 / D12)", () => {
  it("switches between JSON, JSONL, SQL, and TS in CSV→JSON mode, updates Copy/Download output and extensions, and hides the switcher in JSON→CSV mode", async () => {
    const user = userEvent.setup();
    render(<App />);

    // Output format switcher is rendered in CSV→JSON mode with JSON active by default
    const switcher = screen.getByTestId("output-format-switcher");
    expect(switcher).toBeInTheDocument();
    const jsonBtn = screen.getByTestId("output-format-option-json");
    const jsonlBtn = screen.getByTestId("output-format-option-jsonl");
    const sqlBtn = screen.getByTestId("output-format-option-sql");
    const tsBtn = screen.getByTestId("output-format-option-ts");
    expect(jsonBtn).toHaveAttribute("aria-pressed", "true");
    expect(jsonlBtn).toHaveAttribute("aria-pressed", "false");
    expect(sqlBtn).toHaveAttribute("aria-pressed", "false");
    expect(tsBtn).toHaveAttribute("aria-pressed", "false");

    // Upload a CSV file so filename-based SQL table naming and download extensions are exercised
    const csvContent = "id,album,year\n1,Elephant,2003\n2,De Stijl,2000";
    const file = createStreamableFile("studio-albums.csv", csvContent);
    fireEvent.change(screen.getByTestId("file-input"), {
      target: { files: [file] },
    });
    await waitFor(() => {
      expect(screen.getByTestId("output-view").textContent).toContain(
        '"Elephant"'
      );
    });

    // Switch to JSONL
    await user.click(jsonlBtn);
    expect(jsonlBtn).toHaveAttribute("aria-pressed", "true");
    await waitFor(() => {
      const text = screen.getByTestId("output-view").textContent ?? "";
      expect(text).toContain('{"id":1,"album":"Elephant","year":2003}');
      expect(text).toContain('{"id":2,"album":"De Stijl","year":2000}');
    });
    vi.mocked(copyText).mockClear();
    vi.mocked(downloadText).mockClear();
    await user.click(screen.getByTestId("copy-output"));
    expect(copyText).toHaveBeenCalledWith(
      '{"id":1,"album":"Elephant","year":2003}\n{"id":2,"album":"De Stijl","year":2000}'
    );
    await user.click(screen.getByTestId("download-output"));
    expect(downloadText).toHaveBeenCalledWith(
      '{"id":1,"album":"Elephant","year":2003}\n{"id":2,"album":"De Stijl","year":2000}',
      "studio-albums.jsonl",
      { mime: "application/x-ndjson", bom: false }
    );

    // Switch to SQL
    await user.click(sqlBtn);
    expect(sqlBtn).toHaveAttribute("aria-pressed", "true");
    await waitFor(() => {
      const sqlText = screen.getByTestId("output-view").textContent ?? "";
      expect(sqlText).toContain('CREATE TABLE "studio_albums"');
      expect(sqlText).toContain(
        'INSERT INTO "studio_albums" ("id", "album", "year") VALUES'
      );
      expect(sqlText).toContain("(1, 'Elephant', 2003)");
    });
    vi.mocked(downloadText).mockClear();
    await user.click(screen.getByTestId("download-output"));
    expect(downloadText).toHaveBeenCalledWith(
      expect.stringContaining('CREATE TABLE "studio_albums"'),
      "studio-albums.sql",
      { mime: "application/sql", bom: false }
    );

    // Switch to TS
    await user.click(tsBtn);
    expect(tsBtn).toHaveAttribute("aria-pressed", "true");
    await waitFor(() => {
      const tsText = screen.getByTestId("output-view").textContent ?? "";
      expect(tsText).toContain("export interface DataRow {");
      expect(tsText).toContain("id: number;");
      expect(tsText).toContain("album: string;");
      expect(tsText).toContain("export const data: DataRow[] = [");
    });
    vi.mocked(downloadText).mockClear();
    await user.click(screen.getByTestId("download-output"));
    expect(downloadText).toHaveBeenCalledWith(
      expect.stringContaining("export interface DataRow {"),
      "studio-albums.ts",
      { mime: "text/typescript", bom: false }
    );

    // Switch back to JSON -> editable mode restored
    await user.click(jsonBtn);
    expect(jsonBtn).toHaveAttribute("aria-pressed", "true");
    await waitFor(() => {
      expect(screen.getByTestId("output-view").textContent).toContain(
        '"album": "Elephant"'
      );
    });

    // Flip to JSON→CSV -> egress format switcher is hidden
    await flip();
    expect(screen.queryByTestId("output-format-switcher")).toBeNull();
  });

  it("pins per-column types from the CSV table selection bar and updates JSON output immediately, resetting on Clear (AC-16 / D15)", async () => {
    const user = userEvent.setup();
    render(<App />);

    fireEvent.change(screen.getByTestId("paste-field"), {
      target: { value: "zip,amount,active\n90210,42,yes\n10001,99,no" },
    });

    // By default, 90210 is parsed as number 90210 and "yes" stays string "yes"
    await waitFor(() => {
      const output = JSON.parse(screen.getByTestId("output-view").textContent ?? "[]");
      expect(output).toEqual([
        { zip: 90210, amount: 42, active: "yes" },
        { zip: 10001, amount: 99, active: "no" },
      ]);
    });

    // Select column 0 ("zip" -> grid col 1) and pin to String
    await user.click(screen.getByTestId("glide-select-column-1"));
    await user.click(screen.getByTestId("input-table-column-type-string"));

    await waitFor(() => {
      const output = JSON.parse(screen.getByTestId("output-view").textContent ?? "[]");
      expect(output).toEqual([
        { zip: "90210", amount: 42, active: "yes" },
        { zip: "10001", amount: 99, active: "no" },
      ]);
    });
    expect(screen.getByTestId("glide-header-1")).toHaveTextContent("ZIP [STR]");

    // Select column 2 ("active" -> grid col 3) and pin to Boolean
    await user.click(screen.getByTestId("glide-select-column-3"));
    await user.click(screen.getByTestId("input-table-column-type-boolean"));

    await waitFor(() => {
      const output = JSON.parse(screen.getByTestId("output-view").textContent ?? "[]");
      expect(output).toEqual([
        { zip: "90210", amount: 42, active: true },
        { zip: "10001", amount: 99, active: false },
      ]);
    });
    expect(screen.getByTestId("glide-header-3")).toHaveTextContent("ACTIVE [BOOL]");
    expect(screen.getByTestId("input-table-column-types-reset")).toHaveTextContent(
      "2 column types pinned"
    );

    // Clear input -> resets pinned column types
    await user.click(screen.getByTestId("clear-input"));
    fireEvent.change(screen.getByTestId("paste-field"), {
      target: { value: "zip,amount,active\n90210,42,yes" },
    });
    await waitFor(() => {
      const output = JSON.parse(screen.getByTestId("output-view").textContent ?? "[]");
      expect(output).toEqual([{ zip: 90210, amount: 42, active: "yes" }]);
    });
    expect(screen.queryByTestId("input-table-column-types-reset")).toBeNull();
  });
});

describe("Symmetric JSON → CSV nested object flatten pill (AC-15 / D14)", () => {
  it("surfaces the contextual Flatten nested keys pill in JSON → CSV mode, toggles options.flatten, and flattens deep objects into dotted CSV columns", async () => {
    const user = userEvent.setup();
    render(<App />);
    await flip();

    const nestedJson = JSON.stringify([
      {
        id: 1,
        user: { profile: { name: "Ada", city: "London" } },
        tags: ["math", "code"],
      },
      {
        id: 2,
        user: { profile: { name: "Grace", city: "NY" } },
        tags: ["compilers"],
      },
    ]);
    fireEvent.paste(screen.getByTestId("input-pane"), {
      clipboardData: { getData: () => nestedJson },
    });

    const bar = await screen.findByTestId("json-flatten-bar");
    expect(bar).toBeInTheDocument();
    const pill = screen.getByTestId("json-flatten-pill");
    expect(pill).toHaveAttribute("aria-pressed", "false");
    expect(pill).toHaveTextContent("Flatten nested keys (.user, .tags)");

    // Before toggling flatten: output table keeps nested object/array as unflattened JSON cells
    await waitFor(() => {
      expect(screen.getByTestId("output-table")).toHaveTextContent(
        '{"profile":{"name":"Ada","city":"London"}}'
      );
    });

    // Click pill to enable flatten
    await user.click(pill);
    expect(pill).toHaveAttribute("aria-pressed", "true");
    expect(pill).toHaveTextContent("Flattened nested keys (.user, .tags)");

    await waitFor(() => {
      const outputTable = screen.getByTestId("output-table");
      expect(outputTable).toHaveTextContent(/user\.profile\.name/i);
      expect(outputTable).toHaveTextContent(/user\.profile\.city/i);
      expect(outputTable).toHaveTextContent("math, code");
    });

    // Click pill again to disable flatten -> restores JSON-encoded nested cell values
    await user.click(pill);
    expect(pill).toHaveAttribute("aria-pressed", "false");
    expect(pill).toHaveTextContent("Flatten nested keys (.user, .tags)");
    await waitFor(() => {
      const outputTable = screen.getByTestId("output-table");
      expect(outputTable).not.toHaveTextContent(/user\.profile\.name/i);
      expect(outputTable).toHaveTextContent('{"profile":{"name":"Ada","city":"London"}}');
    });
  });

  it("truncates more than 3 nested keys with +N more and hides the bar when JSON input is flat", async () => {
    const user = userEvent.setup();
    render(<App />);
    await flip();

    const fiveNestedKeys = JSON.stringify([
      {
        a: { v: 1 },
        b: { v: 2 },
        c: [1, 2],
        d: { v: 4 },
        e: ["x"],
      },
    ]);
    fireEvent.paste(screen.getByTestId("input-pane"), {
      clipboardData: { getData: () => fiveNestedKeys },
    });

    const pill = await screen.findByTestId("json-flatten-pill");
    expect(pill).toHaveTextContent("Flatten nested keys (.a, .b, .c, +2 more)");

    // Clear and ingest flat JSON -> flatten bar hides
    await user.click(screen.getByTestId("clear-input"));
    fireEvent.paste(screen.getByTestId("input-pane"), {
      clipboardData: { getData: () => '[{"id":1,"name":"Ada"}]' },
    });
    await waitFor(() => {
      expect(screen.getByTestId("output-table")).toHaveTextContent("Ada");
    });
    expect(screen.queryByTestId("json-flatten-bar")).toBeNull();
  });
});

describe("Markdown & CLI box table paste in CSV → JSON (AC-14 / D13)", () => {
  it("auto-renders Markdown pipe tables in the CSV table and JSON output, surfaces Clean Markdown table pill, normalizes raw input in place, and supports undo", async () => {
    const user = userEvent.setup();
    render(<App />);

    const mdTable = [
      "| name | role | score |",
      "| :--- | :---: | ---: |",
      "| Ada | Engineer | 98 |",
      "| Linus | Kernel | 95 |",
    ].join("\n");

    fireEvent.change(screen.getByTestId("paste-field"), {
      target: { value: mdTable },
    });

    await waitFor(() => {
      const output = JSON.parse(
        screen.getByTestId("output-view").textContent ?? "[]"
      );
      expect(output).toEqual([
        { name: "Ada", role: "Engineer", score: 98 },
        { name: "Linus", role: "Kernel", score: 95 },
      ]);
    });

    const inputTable = screen.getByTestId("input-table");
    expect(within(inputTable).getByText("NAME")).toBeInTheDocument();
    expect(within(inputTable).getByText("ROLE")).toBeInTheDocument();
    expect(within(inputTable).getByText("SCORE")).toBeInTheDocument();
    expect(within(inputTable).getByText("Ada")).toBeInTheDocument();

    const pill = screen.getByTestId("csv-clean-markdown-pill");
    expect(pill).toHaveTextContent("Clean Markdown table (2 rows)");

    await user.click(pill);

    expect(screen.queryByTestId("csv-clean-markdown-pill")).toBeNull();

    await user.click(screen.getByTestId("raw-toggle"));
    const rawEditor = screen.getByTestId(
      "input-editor"
    ) as HTMLTextAreaElement;
    expect(rawEditor.value).toBe(
      "name,role,score\nAda,Engineer,98\nLinus,Kernel,95"
    );

    await user.click(screen.getByTestId("csv-undo-button"));
    expect(rawEditor.value).toBe(mdTable);
    expect(screen.getByTestId("csv-clean-markdown-pill")).toHaveTextContent(
      "Clean Markdown table (2 rows)"
    );
  });

  it("auto-renders psql ASCII box tables and surfaces Clean CLI table pill", async () => {
    const user = userEvent.setup();
    render(<App />);

    const psqlTable = [
      " id | host      | port ",
      "----+-----------+------",
      "  1 | db-prod-1 | 5432 ",
      "  2 | db-read-2 | 5433 ",
      "(2 rows)",
    ].join("\n");

    fireEvent.change(screen.getByTestId("paste-field"), {
      target: { value: psqlTable },
    });

    await waitFor(() => {
      const output = JSON.parse(
        screen.getByTestId("output-view").textContent ?? "[]"
      );
      expect(output).toEqual([
        { id: 1, host: "db-prod-1", port: 5432 },
        { id: 2, host: "db-read-2", port: 5433 },
      ]);
    });

    const pill = screen.getByTestId("csv-clean-markdown-pill");
    expect(pill).toHaveTextContent("Clean CLI table (2 rows)");

    await user.click(pill);
    expect(screen.queryByTestId("csv-clean-markdown-pill")).toBeNull();
  });

  it("extracts all tables from a multi-table Markdown document and switches active table via chooser pills (AC-18 / D17)", async () => {
    const user = userEvent.setup();
    render(<App />);

    const multiTableMarkdown = [
      "# Q3 Executive Summary",
      "Below are the regional and product breakdowns:",
      "",
      "## By Region",
      "| region | revenue |",
      "| :--- | ---: |",
      "| NA | 1200 |",
      "| EU | 950 |",
      "",
      "## Top Products",
      "| sku | product | units |",
      "| :--- | :--- | ---: |",
      "| A-1 | Widget | 40 |",
      "| B-2 | Gadget | 25 |",
      "| C-3 | Gizmo | 15 |",
      "",
      "Let me know if you need Q4 projections.",
    ].join("\n");

    fireEvent.change(screen.getByTestId("paste-field"), {
      target: { value: multiTableMarkdown },
    });

    await waitFor(() => {
      const output = JSON.parse(
        screen.getByTestId("output-view").textContent ?? "[]"
      );
      expect(output).toEqual([
        { region: "NA", revenue: 1200 },
        { region: "EU", revenue: 950 },
      ]);
    });

    const select0 = screen.getByTestId("csv-markdown-table-select-0");
    const select1 = screen.getByTestId("csv-markdown-table-select-1");
    expect(select0).toHaveAttribute("aria-pressed", "true");
    expect(select0).toHaveTextContent("1. By Region (2×2)");
    expect(select1).toHaveAttribute("aria-pressed", "false");
    expect(select1).toHaveTextContent("2. Top Products (3×3)");

    const cleanBtn = screen.getByTestId("csv-clean-markdown-pill");
    expect(cleanBtn).toHaveTextContent("Use only this table (2 rows)");

    // Switch to Table 2 (Top Products)
    await user.click(select1);

    expect(select0).toHaveAttribute("aria-pressed", "false");
    expect(select1).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("csv-clean-markdown-pill")).toHaveTextContent(
      "Use only this table (3 rows)"
    );

    const inputTable = screen.getByTestId("input-table");
    expect(within(inputTable).getByText("SKU")).toBeInTheDocument();
    expect(within(inputTable).getByText("PRODUCT")).toBeInTheDocument();
    expect(within(inputTable).getByText("Widget")).toBeInTheDocument();

    await waitFor(() => {
      const output = JSON.parse(
        screen.getByTestId("output-view").textContent ?? "[]"
      );
      expect(output).toEqual([
        { sku: "A-1", product: "Widget", units: 40 },
        { sku: "B-2", product: "Gadget", units: 25 },
        { sku: "C-3", product: "Gizmo", units: 15 },
      ]);
    });

    // Click "Use only this table" to replace raw input with Table 2's clean CSV
    await user.click(screen.getByTestId("csv-clean-markdown-pill"));
    expect(screen.queryByTestId("csv-markdown-table-bar")).toBeNull();

    await user.click(screen.getByTestId("raw-toggle"));
    const rawEditor = screen.getByTestId(
      "input-editor"
    ) as HTMLTextAreaElement;
    expect(rawEditor.value).toBe(
      "sku,product,units\nA-1,Widget,40\nB-2,Gadget,25\nC-3,Gizmo,15"
    );

    // Undo restores the full multi-table Markdown document
    await user.click(screen.getByTestId("csv-undo-button"));
    expect(rawEditor.value).toBe(multiTableMarkdown);
    expect(screen.getByTestId("csv-markdown-table-bar")).toBeInTheDocument();
  });
});

describe("View-Driven Output: Column Picker & Apply view to output (AC-11 / D10)", () => {
  it("projects filtered/sorted/column-subsetted CSV into JSON output and Copy/Download when Apply view to output is enabled without mutating raw input", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByTestId("try-example"));
    const inputTable = await screen.findByTestId("input-table");
    const outputPane = screen.getByTestId("output-pane");

    // Default sample conversion has all 6 rows and 3 columns
    await waitFor(() => {
      expect(outputPane.textContent).toContain("6 rows · 3 cols");
    });
    expect(screen.queryByTestId("input-table-apply-view")).toBeNull();

    // Open Columns popover on input table and hide column 2 (US_peak_chart_post)
    await user.click(screen.getByTestId("input-table-columns-button"));
    await user.click(screen.getByTestId("input-table-column-toggle-2"));

    // Sort by column 2 (year) descending (2 clicks on glide-header-2)
    await user.click(within(inputTable).getByTestId("glide-header-2"));
    await user.click(within(inputTable).getByTestId("glide-header-2"));

    // While Apply view to output is off (default), output still has all 3 columns
    const applyBtn = screen.getByTestId("input-table-apply-view");
    expect(applyBtn).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByTestId("output-view").textContent).toContain(
      "US_peak_chart_post"
    );

    // Enable Apply view to output -> JSON output and status badge reflect the 2 visible columns & descending year sort
    await user.click(applyBtn);
    expect(applyBtn).toHaveAttribute("aria-pressed", "true");

    await waitFor(() => {
      expect(outputPane.textContent).toContain("6 rows · 2 cols");
    });
    const outText = screen.getByTestId("output-view").textContent ?? "";
    expect(outText).not.toContain("US_peak_chart_post");
    const parsed = JSON.parse(outText);
    expect(parsed).toEqual([
      { album: "Icky Thump", year: 2007 },
      { album: "Get Behind Me Satan", year: 2005 },
      { album: "Elephant", year: 2003 },
      { album: "White Blood Cells", year: 2001 },
      { album: "De Stijl", year: 2000 },
      { album: "The White Stripes", year: 1999 },
    ]);

    // Raw input CSV is never mutated — copying input still emits the original 3-column CSV
    vi.mocked(copyText).mockClear();
    await user.click(screen.getByTestId("copy-input"));
    expect(vi.mocked(copyText).mock.lastCall?.[0]).toContain(
      "US_peak_chart_post"
    );

    // Toggling Apply view to output off restores full 3-column conversion immediately
    await user.click(applyBtn);
    expect(applyBtn).toHaveAttribute("aria-pressed", "false");
    await waitFor(() => {
      expect(outputPane.textContent).toContain("6 rows · 3 cols");
    });
    expect(screen.getByTestId("output-view").textContent).toContain(
      "US_peak_chart_post"
    );
  });

  it("exports the projected CSV view on Copy and Download in JSON → CSV mode when Apply view to output is enabled on the output table", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByTestId("try-example"));
    await screen.findByTestId("input-table");
    await waitFor(() => {
      expect(screen.getByTestId("output-view").textContent).toContain(
        "The White Stripes"
      );
    });

    // Flip to JSON → CSV mode and wait for the CSV output table to finish converting
    await flip();
    const outputTable = await screen.findByTestId("output-table");
    await waitFor(() => {
      expect(
        within(outputTable).getByTestId("glide-grid-headers")
      ).toHaveTextContent("#ALBUMYEARUS_PEAK_CHART_POST");
    });

    // Hide column 2 (US_peak_chart_post) in output table
    await user.click(screen.getByTestId("output-table-columns-button"));
    await user.click(screen.getByTestId("output-table-column-toggle-2"));

    // Turn on Apply view to output on the output CSV table
    const applyOutBtn = screen.getByTestId("output-table-apply-view");
    await user.click(applyOutBtn);
    expect(applyOutBtn).toHaveAttribute("aria-pressed", "true");

    vi.mocked(copyText).mockClear();
    vi.mocked(downloadText).mockClear();
    await user.click(screen.getByTestId("copy-output"));
    expect(copyText).toHaveBeenCalledWith(
      [
        "album,year",
        "The White Stripes,1999",
        "De Stijl,2000",
        "White Blood Cells,2001",
        "Elephant,2003",
        "Get Behind Me Satan,2005",
        "Icky Thump,2007",
      ].join("\n")
    );

    await user.click(screen.getByTestId("download-output"));
    expect(downloadText).toHaveBeenCalledWith(
      [
        "album,year",
        "The White Stripes,1999",
        "De Stijl,2000",
        "White Blood Cells,2001",
        "Elephant,2003",
        "Get Behind Me Satan,2005",
        "Icky Thump,2007",
      ].join("\n"),
      "data.csv",
      { mime: "text/csv", bom: true }
    );
  });
});

describe("Expanded Dropzone format descriptions and file input accept types (AC-19 / D18)", () => {
  it("describes all supported CSV/Markdown/CLI and JSON/JSONL formats and updates file-input accept across directions", async () => {
    render(<App />);

    // CSV -> JSON empty state
    expect(screen.getByTestId("dropzone-title")).toHaveTextContent(
      "Paste CSV, TSV, or Markdown table"
    );
    expect(screen.getByTestId("dropzone-formats")).toHaveTextContent(
      "Supports CSV, TSV / spreadsheet cells, Markdown & ChatGPT docs (multi-table), and psql / MySQL box tables"
    );
    expect(screen.getByTestId("paste-field")).toHaveAttribute(
      "placeholder",
      "Paste CSV, TSV, Markdown, or psql/MySQL table here"
    );
    expect(screen.getByTestId("file-input")).toHaveAttribute(
      "accept",
      ".csv,.tsv,.txt,.md,text/csv,text/tab-separated-values,text/markdown"
    );

    // Flip to JSON -> CSV empty state
    await flip();
    expect(screen.getByTestId("dropzone-title")).toHaveTextContent(
      "Paste JSON or JSONL here"
    );
    expect(screen.getByTestId("dropzone-formats")).toHaveTextContent(
      "Supports JSON arrays, nested objects, wrapped API payloads ({ data: […] }), and JSONL / NDJSON"
    );
    expect(screen.getByTestId("paste-field")).toHaveAttribute(
      "placeholder",
      "Paste JSON, JSONL / NDJSON, or API response here"
    );
    expect(screen.getByTestId("file-input")).toHaveAttribute(
      "accept",
      ".json,.jsonl,.ndjson,.txt,application/json,application/x-ndjson"
    );
  });
});







