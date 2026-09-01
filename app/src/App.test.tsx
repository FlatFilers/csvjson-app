import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";

const SAMPLE_CSV_INPUT = "album,year\nElephant,2003\nDe Stijl,2000";

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