import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CsvTable } from "./CsvTable";

// jsdom has no layout: the virtualizer reads offsetWidth/offsetHeight, which
// report 0, so nothing renders. Give every element a 600px viewport.
beforeEach(() => {
  vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(600);
  vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(800);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("CsvTable", () => {
  it("renders headers and rows from CSV text", () => {
    render(<CsvTable text={"album,year\nDe Stijl,2000\nElephant,2003"} />);
    expect(screen.getByText("album")).toBeInTheDocument();
    expect(screen.getByText("Elephant")).toBeInTheDocument();
  });

  it("renders monospace numerics for numeric columns", () => {
    render(<CsvTable text={"album,year\nDe Stijl,2000"} />);
    // Data rows render once the virtualizer sees a real viewport.
    const yearCell = screen.getByTitle("2000");
    expect(yearCell.className).toContain("font-mono");
    const albumCell = screen.getByTitle("De Stijl");
    expect(albumCell.className).not.toContain("font-mono");
  });

  it("detects TSV input without a forced delimiter", () => {
    render(<CsvTable text={"album\tyear\nDe Stijl\t2000"} />);
    expect(screen.getByText("album")).toBeInTheDocument();
    expect(screen.getByTitle("2000")).toBeInTheDocument();
  });

  it("renders only a virtualized window of a 10k-row table", () => {
    // Give the scroll container a real viewport: jsdom has no layout, so the
    // virtualizer would otherwise render zero rows (criterion 5 evidence).
    const rect = {
      width: 800,
      height: 600,
      top: 0,
      left: 0,
      right: 800,
      bottom: 600,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    };
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(
      () => ({ ...rect, top: 0, left: 0 }) as DOMRect
    );

    const rows = Array.from({ length: 10000 }, (_, i) => `row-${i},2000`).join("\n");
    render(<CsvTable text={`album,year\n${rows}`} />);

    const meta = screen.getByTestId("csv-table");
    expect(meta).toBeInTheDocument();
    const rendered = meta.querySelectorAll("[data-row-index]").length;
    // Virtualized: only a viewport window renders, never all 10k rows.
    expect(rendered).toBeGreaterThan(0);
    expect(rendered).toBeLessThan(100);
    expect(screen.getByTitle("row-0")).toBeInTheDocument();

  });
});

/* ── View powers (spec: CSV table superpowers, PR A) ─────────────────────── */

const FIXTURE = [
  "album,year",
  "De Stijl,2000",
  "Elephant,2003",
  "White Blood Cells,2001",
  "Get Behind Me Satan,2005",
].join("\n");

/** DOM order of source row indices — the rendered view order. */
function viewOrder(testId: string): number[] {
  return Array.from(
    document.querySelectorAll(`[data-testid="${testId}"] [data-source-index]`)
  ).map((el) => Number((el as HTMLElement).dataset.sourceIndex));
}

/** Stub jsdom's missing clipboard and return the writeText spy. */
function stubClipboard() {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText },
    configurable: true,
  });
  return writeText;
}

describe("CsvTable search toolbar", () => {
  it("renders toolbar and count chip for both table instances", () => {
    render(
      <>
        <CsvTable text={FIXTURE} testId="input-table" />
        <CsvTable text={FIXTURE} testId="output-table" />
      </>
    );
    for (const id of ["input-table", "output-table"]) {
      expect(screen.getByTestId(`${id}-toolbar`)).toBeInTheDocument();
      expect(screen.getByTestId(`${id}-count`)).toHaveTextContent("4 rows");
      expect(screen.getByTestId(id)).toHaveAttribute("role", "grid");
      expect(screen.getByTestId(id)).toHaveAttribute("aria-rowcount", "5");
    }
  });

  it.each(["input-table", "output-table"])(
    "filters rows with a live count chip (%s)",
    async (testId) => {
      const user = userEvent.setup();
      render(<CsvTable text={FIXTURE} testId={testId} />);
      await user.type(screen.getByTestId(`${testId}-search`), "2003");
      await waitFor(() =>
        expect(screen.getByTestId(`${testId}-count`)).toHaveTextContent("1 of 4")
      );
      expect(screen.getByTitle("Elephant")).toBeInTheDocument();
      expect(screen.queryByTitle("De Stijl")).not.toBeInTheDocument();
      // aria-rowcount follows the filtered view, not the source.
      expect(screen.getByTestId(testId)).toHaveAttribute("aria-rowcount", "2");
    }
  );

  it("highlights matches in-cell across the matching cells", async () => {
    const user = userEvent.setup();
    render(<CsvTable text={FIXTURE} />);
    await user.type(screen.getByTestId("csv-table-search"), "stijl");
    await waitFor(() => {
      // The row is visible before and after filtering — the mark only appears
      // once the debounced query lands.
      expect(screen.getByTitle("De Stijl").querySelector("mark")).not.toBeNull();
    });
    const cell = screen.getByTitle("De Stijl");
    expect(cell.querySelector("mark")).toHaveTextContent("Stijl"); // case-insensitive hit
    // The numeric year column of the same row has no match — untouched.
    expect(screen.getByTitle("2000").querySelector("mark")).toBeNull();
  });

  it("clears the filter via the × button", async () => {
    const user = userEvent.setup();
    render(<CsvTable text={FIXTURE} />);
    await user.type(screen.getByTestId("csv-table-search"), "Elephant");
    await waitFor(() =>
      expect(screen.getByTestId("csv-table-count")).toHaveTextContent("1 of 4")
    );
    await user.click(screen.getByTestId("csv-table-clear-search"));
    await waitFor(() =>
      expect(screen.getByTestId("csv-table-count")).toHaveTextContent("4 rows")
    );
    expect(screen.getByTitle("De Stijl")).toBeInTheDocument();
    expect(screen.getByTestId("csv-table-search")).toHaveValue("");
  });

  it("clears the filter via Escape in the search input", async () => {
    const user = userEvent.setup();
    render(<CsvTable text={FIXTURE} />);
    const input = screen.getByTestId("csv-table-search");
    await user.type(input, "Elephant");
    await waitFor(() =>
      expect(screen.getByTestId("csv-table-count")).toHaveTextContent("1 of 4")
    );
    await user.type(input, "{Escape}");
    await waitFor(() =>
      expect(screen.getByTestId("csv-table-count")).toHaveTextContent("4 rows")
    );
    expect(input).toHaveValue("");
  });

  it("shows the empty-filter state with a clear action, never a blank grid", async () => {
    const user = userEvent.setup();
    render(<CsvTable text={FIXTURE} />);
    await user.type(screen.getByTestId("csv-table-search"), "zzz-nothing");
    const empty = await screen.findByTestId("csv-table-empty-filter");
    expect(empty).toHaveTextContent("No rows matching");
    await user.click(screen.getByRole("button", { name: "Show all rows" }));
    await waitFor(() =>
      expect(screen.getByTestId("csv-table-count")).toHaveTextContent("4 rows")
    );
    expect(screen.queryByTestId("csv-table-empty-filter")).not.toBeInTheDocument();
  });

  it("keeps the source row number in the gutter while filtered", async () => {
    const user = userEvent.setup();
    render(<CsvTable text={FIXTURE} />);
    await user.type(screen.getByTestId("csv-table-search"), "satan");
    // Source row 4 (0-based index 3) — not view position 1.
    await waitFor(() => expect(viewOrder("csv-table")).toEqual([3]));
    expect(screen.getByTestId("csv-table-row-select")).toHaveTextContent("4");
  });
});

describe("CsvTable sorting", () => {
  it("cycles asc → desc → natural with aria-sort and restores source order", async () => {
    const user = userEvent.setup();
    render(<CsvTable text={FIXTURE} />);
    const header = screen.getByRole("columnheader", { name: "year" });
    expect(header).not.toHaveAttribute("aria-sort");

    await user.click(header); // asc
    expect(header).toHaveAttribute("aria-sort", "ascending");
    expect(viewOrder("csv-table")).toEqual([0, 2, 1, 3]); // 2000, 2001, 2003, 2005

    await user.click(header); // desc
    expect(header).toHaveAttribute("aria-sort", "descending");
    expect(viewOrder("csv-table")).toEqual([3, 1, 2, 0]);

    await user.click(header); // natural
    expect(header).not.toHaveAttribute("aria-sort");
    expect(viewOrder("csv-table")).toEqual([0, 1, 2, 3]);
  });

  it("sorts a numeric column numerically, not lexically", async () => {
    const user = userEvent.setup();
    render(<CsvTable text={"id\n999\n1000\n11"} />);
    await user.click(screen.getByRole("columnheader", { name: "id" }));
    expect(viewOrder("csv-table")).toEqual([2, 0, 1]); // 11, 999, 1000
  });

  it("sorts text columns with localeCompare", async () => {
    const user = userEvent.setup();
    render(<CsvTable text={"name\nzebra\napple\nMango"} />);
    await user.click(screen.getByRole("columnheader", { name: "name" }));
    expect(viewOrder("csv-table")).toEqual([1, 2, 0]); // apple, Mango, zebra
  });
});

describe("CsvTable selection and copy", () => {
  it("selects a row from the gutter and reports the count", async () => {
    const user = userEvent.setup();
    render(<CsvTable text={FIXTURE} />);
    const gutters = screen.getAllByTestId("csv-table-row-select");
    await user.click(gutters[1]); // view pos 1 = source row 2 ("2" gutter)
    const rows = document.querySelectorAll('[data-testid="csv-table"] [data-source-index]');
    expect(rows[1]).toHaveAttribute("aria-selected", "true");
    expect(rows[0]).toHaveAttribute("aria-selected", "false");
    expect(screen.getByTestId("csv-table-selected-count")).toHaveTextContent("1 selected");
  });

  it("shift-click selects a view range", async () => {
    const user = userEvent.setup();
    render(<CsvTable text={FIXTURE} />);
    const gutters = screen.getAllByTestId("csv-table-row-select");
    await user.click(gutters[0]);
    // user-event click options do not forward modifier keys — dispatch the
    // click with eventInit directly.
    fireEvent.click(gutters[2], { shiftKey: true });
    expect(screen.getByTestId("csv-table-selected-count")).toHaveTextContent("3 selected");
    const selected = document
      .querySelectorAll('[data-testid="csv-table"] [data-source-index]');
    expect(selected[0]).toHaveAttribute("aria-selected", "true");
    expect(selected[1]).toHaveAttribute("aria-selected", "true");
    expect(selected[2]).toHaveAttribute("aria-selected", "true");
    expect(selected[3]).toHaveAttribute("aria-selected", "false");
  });

  it("cmd/ctrl-click toggles rows", async () => {
    render(<CsvTable text={FIXTURE} />);
    const gutters = screen.getAllByTestId("csv-table-row-select");
    fireEvent.click(gutters[0], { metaKey: true });
    fireEvent.click(gutters[2], { ctrlKey: true });
    expect(screen.getByTestId("csv-table-selected-count")).toHaveTextContent("2 selected");
    fireEvent.click(gutters[0], { metaKey: true }); // toggle off
    expect(screen.getByTestId("csv-table-selected-count")).toHaveTextContent("1 selected");
  });

  it("chip and clipboard agree when the filter hides selected rows", async () => {
    const user = userEvent.setup();
    const writeText = stubClipboard();
    render(<CsvTable text={FIXTURE} />);
    const gutters = screen.getAllByTestId("csv-table-row-select");
    fireEvent.click(gutters[1], { metaKey: true }); // Elephant (source 2)
    fireEvent.click(gutters[3], { metaKey: true }); // Satan (source 4)
    expect(screen.getByTestId("csv-table-selected-count")).toHaveTextContent("2 selected");

    // Filter keeps Elephant (2003) but hides Satan (2005): the chip counts
    // only the selected row still in view — exactly what Copy will emit.
    await user.type(screen.getByTestId("csv-table-search"), "2003");
    await waitFor(() =>
      expect(screen.getByTestId("csv-table-count")).toHaveTextContent("1 of 4")
    );
    expect(screen.getByTestId("csv-table-selected-count")).toHaveTextContent("1 selected");
    await user.click(screen.getByTestId("csv-table-copy"));
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    expect(writeText).toHaveBeenCalledWith("album,year\nElephant,2003");
  });

  it("selection survives filter and sort; copy emits view-ordered CSV with headers", async () => {
    const user = userEvent.setup();
    const writeText = stubClipboard();
    render(<CsvTable text={FIXTURE} />);
    const gutters = screen.getAllByTestId("csv-table-row-select");
    // Select source rows 1 (Elephant, 2003) and 3 (Satan, 2005).
    fireEvent.click(gutters[1], { metaKey: true });
    fireEvent.click(gutters[3], { metaKey: true });

    // Sort year descending: view order [3, 1, 2, 0] — selection is by source
    // index, so it follows its rows through the sort.
    await user.click(screen.getByRole("columnheader", { name: "year" }));
    await user.click(screen.getByRole("columnheader", { name: "year" }));
    expect(screen.getByTestId("csv-table-selected-count")).toHaveTextContent("2 selected");

    // Filter to the still-visible halves — selection count must not change.
    await user.type(screen.getByTestId("csv-table-search"), "200");
    await waitFor(() =>
      expect(screen.getByTestId("csv-table-count")).toHaveTextContent("4 of 4")
    );
    expect(screen.getByTestId("csv-table-selected-count")).toHaveTextContent("2 selected");

    await user.click(screen.getByTestId("csv-table-copy"));
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    expect(writeText).toHaveBeenCalledWith(
      ["album,year", "Get Behind Me Satan,2005", "Elephant,2003"].join("\n")
    );
  });

  it("wires aria-rowindex and aria-colindex for the virtualized grid", () => {
    render(<CsvTable text={FIXTURE} />);
    expect(screen.getByRole("columnheader", { name: "album" })).toHaveAttribute("aria-colindex", "2");
    const row0 = document.querySelector('[data-testid="csv-table"] [data-source-index="0"]');
    expect(row0).toHaveAttribute("aria-rowindex", "2"); // header row is 1
    // Every child of the row is a real cell role, so AT can traverse the
    // grid cell-by-cell: gutter + 2 columns.
    const cells = row0?.querySelectorAll('[role="gridcell"]');
    expect(cells?.length).toBe(3);
    expect(cells?.[0]).toHaveAttribute("aria-colindex", "1");
    expect(cells?.[1]).toHaveAttribute("aria-colindex", "2");
    // The gutter button keeps its own semantics inside its cell.
    expect(cells?.[0].querySelector("button")).toHaveAttribute("aria-label", "Select row 1");
  });

  it("clear empties the selection", async () => {
    const user = userEvent.setup();
    render(<CsvTable text={FIXTURE} />);
    const gutters = screen.getAllByTestId("csv-table-row-select");
    await user.click(gutters[0]);
    expect(screen.getByTestId("csv-table-selected-count")).toBeInTheDocument();
    await user.click(screen.getByTestId("csv-table-clear-selection"));
    expect(screen.queryByTestId("csv-table-selected-count")).not.toBeInTheDocument();
    expect(document.querySelector('[aria-selected="true"]')).toBeNull();
  });
});

/* ── Cell editing (spec: CSV table superpowers, PR B — input table only) ─── */

describe("CsvTable cell editing", () => {
  it("opens an editor pre-filled with the raw cell text on click", async () => {
    const user = userEvent.setup();
    render(<CsvTable text={FIXTURE} onCellCommit={() => {}} />);
    await user.click(screen.getByTitle("De Stijl"));
    const editor = screen.getByTestId("csv-table-cell-editor");
    expect(editor).toHaveValue("De Stijl");
    expect(editor).toHaveAttribute("aria-label", "Edit album, row 1");
  });

  it("opens the editor with Enter on a focused cell", async () => {
    const user = userEvent.setup();
    render(<CsvTable text={FIXTURE} onCellCommit={() => {}} />);
    const cell = screen.getByTitle("Elephant");
    cell.focus();
    await user.keyboard("{Enter}");
    expect(screen.getByTestId("csv-table-cell-editor")).toHaveValue("Elephant");
  });

  it("commits on Enter with the full grid re-serialized", async () => {
    const user = userEvent.setup();
    const onCellCommit = vi.fn();
    render(<CsvTable text={FIXTURE} onCellCommit={onCellCommit} />);
    await user.click(screen.getByTitle("De Stijl"));
    const editor = screen.getByTestId("csv-table-cell-editor");
    await user.clear(editor);
    await user.type(editor, "De Stijl II");
    await user.keyboard("{Enter}");
    expect(onCellCommit).toHaveBeenCalledTimes(1);
    expect(onCellCommit).toHaveBeenCalledWith(
      ["album,year", "De Stijl II,2000", "Elephant,2003", "White Blood Cells,2001", "Get Behind Me Satan,2005"].join("\n")
    );
    expect(screen.queryByTestId("csv-table-cell-editor")).not.toBeInTheDocument();
  });

  it("cancels on Escape with no commit and the cell unchanged", async () => {
    const user = userEvent.setup();
    const onCellCommit = vi.fn();
    render(<CsvTable text={FIXTURE} onCellCommit={onCellCommit} />);
    await user.click(screen.getByTitle("De Stijl"));
    const editor = screen.getByTestId("csv-table-cell-editor");
    await user.clear(editor);
    await user.type(editor, "junk");
    await user.keyboard("{Escape}");
    expect(onCellCommit).not.toHaveBeenCalled();
    expect(screen.queryByTestId("csv-table-cell-editor")).not.toBeInTheDocument();
    expect(screen.getByTitle("De Stijl")).toBeInTheDocument();
  });
  it("commits on blur when clicking away", async () => {
    const user = userEvent.setup();
    const onCellCommit = vi.fn();
    render(<CsvTable text={FIXTURE} onCellCommit={onCellCommit} />);
    await user.click(screen.getByTitle("De Stijl"));
    const editor = screen.getByTestId("csv-table-cell-editor");
    await user.clear(editor);
    await user.type(editor, "De Stijl III");
    await user.click(screen.getByTestId("csv-table-search"));
    expect(onCellCommit).toHaveBeenCalledTimes(1);
    expect(onCellCommit).toHaveBeenCalledWith(expect.stringContaining("De Stijl III,2000"));
    expect(screen.queryByTestId("csv-table-cell-editor")).not.toBeInTheDocument();
  });

  it("Tab commits and advances to the next cell", async () => {
    const user = userEvent.setup();
    const onCellCommit = vi.fn();
    render(<CsvTable text={FIXTURE} onCellCommit={onCellCommit} />);
    await user.click(screen.getByTitle("De Stijl"));
    const editor = screen.getByTestId("csv-table-cell-editor");
    await user.clear(editor);
    await user.type(editor, "De Stijl IV");
    await user.keyboard("{Tab}");
    expect(onCellCommit).toHaveBeenCalledTimes(1);
    expect(onCellCommit).toHaveBeenCalledWith(expect.stringContaining("De Stijl IV,2000"));
    // The editor reopened on the next cell of the same row (raw value).
    const next = screen.getByTestId("csv-table-cell-editor");
    expect(next).toHaveValue("2000");
    expect(next).toHaveAttribute("aria-label", "Edit year, row 1");
  });

  it("Shift+Tab moves back to the previous cell without a write", async () => {
    const user = userEvent.setup();
    const onCellCommit = vi.fn();
    render(<CsvTable text={FIXTURE} onCellCommit={onCellCommit} />);
    await user.click(screen.getByTitle("2000")); // row 1, col year
    await user.keyboard("{Shift>}{Tab}{/Shift}");
    expect(onCellCommit).not.toHaveBeenCalled(); // unchanged value skips the write
    expect(screen.getByTestId("csv-table-cell-editor")).toHaveValue("De Stijl");
  });

  it("Tab on the last cell closes the editor", async () => {
    const user = userEvent.setup();
    const onCellCommit = vi.fn();
    render(<CsvTable text={FIXTURE} onCellCommit={onCellCommit} />);
    await user.click(screen.getByTitle("2005")); // last row, last column
    await user.keyboard("{Tab}");
    expect(onCellCommit).not.toHaveBeenCalled();
    expect(screen.queryByTestId("csv-table-cell-editor")).not.toBeInTheDocument();
  });

  it("wraps Tab from the last column to the next view row's first cell", async () => {
    const user = userEvent.setup();
    render(<CsvTable text={FIXTURE} onCellCommit={() => {}} />);
    await user.click(screen.getByTitle("2000")); // row 1, col year
    await user.keyboard("{Tab}");
    expect(screen.getByTestId("csv-table-cell-editor")).toHaveValue("Elephant");
  });

  it("serializes a committed cell containing the delimiter or quotes", async () => {
    const user = userEvent.setup();
    const onCellCommit = vi.fn();
    render(<CsvTable text={FIXTURE} onCellCommit={onCellCommit} />);
    await user.click(screen.getByTitle("De Stijl"));
    const editor = screen.getByTestId("csv-table-cell-editor");
    await user.clear(editor);
    await user.type(editor, 'Stijl, "v2"');
    await user.keyboard("{Enter}");
    expect(onCellCommit).toHaveBeenCalledWith(
      expect.stringContaining('"Stijl, ""v2""",2000')
    );
  });

  it("committing by clicking another cell opens the new cell's editor", async () => {
    const user = userEvent.setup();
    const onCellCommit = vi.fn();
    render(<CsvTable text={FIXTURE} onCellCommit={onCellCommit} />);
    await user.click(screen.getByTitle("De Stijl"));
    await user.type(screen.getByTestId("csv-table-cell-editor"), " IX");
    await user.click(screen.getByTitle("Elephant"));
    expect(onCellCommit).toHaveBeenCalledTimes(1);
    expect(onCellCommit).toHaveBeenCalledWith(expect.stringContaining("De Stijl IX,2000"));
    expect(screen.getByTestId("csv-table-cell-editor")).toHaveValue("Elephant");
  });

  it("keeps editing usable while filtered, keyed to the source row", async () => {
    const user = userEvent.setup();
    render(<CsvTable text={FIXTURE} onCellCommit={() => {}} />);
    await user.type(screen.getByTestId("csv-table-search"), "2003");
    await waitFor(() =>
      expect(screen.getByTestId("csv-table-count")).toHaveTextContent("1 of 4")
    );
    await user.click(screen.getByTitle("Elephant"));
    const editor = screen.getByTestId("csv-table-cell-editor");
    expect(editor).toHaveValue("Elephant");
    expect(editor).toHaveAttribute("aria-label", "Edit album, row 2"); // source row, not view position
  });

  it("gives the output table zero editing affordances", async () => {
    const user = userEvent.setup();
    render(<CsvTable text={FIXTURE} testId="output-table" />);
    await user.click(screen.getByTitle("De Stijl"));
    expect(screen.queryByTestId("output-table-cell-editor")).not.toBeInTheDocument();
    expect(screen.queryByTestId("csv-table-cell-editor")).not.toBeInTheDocument();
    const cell = screen.getByTitle("De Stijl");
    expect(cell).not.toHaveAttribute("tabindex");
    expect(cell.className).not.toContain("cursor-text");
  });
});
