import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import App from "./App";

const SAMPLE_CSV_INPUT = "album,year\nElephant,2003\nDe Stijl,2000";

function inputEditor() {
  return screen.getByTestId("input-editor") as HTMLTextAreaElement;
}

async function typeInput(text: string) {
  const user = userEvent.setup();
  await user.type(screen.getByTestId("input-editor"), text);
  // Wait for the debounced conversion to land in the output pane.
  await waitFor(
    () => {
      expect(screen.getByTestId("output-view").textContent).not.toBe("");
    },
    { timeout: 2000 }
  );
}

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
    await typeInput(SAMPLE_CSV_INPUT);

    // CSV → JSON: output is JSON for the two rows.
    const jsonOutput = screen.getByTestId("output-view").textContent;
    expect(jsonOutput).toContain('"Elephant"');

    // Flip: the JSON output becomes the input, panes swap roles.
    await flip();
    await waitFor(() => {
      expect(inputEditor().value).toBe(jsonOutput);
    });
    expect(screen.getByTestId("output-view").textContent).toContain("Elephant");
  });

  it("flips without waiting for the debounce and never wipes the input", async () => {
    render(<App />);
    const user = userEvent.setup({ delay: null });
    // Type and flip immediately — inside the 150ms debounce window. The
    // memoized result still holds the previous (empty) conversion; the
    // handler must convert the CURRENT input instead.
    await user.type(inputEditor(), SAMPLE_CSV_INPUT);
    await flip();
    expect(inputEditor().value).toContain("Elephant");
  });

  it("leaves the input untouched when the output is an error", async () => {
    render(<App />);
    await typeInput(SAMPLE_CSV_INPUT);

    // Flip to JSON → CSV, then break the input. user-event's key parser
    // chokes on literal braces, so set the value directly.
    await flip();
    fireEvent.change(inputEditor(), { target: { value: "bad json {{{" } });
    await waitFor(
      () => {
        expect(screen.getByTestId("pane-status")).toBeInTheDocument();
      },
      { timeout: 2000 }
    );

    const broken = inputEditor().value;
    await flip();
    expect(inputEditor().value).toBe(broken);
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
