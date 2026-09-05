import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EditorView } from "@codemirror/view";
import App from "@/App";
import { DEFAULT_OPTIONS, convertText } from "@/lib/convert";

/**
 * Editable-output state machine (edited-state machine, Option 2): the first
 * user modification of the JSON output freezes regeneration behind an
 * explicit warning; only Revert, Discard & reconvert, a valid flip, and
 * paths that fully regenerate the output clear it. Nothing ever silently
 * discards an edit — the failure class PR #197 eliminated.
 */

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

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

const EDITED_TEXT = '[{"custom":"edited"}]';

/** The mounted output EditorView, for deterministic in-place edits. */
function outputEditorView(): EditorView {
  const host = screen.getByTestId("output-view");
  const editor = host.querySelector(".cm-editor") as HTMLElement;
  const view = EditorView.findFromDOM(editor);
  if (!view) throw new Error("output EditorView not found");
  return view;
}

/** Replaces the whole output document — the strongest form of an edit. */
function replaceDoc(text: string) {
  return (view: EditorView) =>
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: text },
    });
}

async function editOutput(mutate: (view: EditorView) => void) {
  await act(async () => {
    mutate(outputEditorView());
  });
}

const outputStatus = () =>
  within(screen.getByTestId("output-pane")).getByTestId("pane-status");
const outputContent = () =>
  screen.getByTestId("output-view").querySelector(".cm-content") as HTMLElement;

/** Populates the converter with the sample CSV and waits for the output. */
async function populate() {
  fireEvent.click(screen.getByTestId("try-example"));
  await screen.findByTestId("output-view");
}

/** Lets any (wrongly) scheduled regeneration land before an is-unchanged assertion. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 300));

/** Converts and throws on failure — test-expectation helper. */
function expectConverted(
  direction: Parameters<typeof convertText>[0],
  input: string
): string {
  const result = convertText(direction, input, DEFAULT_OPTIONS);
  if (!result.ok) throw new Error(`expected conversion to succeed: ${result.error}`);
  return result.text;
}

describe("edited flag lifecycle", () => {
  it("marks the output edited on the first modification: badge, revert, freeze notice", async () => {
    render(<App />);
    await populate();

    // Pristine: no badge, no notice, editor is editable.
    expect(screen.queryByTestId("edited-badge")).not.toBeInTheDocument();
    expect(outputContent().getAttribute("contenteditable")).toBe("true");

    await editOutput(replaceDoc(EDITED_TEXT));

    const badge = screen.getByTestId("edited-badge");
    expect(badge).toHaveAttribute("aria-label", "Output edited");
    expect(screen.getByTestId("revert-output")).toBeInTheDocument();
    expect(outputStatus()).toHaveTextContent(
      "Output edited — CSV and option changes aren't applied."
    );
    expect(
      within(outputStatus()).getByTestId("discard-reconvert")
    ).toHaveTextContent("Discard edits & reconvert");
    // The edited text stays visible — never clobbered, never hidden.
    expect(outputEditorView().state.doc.toString()).toBe(EDITED_TEXT);
  });

  it("clears edited on Revert — and re-runs the conversion from the CURRENT input", async () => {
    render(<App />);
    await populate();
    await editOutput(replaceDoc(EDITED_TEXT));

    // While frozen, the input moves on — Revert must convert the CURRENT
    // input, not the snapshot the output was derived from.
    fireEvent.click(screen.getByTestId("raw-toggle"));
    fireEvent.change(screen.getByTestId("input-editor") as HTMLTextAreaElement, {
      target: { value: "a,b\n1,2" },
    });
    await settle();

    fireEvent.click(screen.getByTestId("revert-output"));
    const expected = expectConverted("csv2json", "a,b\n1,2");
    await waitFor(() => {
      expect(outputEditorView().state.doc.toString()).toBe(expected);
    });
    expect(screen.queryByTestId("edited-badge")).not.toBeInTheDocument();
    expect(screen.queryByTestId("pane-status")).not.toBeInTheDocument();
  });

  it("clears edited on Discard & reconvert the same way", async () => {
    render(<App />);
    await populate();
    await editOutput(replaceDoc(EDITED_TEXT));

    fireEvent.click(screen.getByTestId("raw-toggle"));
    fireEvent.change(screen.getByTestId("input-editor") as HTMLTextAreaElement, {
      target: { value: "a,b\n1,2" },
    });
    await settle();

    fireEvent.click(screen.getByTestId("discard-reconvert"));
    const expected = expectConverted("csv2json", "a,b\n1,2");
    await waitFor(() => {
      expect(outputEditorView().state.doc.toString()).toBe(expected);
    });
    expect(screen.queryByTestId("edited-badge")).not.toBeInTheDocument();
    expect(
      within(screen.getByTestId("output-pane")).queryByTestId("pane-status")
    ).not.toBeInTheDocument();
  });

  it("clears edited when the input is cleared — the output fully regenerates", async () => {
    render(<App />);
    await populate();
    await editOutput(replaceDoc(EDITED_TEXT));

    fireEvent.click(screen.getByTestId("clear-input"));
    expect(screen.getByText(/Your JSON appears here/)).toBeInTheDocument();
    expect(screen.queryByTestId("edited-badge")).not.toBeInTheDocument();
    expect(
      within(screen.getByTestId("output-pane")).queryByTestId("pane-status")
    ).not.toBeInTheDocument();
  });
});

describe("freeze while edited", () => {
  it("input edits do not regenerate the output", async () => {
    render(<App />);
    await populate();
    await editOutput(replaceDoc(EDITED_TEXT));

    fireEvent.click(screen.getByTestId("raw-toggle"));
    fireEvent.change(screen.getByTestId("input-editor") as HTMLTextAreaElement, {
      target: { value: "a,b\n1,2" },
    });
    await settle(); // let any wrongly-scheduled regeneration land

    expect(outputEditorView().state.doc.toString()).toBe(EDITED_TEXT);
    expect(outputStatus()).toHaveTextContent(/Output edited/);
  });

  it("option toggles do not regenerate the output", async () => {
    render(<App />);
    await populate();
    await editOutput(replaceDoc(EDITED_TEXT));

    const user = userEvent.setup();
    await user.click(screen.getByRole("checkbox", { name: "Parse numbers" }));
    await user.click(screen.getByRole("checkbox", { name: "Minify" }));
    await settle();

    expect(outputEditorView().state.doc.toString()).toBe(EDITED_TEXT);
    expect(outputStatus()).toHaveTextContent(/Output edited/);
  });

  it("uploads do not regenerate the output", async () => {
    render(<App />);
    await populate();
    await editOutput(replaceDoc(EDITED_TEXT));

    const file = new File(["zip,color\n00721,blue"], "colors.csv", {
      type: "text/csv",
    });
    fireEvent.drop(screen.getByTestId("input-pane"), {
      dataTransfer: { files: [file], types: ["Files"] },
    });
    await screen.findByText(/colors\.csv/); // input took the upload
    await settle();

    expect(outputEditorView().state.doc.toString()).toBe(EDITED_TEXT);
    expect(outputStatus()).toHaveTextContent(/Output edited/);
  });

  it("a routed paste over the output chrome replaces the input but keeps the edited output", async () => {
    render(<App />);
    await populate();
    await editOutput(replaceDoc(EDITED_TEXT));

    // Distinctive headers prove the routed paste landed (the dense table
    // renders cells without commas — never assert on "1,2").
    fireEvent.paste(screen.getByTestId("output-pane"), {
      clipboardData: { getData: () => "fever,dog\n1,2" },
    });
    await waitFor(() => {
      expect(screen.getByTestId("input-table").textContent).toContain(
        "feverdog"
      );
    });

    expect(outputEditorView().state.doc.toString()).toBe(EDITED_TEXT);
    expect(outputStatus()).toHaveTextContent(/Output edited/);
  });
});

describe("invalid mid-edit JSON", () => {
  it("keeps the invalid edited text visible with the lint indication and the freeze notice", async () => {
    render(<App />);
    await populate();
    await editOutput(replaceDoc("{broken"));

    // The invalid text stays visible (CodeMirror's parse-lint markers are
    // the indication); no conversion runs; the freeze notice remains.
    expect(outputEditorView().state.doc.toString()).toBe("{broken");
    expect(outputStatus()).toHaveTextContent(/Output edited/);
    // Still editable — a broken edit never locks the pane.
    expect(outputContent().getAttribute("contenteditable")).toBe("true");
  });
});

describe("flip interplay while edited", () => {
  it("adopts a VALID edited output as the new input", async () => {
    render(<App />);
    await populate();
    await editOutput(replaceDoc(EDITED_TEXT));

    const user = userEvent.setup();
    await user.click(screen.getByTestId("divider-switch"));

    // The edited JSON became the input; direction flipped; conversion ran
    // (array of objects → CSV columns). The output table exists immediately
    // as the retained result — wait for the NEW conversion to land (the
    // input debounce is 150ms).
    await screen.findByTestId("output-table");
    expect(screen.getByTestId("input-editor").textContent).toBe(EDITED_TEXT);
    await waitFor(() => {
      expect(screen.getByTestId("output-table").textContent).toContain(
        "custom"
      );
    });
    expect(screen.queryByTestId("edited-badge")).not.toBeInTheDocument();
    expect(
      within(screen.getByTestId("output-pane")).queryByTestId("pane-status")
    ).not.toBeInTheDocument();
  });

  it("leaves the input untouched when the edited output is INVALID JSON", async () => {
    render(<App />);
    await populate();
    await editOutput(replaceDoc("{broken"));

    const user = userEvent.setup();
    await user.click(screen.getByTestId("divider-switch"));

    // Error-output rule: the input keeps the CSV it had. The direction
    // still flips, so the (CSV) input fails JSON conversion in the new
    // direction — the output reports that error, edited state cleared.
    await screen.findByTestId("output-table");
    expect(screen.getByTestId("input-editor").textContent).toContain(
      "album,year"
    );
    expect(
      within(screen.getByTestId("output-pane")).getByTestId("pane-status")
    ).toBeInTheDocument();
    expect(screen.queryByTestId("edited-badge")).not.toBeInTheDocument();
  });
});

describe("copy and download read the edited text", () => {
  it("copy delivers the edited output", async () => {
    render(<App />);
    await populate();
    await editOutput(replaceDoc(EDITED_TEXT));

    fireEvent.click(screen.getByTestId("copy-output"));
    expect(copyText).toHaveBeenCalledWith(EDITED_TEXT);
  });

  it("download delivers the edited output", async () => {
    render(<App />);
    await populate();
    await editOutput(replaceDoc(EDITED_TEXT));

    fireEvent.click(screen.getByTestId("download-output"));
    expect(downloadText).toHaveBeenCalledWith(
      EDITED_TEXT,
      "data.json",
      expect.objectContaining({ mime: "application/json" })
    );
  });
});

describe("editable window", () => {
  it("returns the output to read-only for a retained invalid-input result and back", async () => {
    render(<App />);
    await populate();
    expect(outputContent().getAttribute("contenteditable")).toBe("true");

    // Break the input: the last valid output is retained, read-only. The
    // retained state's signal is the header label (pane-status carries the
    // parse error itself).
    fireEvent.click(screen.getByTestId("raw-toggle"));
    const editor = screen.getByTestId("input-editor") as HTMLTextAreaElement;
    fireEvent.change(editor, { target: { value: 'a,b\n"x"y,z' } });
    await waitFor(
      () => {
        expect(screen.getByTestId("stale-notice")).toHaveTextContent(
          /Last valid result/
        );
      },
      { timeout: 2000 }
    );
    expect(outputContent().getAttribute("contenteditable")).toBe("false");

    // Fix the input: a fresh valid result regenerates the editable output.
    fireEvent.change(editor, { target: { value: "a,b\n1,2" } });
    await waitFor(() => {
      expect(outputContent().getAttribute("contenteditable")).toBe("true");
    });
    const expected = expectConverted("csv2json", "a,b\n1,2");
    await waitFor(() => {
      expect(outputEditorView().state.doc.toString()).toBe(expected);
    });
  });
});
