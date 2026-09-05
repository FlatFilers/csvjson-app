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
import { copyText } from "@/lib/clipboard";
import { downloadText } from "@/lib/download";

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
    await waitFor(() => {
      expect(screen.getByTestId("output-view")).toBeInTheDocument();
    });
    const jsonOutput = screen.getByTestId("output-view").textContent;
    expect(jsonOutput).toContain('"Elephant"');

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
      expect(screen.getByTestId("output-view")).toBeInTheDocument();
    });
    expect(screen.getByTestId("output-view").textContent).toContain("Elephant");
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

  it("keeps a paste inside the output CodeMirror local", async () => {
    render(<App />);
    fireEvent.click(screen.getByTestId("try-example"));
    await waitFor(() => {
      expect(screen.getByTestId("output-view")).toBeInTheDocument();
    });
    const inputBefore = screen.getByTestId("input-table").textContent;
    const outputBefore = screen.getByTestId("output-view").textContent;
    // The read-only output editor sets contenteditable=false — the .cm-editor
    // ancestor check is what keeps this paste local instead of rerouted.
    pasteOn(screen.getByTestId("output-view"), "INJECTED");

    expect(screen.getByTestId("input-table").textContent).toBe(inputBefore);
    expect(screen.getByTestId("output-view").textContent).toBe(outputBefore);
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