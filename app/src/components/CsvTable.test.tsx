import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useState } from "react";
import "../test/glideDataEditorMock";
import { CsvTable } from "./CsvTable";

/**
 * The canvas grid cannot run in jsdom, so DataEditorCore is swapped for a
 * mock that renders the same data through the component's real view logic
 * (see test/glideDataEditorMock.tsx). These tests cover everything that is
 * OUR code: toolbar, filtering, sorting state, selection bookkeeping, CSV
 * serialization of selections, and the guarded edit-commit splice. Genuine
 * canvas gestures (drag ranges, shift+arrow, fill, the cell editor) are
 * validated with browser dogfood evidence instead of faked here.
 */

const FIXTURE = [
  "album,year",
  "De Stijl,2000",
  "Elephant,2003",
  "White Blood Cells,2001",
  "Get Behind Me Satan,2005",
].join("\n");

afterEach(() => {
  vi.restoreAllMocks();
});

/** Cell text of a mock-rendered row (view position y, grid column x). */
function cellText(y: number, x: number, testId = "csv-table"): string {
  const row = document.querySelector(`[data-testid="${testId}"] [data-testid="glide-row-${y}"]`);
  const cell = row?.querySelector(`[data-col="${x}"]`);
  return cell?.getAttribute("data-cell") ?? "";
}

/** Source row numbers in view order — read from the rendered gutter cells. */
function viewSourceRows(testId = "csv-table"): number[] {
  const rows = document.querySelectorAll(
    `[data-testid="${testId}"] [data-testid^="glide-row-"]`
  );
  return Array.from(rows)
    .filter((row) => /^glide-row-\d+$/.test(row.getAttribute("data-testid") ?? ""))
    .map((row) => Number(row.querySelector('[data-col="0"]')?.getAttribute("data-cell")));
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

describe("CsvTable rendering", () => {
  it("renders headers, gutter numbering, and data rows from CSV text", () => {
    render(<CsvTable text={FIXTURE} />);
    expect(screen.getByTestId("glide-grid-headers")).toHaveTextContent("#ALBUMYEAR");
    expect(viewSourceRows()).toEqual([1, 2, 3, 4]);
    expect(cellText(0, 1)).toBe("De Stijl");
    expect(cellText(1, 2)).toBe("2003");
  });

  it("detects TSV input without a forced delimiter", () => {
    render(<CsvTable text={"album\tyear\nDe Stijl\t2000"} />);
    expect(cellText(0, 1)).toBe("De Stijl");
    expect(cellText(0, 2)).toBe("2000");
  });

  it("renders only the mock's window of a 10k-row table but reports the full count", () => {
    const rows = Array.from({ length: 10000 }, (_, i) => `row-${i},2000`).join("\n");
    render(<CsvTable text={`album,year\n${rows}`} />);
    expect(screen.getByTestId("csv-table-count")).toHaveTextContent("10,000 rows");
    // The mock caps its DOM at 200 rows; the real canvas virtualizes to the
    // viewport. Both prove the grid never mounts 10k DOM rows.
    expect(document.querySelectorAll('[data-testid^="glide-row-"]').length).toBeLessThan(300);
    expect(screen.getByTestId("csv-table")).toHaveAttribute("aria-rowcount", "10001");
  });
});

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

  it("floors the grid wrapper at the header plus a usable window of rows", () => {
    // 4 data rows: 26px header + 4 x 24px rows = 122px, even if the pane squeezes.
    render(<CsvTable text={FIXTURE} testId="input-table" />);
    expect(screen.getByTestId("input-table")).toHaveStyle({ minHeight: "122px" });
  });

  it("filters rows with a live count chip and follows the filtered view", async () => {
    const user = userEvent.setup();
    render(<CsvTable text={FIXTURE} />);
    await user.type(screen.getByTestId("csv-table-search"), "2003");
    await waitFor(() => expect(screen.getByTestId("csv-table-count")).toHaveTextContent("1 of 4"));
    expect(viewSourceRows()).toEqual([2]); // Elephant, source row 2
    // aria-rowcount follows the filtered view (header + rows), not the source.
    expect(screen.getByTestId("csv-table")).toHaveAttribute("aria-rowcount", "2");
  });

  it("keeps the source row number in the gutter while filtered", async () => {
    const user = userEvent.setup();
    render(<CsvTable text={FIXTURE} />);
    await user.type(screen.getByTestId("csv-table-search"), "satan");
    await waitFor(() => expect(viewSourceRows()).toEqual([4]));
  });

  it("clears the filter via the × button", async () => {
    const user = userEvent.setup();
    render(<CsvTable text={FIXTURE} />);
    await user.type(screen.getByTestId("csv-table-search"), "Elephant");
    await waitFor(() => expect(screen.getByTestId("csv-table-count")).toHaveTextContent("1 of 4"));
    await user.click(screen.getByTestId("csv-table-clear-search"));
    await waitFor(() => expect(screen.getByTestId("csv-table-count")).toHaveTextContent("4 rows"));
    expect(viewSourceRows()).toEqual([1, 2, 3, 4]);
    expect(screen.getByTestId("csv-table-search")).toHaveValue("");
  });

  it("clears the filter via Escape in the search input", async () => {
    const user = userEvent.setup();
    render(<CsvTable text={FIXTURE} />);
    const input = screen.getByTestId("csv-table-search");
    await user.type(input, "Elephant");
    await waitFor(() => expect(screen.getByTestId("csv-table-count")).toHaveTextContent("1 of 4"));
    await user.type(input, "{Escape}");
    await waitFor(() => expect(screen.getByTestId("csv-table-count")).toHaveTextContent("4 rows"));
    expect(input).toHaveValue("");
  });

  it("shows the empty-filter state with a clear action, never a blank grid", async () => {
    const user = userEvent.setup();
    render(<CsvTable text={FIXTURE} />);
    await user.type(screen.getByTestId("csv-table-search"), "zzz-nothing");
    const empty = await screen.findByTestId("csv-table-empty-filter");
    expect(empty).toHaveTextContent("No rows matching");
    await user.click(screen.getByRole("button", { name: "Show all rows" }));
    await waitFor(() => expect(screen.getByTestId("csv-table-count")).toHaveTextContent("4 rows"));
    expect(screen.queryByTestId("csv-table-empty-filter")).not.toBeInTheDocument();
  });
});

describe("CsvTable sorting", () => {
  it("cycles asc → desc → natural through header clicks and restores source order", async () => {
    const user = userEvent.setup();
    render(<CsvTable text={FIXTURE} />);
    // Grid columns: 0 gutter, 1 album, 2 year.
    await user.click(screen.getByTestId("glide-header-2")); // asc
    expect(viewSourceRows()).toEqual([1, 3, 2, 4]); // 2000, 2001, 2003, 2005
    await user.click(screen.getByTestId("glide-header-2")); // desc
    expect(viewSourceRows()).toEqual([4, 2, 3, 1]);
    await user.click(screen.getByTestId("glide-header-2")); // natural
    expect(viewSourceRows()).toEqual([1, 2, 3, 4]);
  });

  it("sorts a numeric column numerically, not lexically", async () => {
    const user = userEvent.setup();
    render(<CsvTable text={"id\n999\n1000\n11"} />);
    await user.click(screen.getByTestId("glide-header-1"));
    expect(viewSourceRows()).toEqual([3, 1, 2]); // 11, 999, 1000
  });

  it("sorts text columns with localeCompare", async () => {
    const user = userEvent.setup();
    render(<CsvTable text={"name\nzebra\napple\nMango"} />);
    await user.click(screen.getByTestId("glide-header-1"));
    expect(viewSourceRows()).toEqual([2, 3, 1]); // apple, Mango, zebra
  });

  it("sorts integers beyond Number.MAX_SAFE_INTEGER exactly", async () => {
    const user = userEvent.setup();
    render(<CsvTable text={"id\n9007199254740993\n9007199254740994"} />);
    await user.click(screen.getByTestId("glide-header-1"));
    expect(viewSourceRows()).toEqual([1, 2]);
  });
});

describe("CsvTable selection and copy", () => {
  it("selects a row from the gutter and reports the count", async () => {
    const user = userEvent.setup();
    render(<CsvTable text={FIXTURE} />);
    await user.click(screen.getByTestId("glide-row-select-1"));
    expect(screen.getByTestId("csv-table-selected-count")).toHaveTextContent("1 selected");
  });

  it("shift-click selects a view range", () => {
    render(<CsvTable text={FIXTURE} />);
    fireEvent.click(screen.getByTestId("glide-row-select-0"));
    fireEvent.click(screen.getByTestId("glide-row-select-2"), { shiftKey: true });
    expect(screen.getByTestId("csv-table-selected-count")).toHaveTextContent("3 selected");
  });

  it("cmd/ctrl-click toggles rows", () => {
    render(<CsvTable text={FIXTURE} />);
    fireEvent.click(screen.getByTestId("glide-row-select-0"), { metaKey: true });
    fireEvent.click(screen.getByTestId("glide-row-select-2"), { ctrlKey: true });
    expect(screen.getByTestId("csv-table-selected-count")).toHaveTextContent("2 selected");
    fireEvent.click(screen.getByTestId("glide-row-select-0"), { metaKey: true }); // toggle off
    expect(screen.getByTestId("csv-table-selected-count")).toHaveTextContent("1 selected");
  });

  it("Copy as CSV emits the selected rows with headers, in view order", async () => {
    const user = userEvent.setup();
    const writeText = stubClipboard();
    render(<CsvTable text={FIXTURE} />);
    fireEvent.click(screen.getByTestId("glide-row-select-1"), { metaKey: true });
    fireEvent.click(screen.getByTestId("glide-row-select-3"), { metaKey: true });
    await user.click(screen.getByTestId("csv-table-copy"));
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    expect(writeText).toHaveBeenCalledWith("album,year\nElephant,2003\nGet Behind Me Satan,2005");
  });

  it("chip and clipboard agree when the filter hides selected rows", async () => {
    const user = userEvent.setup();
    const writeText = stubClipboard();
    render(<CsvTable text={FIXTURE} />);
    fireEvent.click(screen.getByTestId("glide-row-select-1"), { metaKey: true }); // Elephant
    fireEvent.click(screen.getByTestId("glide-row-select-3"), { metaKey: true }); // Satan
    expect(screen.getByTestId("csv-table-selected-count")).toHaveTextContent("2 selected");

    // Filter keeps Elephant (2003) but hides Satan (2005): the chip counts
    // only the selected row still in view — exactly what Copy will emit.
    await user.type(screen.getByTestId("csv-table-search"), "2003");
    await waitFor(() => expect(screen.getByTestId("csv-table-count")).toHaveTextContent("1 of 4"));
    expect(screen.getByTestId("csv-table-selected-count")).toHaveTextContent("1 selected");
    await user.click(screen.getByTestId("csv-table-copy"));
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    expect(writeText).toHaveBeenCalledWith("album,year\nElephant,2003");
  });

  it("selection survives sort and copy emits view-ordered CSV with headers", async () => {
    const user = userEvent.setup();
    const writeText = stubClipboard();
    render(<CsvTable text={FIXTURE} />);
    fireEvent.click(screen.getByTestId("glide-row-select-1"), { metaKey: true }); // Elephant
    fireEvent.click(screen.getByTestId("glide-row-select-3"), { metaKey: true }); // Satan

    // Sort year descending: Satan, Elephant, De Stijl, White Blood Cells.
    await user.click(screen.getByTestId("glide-header-2"));
    await user.click(screen.getByTestId("glide-header-2"));
    expect(viewSourceRows()).toEqual([4, 2, 3, 1]);
    expect(screen.getByTestId("csv-table-selected-count")).toHaveTextContent("2 selected");

    await user.click(screen.getByTestId("csv-table-copy"));
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    expect(writeText).toHaveBeenCalledWith("album,year\nGet Behind Me Satan,2005\nElephant,2003");
  });

  it("selects a column from its header and copies it as a one-column CSV", async () => {
    const user = userEvent.setup();
    const writeText = stubClipboard();
    render(<CsvTable text={FIXTURE} />);
    await user.click(screen.getByTestId("glide-select-column-2")); // year column
    expect(screen.getByTestId("csv-table-selected-count")).toHaveTextContent("1 column selected");
    await user.click(screen.getByTestId("csv-table-copy"));
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    expect(writeText).toHaveBeenCalledWith("year\n2000\n2003\n2001\n2005");
  });

  it("Clear empties the selection and the chip disappears", async () => {
    const user = userEvent.setup();
    render(<CsvTable text={FIXTURE} />);
    await user.click(screen.getByTestId("glide-row-select-0"));
    expect(screen.getByTestId("csv-table-selected-count")).toBeInTheDocument();
    await user.click(screen.getByTestId("csv-table-clear-selection"));
    expect(screen.queryByTestId("csv-table-selected-count")).not.toBeInTheDocument();
  });

  it("intercepts the copy key while the grid holds focus and writes CSV", () => {
    render(<CsvTable text={FIXTURE} />);
    fireEvent.click(screen.getByTestId("glide-row-select-0"));
    // Focus the (mocked) canvas surface inside the grid — the same element
    // that holds focus in the real browser during a cmd+C.
    screen.getByTestId("glide-grid-mock").focus();
    // jsdom has no ClipboardEvent/DataTransfer. The interceptor delivers the
    // payload through event.clipboardData (the browser-native copy path), so
    // attach a minimal store to a cancelable "copy" Event and assert on it.
    const event = new Event("copy", { bubbles: true, cancelable: true });
    const written: Array<[string, string]> = [];
    Object.defineProperty(event, "clipboardData", {
      value: { setData: (type: string, value: string) => written.push([type, value]) },
    });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true); // native TSV copy suppressed
    expect(written).toEqual([["text/plain", "album,year\nDe Stijl,2000"]]);
  });

  it("leaves the clipboard alone when there is nothing selected", () => {
    render(<CsvTable text={FIXTURE} />);
    screen.getByTestId("glide-grid-mock").focus();
    const event = new Event("copy", { bubbles: true, cancelable: true });
    const written: Array<[string, string]> = [];
    Object.defineProperty(event, "clipboardData", {
      value: { setData: (type: string, value: string) => written.push([type, value]) },
    });
    window.dispatchEvent(event);
    // No selection → serializeGridSelection returns null → native copy runs
    // (not prevented, nothing written by us).
    expect(event.defaultPrevented).toBe(false);
    expect(written).toEqual([]);
  });
});

describe("CsvTable editing (input table only)", () => {
  it("commits a cell edit as an RFC 4180 splice of the source text", async () => {
    const user = userEvent.setup();
    const onCellCommit = vi.fn();
    render(<CsvTable text={FIXTURE} onCellCommit={onCellCommit} />);
    await user.click(screen.getByTestId("glide-edit-0-1")); // row 0, album column
    expect(onCellCommit).toHaveBeenCalledTimes(1);
    expect(onCellCommit).toHaveBeenCalledWith(
      "album,year\nEDITED,2000\nElephant,2003\nWhite Blood Cells,2001\nGet Behind Me Satan,2005"
    );
  });

  it("splices the correct source row when the view is sorted", async () => {
    const user = userEvent.setup();
    const onCellCommit = vi.fn();
    render(<CsvTable text={FIXTURE} onCellCommit={onCellCommit} />);
    await user.click(screen.getByTestId("glide-header-2")); // sort year asc: De Stijl first
    await user.click(screen.getByTestId("glide-edit-0-2")); // top row's year cell
    // View row 0 after sorting is source row 1 (De Stijl, 2000).
    expect(onCellCommit).toHaveBeenCalledWith(
      "album,year\nDe Stijl,EDITED\nElephant,2003\nWhite Blood Cells,2001\nGet Behind Me Satan,2005"
    );
  });

  it("commits an edit on a lower row without disturbing earlier rows", () => {
    const onCellCommit = vi.fn();
    render(<CsvTable text={FIXTURE} onCellCommit={onCellCommit} />);
    fireEvent.click(screen.getByTestId("glide-edit-1-1"));
    expect(onCellCommit).toHaveBeenCalledWith(expect.stringContaining("EDITED,2003"));
  });

  it("renders editing affordances for the input table but never the output table", () => {
    render(
      <>
        <CsvTable text={FIXTURE} testId="input-table" onCellCommit={() => {}} />
        <CsvTable text={FIXTURE} testId="output-table" />
      </>
    );
    // Input instance: the mock surfaces edit triggers because onCellsEdited
    // is wired (editable grid).
    expect(screen.getByTestId("input-table").querySelector('[data-testid^="glide-edit-"]')).not.toBeNull();
    // Output instance: strictly read-only — no edit affordance at all.
    expect(screen.getByTestId("output-table").querySelector('[data-testid^="glide-edit-"]')).toBeNull();
  });
});

describe("CsvTable deletion actions (input table only)", () => {
  /** Harness owning the text, so a committed deletion actually re-parses. */
  function DeletionHarness({ initial, editable = true }: { initial: string; editable?: boolean }) {
    const [text, setText] = useState(initial);
    return editable ? <CsvTable text={text} onCellCommit={setText} /> : <CsvTable text={text} />;
  }

  it("shows no delete actions without a selection", () => {
    render(<CsvTable text={FIXTURE} onCellCommit={() => {}} />);
    expect(screen.queryByTestId("csv-table-delete-rows")).toBeNull();
    expect(screen.queryByTestId("csv-table-delete-columns")).toBeNull();
  });

  it("renders delete actions for the input table but never the output table", () => {
    render(
      <>
        <CsvTable text={FIXTURE} testId="input-table" onCellCommit={() => {}} />
        <CsvTable text={FIXTURE} testId="output-table" />
      </>
    );
    // The toolbar is a sibling of the grid element, not a child.
    const inputToolbar = screen.getByTestId("input-table-toolbar");
    fireEvent.click(within(screen.getByTestId("input-table")).getByTestId("glide-row-select-0"));
    expect(within(inputToolbar).getByTestId("input-table-delete-rows")).toBeInTheDocument();

    const outputToolbar = screen.getByTestId("output-table-toolbar");
    fireEvent.click(within(screen.getByTestId("output-table")).getByTestId("glide-row-select-0"));
    // Same selection state, no deletion affordance: the output is read-only.
    expect(within(outputToolbar).getByTestId("output-table-selected-count")).toBeInTheDocument();
    expect(outputToolbar.querySelector('[data-testid$="-delete-rows"]')).toBeNull();
    expect(outputToolbar.querySelector('[data-testid$="-delete-columns"]')).toBeNull();
  });

  it("deletes a selected row from the source and clears the selection", async () => {
    const user = userEvent.setup();
    render(<DeletionHarness initial={FIXTURE} />);
    await user.click(screen.getByTestId("glide-row-select-1")); // Elephant, source row 2
    expect(screen.getByTestId("csv-table-delete-rows")).toHaveTextContent("Delete 1 row");
    await user.click(screen.getByTestId("csv-table-delete-rows"));
    await waitFor(() => expect(screen.getByTestId("csv-table-count")).toHaveTextContent("3 rows"));
    // The raw text re-parsed: source row numbers renumber to the new text.
    expect(viewSourceRows()).toEqual([1, 2, 3]);
    expect(cellText(0, 1)).toBe("De Stijl");
    expect(cellText(1, 1)).toBe("White Blood Cells");
    expect(screen.queryByTestId("csv-table-selected-count")).toBeNull();
  });

  it("deletes a multi-row view range (source rows 1-3)", async () => {
    const user = userEvent.setup();
    render(<DeletionHarness initial={FIXTURE} />);
    await user.click(screen.getByTestId("glide-row-select-0"));
    // Modifier clicks go through fireEvent — the established convention in
    // this suite (userEvent does not deliver shiftKey to the mock's onClick).
    fireEvent.click(screen.getByTestId("glide-row-select-2"), { shiftKey: true });
    expect(screen.getByTestId("csv-table-delete-rows")).toHaveTextContent("Delete 3 rows");
    await user.click(screen.getByTestId("csv-table-delete-rows"));
    await waitFor(() => expect(screen.getByTestId("csv-table-count")).toHaveTextContent("1 row"));
    expect(viewSourceRows()).toEqual([1]);
    expect(cellText(0, 1)).toBe("Get Behind Me Satan");
  });

  it("deletes the correct source rows when the view is sorted", async () => {
    const user = userEvent.setup();
    render(<DeletionHarness initial={FIXTURE} />);
    await user.click(screen.getByTestId("glide-header-2")); // year asc: De Stijl first
    await user.click(screen.getByTestId("glide-row-select-0")); // view row 0 = source row 1
    await user.click(screen.getByTestId("csv-table-delete-rows"));
    await waitFor(() => expect(screen.getByTestId("csv-table-count")).toHaveTextContent("3 rows"));
    // Source row 1 (De Stijl, first in the sorted view) was dropped — not
    // view row 0's post-parse neighbor. The year-ascending sort persists,
    // so the surviving rows re-sort into the same view order.
    expect(screen.getByTestId("csv-table").textContent).not.toContain("De Stijl");
    expect(cellText(0, 1)).toBe("White Blood Cells");
    expect(cellText(1, 1)).toBe("Elephant");
    expect(cellText(2, 1)).toBe("Get Behind Me Satan");
  });

  it("deletes a selected column's header and every row's cell", async () => {
    const user = userEvent.setup();
    render(<DeletionHarness initial={FIXTURE} />);
    // Grid column 2 = the YEAR data column (the gutter is grid column 0).
    await user.click(screen.getByTestId("glide-select-column-2"));
    expect(screen.getByTestId("csv-table-delete-columns")).toHaveTextContent("Delete 1 column");
    await user.click(screen.getByTestId("csv-table-delete-columns"));
    await waitFor(() => expect(screen.getByTestId("csv-table-count")).toHaveTextContent("4 rows"));
    expect(screen.getByTestId("glide-grid-headers")).toHaveTextContent("#ALBUM");
    expect(screen.getByTestId("glide-grid-headers")).not.toHaveTextContent("YEAR");
    expect(cellText(0, 1)).toBe("De Stijl");
  });

  it("blocks deleting the last remaining column with a disabled action and tooltip", async () => {
    const user = userEvent.setup();
    render(<DeletionHarness initial={"album\nDe Stijl\nElephant"} />);
    // Grid column 1 is the table's only DATA column (grid column 0 is the
    // gutter, which is not a data column and never counts).
    await user.click(screen.getByTestId("glide-select-column-1"));
    const deleteColumns = screen.getByTestId("csv-table-delete-columns");
    expect(deleteColumns).toBeDisabled();
    expect(deleteColumns).toHaveAttribute(
      "title",
      "At least one column must remain — the converter needs a column to detect"
    );
    await user.click(deleteColumns); // no-op
    expect(screen.getByTestId("glide-grid-headers")).toHaveTextContent("#ALBUM");
  });

  it("disables column deletion when every column is selected", () => {
    render(<DeletionHarness initial={FIXTURE} />);
    // Blend-select both DATA columns (grid columns 1-2; the gutter is 0).
    fireEvent.click(screen.getByTestId("glide-select-column-1"), { metaKey: true });
    fireEvent.click(screen.getByTestId("glide-select-column-2"), { metaKey: true });
    const deleteColumns = screen.getByTestId("csv-table-delete-columns");
    expect(deleteColumns).toHaveTextContent("Delete 2 columns");
    expect(deleteColumns).toBeDisabled();
  });

  it("keyboard Delete on selected rows deletes them via onDelete and suppresses cell-clearing", async () => {
    const user = userEvent.setup();
    render(<DeletionHarness initial={FIXTURE} />);
    await user.click(screen.getByTestId("glide-row-select-0"));
    fireEvent.click(screen.getByTestId("glide-row-select-2"), { shiftKey: true }); // rows 0-2
    const deleteKey = screen.getByTestId("glide-delete-key");
    fireEvent.click(deleteKey);
    // false tells Glide the handler owns the deletion: no cell-clearing pass.
    expect(deleteKey.getAttribute("data-delete-result")).toBe("false");
    await waitFor(() => expect(screen.getByTestId("csv-table-count")).toHaveTextContent("1 row"));
    expect(cellText(0, 1)).toBe("Get Behind Me Satan");
  });

  it("keyboard Delete on a selected column deletes it", async () => {
    const user = userEvent.setup();
    render(<DeletionHarness initial={FIXTURE} />);
    await user.click(screen.getByTestId("glide-select-column-2")); // YEAR data column
    fireEvent.click(screen.getByTestId("glide-delete-key"));
    await waitFor(() =>
      expect(screen.getByTestId("glide-grid-headers")).toHaveTextContent("#ALBUM")
    );
    expect(screen.getByTestId("glide-grid-headers")).not.toHaveTextContent("YEAR");
  });

  it("keyboard Delete over a cell range deletes the encompassed rows", async () => {
    const user = userEvent.setup();
    render(<DeletionHarness initial={FIXTURE} />);
    await user.click(screen.getByTestId("glide-select-range")); // 1x2 range: view rows 0-1
    const deleteKey = screen.getByTestId("glide-delete-key");
    fireEvent.click(deleteKey);
    expect(deleteKey.getAttribute("data-delete-result")).toBe("false");
    await waitFor(() => expect(screen.getByTestId("csv-table-count")).toHaveTextContent("2 rows"));
    expect(cellText(0, 1)).toBe("White Blood Cells");
    expect(cellText(1, 1)).toBe("Get Behind Me Satan");
  });

  it("keyboard Delete refuses to delete the only column", async () => {
    const user = userEvent.setup();
    render(<DeletionHarness initial={"album\nDe Stijl\nElephant"} />);
    await user.click(screen.getByTestId("glide-select-column-1")); // the only data column
    fireEvent.click(screen.getByTestId("glide-delete-key"));
    expect(screen.getByTestId("glide-delete-key").getAttribute("data-delete-result")).toBe("false");
    // Nothing committed: same headers, same rows, no empty-column state.
    expect(screen.getByTestId("glide-grid-headers")).toHaveTextContent("#ALBUM");
    expect(screen.getByTestId("csv-table-count")).toHaveTextContent("2 rows");
  });

  it("falls through to the empty state when every row is deleted", async () => {
    const user = userEvent.setup();
    render(<DeletionHarness initial={FIXTURE} />);
    await user.click(screen.getByTestId("glide-row-select-0"));
    fireEvent.click(screen.getByTestId("glide-row-select-3"), { shiftKey: true });
    await user.click(screen.getByTestId("csv-table-delete-rows"));
    expect(await screen.findByTestId("csv-table-empty-rows")).toHaveTextContent("No rows");
    // Headers survive: a headers-only table is valid and still convertible.
    expect(screen.getByTestId("glide-grid-headers")).toHaveTextContent("#ALBUMYEAR");
    expect(screen.getByTestId("csv-table-count")).toHaveTextContent("0 rows");
  });

  it("keeps the empty-rows overlay out of the read-only output table", () => {
    // Headers-only fixture: view.length === 0, so the ungated code WOULD
    // render the overlay here — this pins the editable gate.
    render(<DeletionHarness initial={"album"} editable={false} />);
    expect(screen.getByTestId("glide-grid-headers")).toHaveTextContent("#ALBUM");
    expect(screen.queryByTestId("csv-table-empty-rows")).toBeNull();
  });

  it("handles Mod+Z, Mod+Shift+Z, and Mod+Y inside the grid while yielding when an input is focused", () => {
    const onUndo = vi.fn();
    const onRedo = vi.fn();
    render(
      <CsvTable
        text={FIXTURE}
        onCellCommit={() => {}}
        onUndo={onUndo}
        onRedo={onRedo}
      />
    );

    const grid = screen.getByTestId("csv-table");

    const undoCtrl = new KeyboardEvent("keydown", {
      key: "z",
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    });
    grid.dispatchEvent(undoCtrl);
    expect(onUndo).toHaveBeenCalledTimes(1);
    expect(undoCtrl.defaultPrevented).toBe(true);

    const undoMeta = new KeyboardEvent("keydown", {
      key: "z",
      metaKey: true,
      bubbles: true,
      cancelable: true,
    });
    grid.dispatchEvent(undoMeta);
    expect(onUndo).toHaveBeenCalledTimes(2);
    expect(undoMeta.defaultPrevented).toBe(true);

    const redoShiftZ = new KeyboardEvent("keydown", {
      key: "z",
      metaKey: true,
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    });
    grid.dispatchEvent(redoShiftZ);
    expect(onRedo).toHaveBeenCalledTimes(1);
    expect(redoShiftZ.defaultPrevented).toBe(true);

    const redoY = new KeyboardEvent("keydown", {
      key: "y",
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    });
    grid.dispatchEvent(redoY);
    expect(onRedo).toHaveBeenCalledTimes(2);
    expect(redoY.defaultPrevented).toBe(true);

    // Focusing the search input (or any overlay <input>/<textarea>) yields to native text undo.
    const searchInput = screen.getByTestId("csv-table-search");
    searchInput.focus();
    const inputUndo = new KeyboardEvent("keydown", {
      key: "z",
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    });
    searchInput.dispatchEvent(inputUndo);
    expect(onUndo).toHaveBeenCalledTimes(2);
    expect(inputUndo.defaultPrevented).toBe(false);
  });
});

describe("CsvTable double-click header rename (input table only)", () => {
  it("opens csv-header-rename-input on double-click, restores pre-click sortState, and commits on Enter", async () => {
    const user = userEvent.setup();
    const onCellCommit = vi.fn();
    render(<CsvTable text={FIXTURE} onCellCommit={onCellCommit} />);

    // Sort by year ascending first: [1, 3, 2, 4]
    await user.click(screen.getByTestId("glide-header-2"));
    expect(viewSourceRows()).toEqual([1, 3, 2, 4]);

    // Double-click the album header (grid column 1 = data col 0).
    // user.dblClick fires click 1 (which temporarily flips sort to col 0 asc)
    // followed by click 2 + dblclick (which restores pre-first-click sort).
    await user.dblClick(screen.getByTestId("glide-header-1"));

    // Pre-first-click sort (year asc) is restored immediately.
    expect(viewSourceRows()).toEqual([1, 3, 2, 4]);

    const input = screen.getByTestId("csv-header-rename-input") as HTMLInputElement;
    expect(input).toHaveValue("album");

    await user.clear(input);
    await user.type(input, "record_title{Enter}");

    expect(screen.queryByTestId("csv-header-rename-input")).toBeNull();
    expect(onCellCommit).toHaveBeenCalledTimes(1);
    expect(onCellCommit).toHaveBeenCalledWith(
      "record_title,year\nDe Stijl,2000\nElephant,2003\nWhite Blood Cells,2001\nGet Behind Me Satan,2005"
    );
  });

  it("commits header rename on blur", async () => {
    const user = userEvent.setup();
    const onCellCommit = vi.fn();
    render(<CsvTable text={FIXTURE} onCellCommit={onCellCommit} />);

    await user.dblClick(screen.getByTestId("glide-header-2"));
    const input = screen.getByTestId("csv-header-rename-input");
    expect(input).toHaveValue("year");

    await user.clear(input);
    await user.type(input, "release_year");
    fireEvent.blur(input);

    expect(screen.queryByTestId("csv-header-rename-input")).toBeNull();
    expect(onCellCommit).toHaveBeenCalledTimes(1);
    expect(onCellCommit).toHaveBeenCalledWith(
      "album,release_year\nDe Stijl,2000\nElephant,2003\nWhite Blood Cells,2001\nGet Behind Me Satan,2005"
    );
  });

  it("cancels header rename on Escape without committing changes", async () => {
    const user = userEvent.setup();
    const onCellCommit = vi.fn();
    render(<CsvTable text={FIXTURE} onCellCommit={onCellCommit} />);

    await user.dblClick(screen.getByTestId("glide-header-1"));
    const input = screen.getByTestId("csv-header-rename-input");
    await user.clear(input);
    await user.type(input, "discarded_name{Escape}");

    expect(screen.queryByTestId("csv-header-rename-input")).toBeNull();
    expect(onCellCommit).not.toHaveBeenCalled();
  });

  it("yields Mod+Z to native text undo while the header rename input is focused, then supports grid undo/redo after commit", async () => {
    const user = userEvent.setup();
    const onUndo = vi.fn();
    function HistoryHarness() {
      const [history, setHistory] = useState({ past: [] as string[], present: FIXTURE, future: [] as string[] });
      return (
        <CsvTable
          text={history.present}
          onCellCommit={(next) =>
            setHistory((h) => ({ past: [...h.past, h.present], present: next, future: [] }))
          }
          onUndo={() => {
            onUndo();
            setHistory((h) => {
              if (h.past.length === 0) return h;
              const prev = h.past[h.past.length - 1];
              return { past: h.past.slice(0, -1), present: prev, future: [h.present, ...h.future] };
            });
          }}
        />
      );
    }

    render(<HistoryHarness />);
    await user.dblClick(screen.getByTestId("glide-header-1"));
    const input = screen.getByTestId("csv-header-rename-input");
    input.focus();

    // Mod+Z inside the active rename input does not trigger grid undo.
    const inInputUndo = new KeyboardEvent("keydown", {
      key: "z",
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    });
    input.dispatchEvent(inInputUndo);
    expect(onUndo).not.toHaveBeenCalled();
    expect(inInputUndo.defaultPrevented).toBe(false);

    await user.clear(input);
    await user.type(input, "lp_title{Enter}");
    expect(screen.getByTestId("glide-grid-headers")).toHaveTextContent("#LP_TITLEYEAR");

    // Now Mod+Z on the grid undoes the header rename.
    const grid = screen.getByTestId("csv-table");
    const gridUndo = new KeyboardEvent("keydown", {
      key: "z",
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    });
    grid.dispatchEvent(gridUndo);
    expect(onUndo).toHaveBeenCalledTimes(1);
    await waitFor(() =>
      expect(screen.getByTestId("glide-grid-headers")).toHaveTextContent("#ALBUMYEAR")
    );
  });

  it("does not open header rename in read-only mode (output table)", async () => {
    const user = userEvent.setup();
    render(<CsvTable text={FIXTURE} />);
    await user.dblClick(screen.getByTestId("glide-header-1"));
    expect(screen.queryByTestId("csv-header-rename-input")).toBeNull();
  });
});

describe("CsvTable selection aggregates", () => {
  it("shows selection stats and enables Copy as CSV for a multi-cell range selection", async () => {
    const user = userEvent.setup();
    const writeText = stubClipboard();
    render(<CsvTable text={FIXTURE} />);

    // 1x2 range in album column (rows 0-1: De Stijl, Elephant)
    await user.click(screen.getByTestId("glide-select-range"));

    expect(screen.getByTestId("csv-table-selected-count")).toHaveTextContent("2 cells selected");
    expect(screen.getByTestId("csv-table-selection-stats")).toHaveTextContent(
      "Cells: 2 · Distinct: 2"
    );
    expect(screen.getByTestId("csv-table-selection-stats")).not.toHaveTextContent("Empty:");
    expect(screen.getByTestId("csv-table-selection-stats")).not.toHaveTextContent("Sum:");

    await user.click(screen.getByTestId("csv-table-copy"));
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    expect(writeText).toHaveBeenCalledWith("album\nDe Stijl\nElephant");

    await user.click(screen.getByTestId("csv-table-clear-selection"));
    expect(screen.queryByTestId("csv-table-selection-stats")).toBeNull();
  });

  it("displays Empty and formatted numeric Sum, Avg, Min, Max for rectangular ranges, rows, and columns", async () => {
    const user = userEvent.setup();
    const csvWithBlanksAndNumbers = [
      "album,sales",
      "De Stijl,1250.5",
      "Elephant,",
      "De Stijl,-250.25",
      "Get Behind Me Satan,500",
    ].join("\n");
    render(<CsvTable text={csvWithBlanksAndNumbers} />);

    // 2x3 rectangular range: rows 0..2, cols 0..1 (6 cells: 3 albums with 2 distinct, 2 numeric sales + 1 empty)
    await user.click(screen.getByTestId("glide-select-rect-range"));
    expect(screen.getByTestId("csv-table-selection-stats")).toHaveTextContent(
      "Cells: 6 · Distinct: 4 · Empty: 1 · Sum: 1,000.25 · Avg: 500.125 · Min: -250.25 · Max: 1,250.5"
    );

    // Select the numeric column (grid col 2 = sales): 4 cells, 1 empty, 3 numeric (1250.5, -250.25, 500 -> sum 1500.25, avg 500.0833)
    await user.click(screen.getByTestId("glide-select-column-2"));
    expect(screen.getByTestId("csv-table-selection-stats")).toHaveTextContent(
      "Cells: 4 · Distinct: 3 · Empty: 1 · Sum: 1,500.25 · Avg: 500.0833 · Min: -250.25 · Max: 1,250.5"
    );
  });

  it("hides selection stats when only a single cell is selected without a row or column selection", async () => {
    const user = userEvent.setup();
    render(<CsvTable text={FIXTURE} />);
    await user.click(screen.getByTestId("glide-select-single-cell"));
    expect(screen.queryByTestId("csv-table-selection-stats")).toBeNull();
    expect(screen.queryByTestId("csv-table-selected-count")).toBeNull();
  });
});

describe("CsvTable — per-column type override pills & header badges (AC-16 / D15)", () => {
  it("renders Auto · String · Number · Boolean override pills when a column is selected in editable mode, updates header badges, and resets via chip", async () => {
    const user = userEvent.setup();
    const onChangeColumnTypes = vi.fn();
    render(
      <CsvTable
        text={FIXTURE}
        testId="input-table"
        onCellCommit={vi.fn()}
        onChangeColumnTypes={onChangeColumnTypes}
      />
    );

    // Not visible before selecting a column
    expect(screen.queryByTestId("input-table-column-type-group")).toBeNull();

    // Select data column 1 ("year" -> grid column 2)
    await user.click(screen.getByTestId("glide-select-column-2"));
    expect(screen.getByTestId("input-table-column-type-group")).toBeInTheDocument();
    expect(screen.getByTestId("input-table-column-type-auto")).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(screen.getByTestId("input-table-column-type-string")).toHaveAttribute(
      "aria-pressed",
      "false"
    );

    // Pin "year" to String
    await user.click(screen.getByTestId("input-table-column-type-string"));
    expect(onChangeColumnTypes).toHaveBeenLastCalledWith({ year: "string" });
    expect(screen.getByTestId("input-table-column-type-string")).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(screen.getByTestId("glide-header-2")).toHaveTextContent("YEAR [STR]");
    expect(screen.getByTestId("input-table-column-types-reset")).toHaveTextContent(
      "1 column type pinned"
    );

    // Pin "year" to Boolean -> badge updates to [BOOL]
    await user.click(screen.getByTestId("input-table-column-type-boolean"));
    expect(onChangeColumnTypes).toHaveBeenLastCalledWith({ year: "boolean" });
    expect(screen.getByTestId("glide-header-2")).toHaveTextContent("YEAR [BOOL]");

    // Pin "year" back to Auto -> removes override and hides reset chip
    await user.click(screen.getByTestId("input-table-column-type-auto"));
    expect(onChangeColumnTypes).toHaveBeenLastCalledWith({});
    expect(screen.getByTestId("glide-header-2")).toHaveTextContent("YEAR");
    expect(screen.queryByTestId("input-table-column-types-reset")).toBeNull();

    // Pin to Number, then click the toolbar reset chip
    await user.click(screen.getByTestId("input-table-column-type-number"));
    expect(screen.getByTestId("glide-header-2")).toHaveTextContent("YEAR [NUM]");
    await user.click(screen.getByTestId("input-table-column-types-reset"));
    expect(onChangeColumnTypes).toHaveBeenLastCalledWith({});
    expect(screen.getByTestId("glide-header-2")).toHaveTextContent("YEAR");
  });

  it("does not render column type override pills in read-only output tables", async () => {
    const user = userEvent.setup();
    render(<CsvTable text={FIXTURE} testId="output-table" />);
    await user.click(screen.getByTestId("glide-select-column-2"));
    expect(screen.queryByTestId("input-table-column-type-group")).toBeNull();
  });
});

describe("CsvTable column visibility picker & Apply view to output (AC-11 / D10)", () => {
  const MULTI_COL_FIXTURE = [
    "id,album,year,chart",
    "1,The White Stripes,1999,99",
    "2,De Stijl,2000,50",
    "3,Elephant,2003,6",
  ].join("\n");

  it("toggles visible columns via the Columns popover, enforces >= 1 visible column, and resets via Show all", async () => {
    const user = userEvent.setup();
    render(<CsvTable text={MULTI_COL_FIXTURE} />);

    // No view transform active initially -> Apply view to output pill is hidden
    expect(screen.queryByTestId("csv-table-apply-view")).toBeNull();
    expect(screen.getByTestId("glide-grid-headers")).toHaveTextContent(
      "#IDALBUMYEARCHART"
    );

    const colsBtn = screen.getByTestId("csv-table-columns-button");
    await user.click(colsBtn);
    const popout = screen.getByTestId("csv-table-columns-popout");
    expect(popout).toBeInTheDocument();
    expect(screen.queryByTestId("csv-table-columns-reset")).toBeNull();

    // Uncheck column 0 (id), column 2 (year), and column 3 (chart)
    await user.click(screen.getByTestId("csv-table-column-toggle-0"));
    await user.click(screen.getByTestId("csv-table-column-toggle-2"));
    await user.click(screen.getByTestId("csv-table-column-toggle-3"));

    // Only column 1 (album) remains visible -> its checkbox is disabled so >=1 stays checked
    const remainingCheckbox = screen.getByTestId(
      "csv-table-column-toggle-1"
    ) as HTMLInputElement;
    expect(remainingCheckbox.checked).toBe(true);
    expect(remainingCheckbox.disabled).toBe(true);

    expect(screen.getByTestId("glide-grid-headers")).toHaveTextContent("#ALBUM");
    expect(screen.getByTestId("csv-table-apply-view")).toHaveAttribute(
      "aria-pressed",
      "false"
    );

    // Click Show all to restore all columns
    await user.click(screen.getByTestId("csv-table-columns-reset"));
    expect(screen.getByTestId("glide-grid-headers")).toHaveTextContent(
      "#IDALBUMYEARCHART"
    );
    expect(screen.queryByTestId("csv-table-apply-view")).toBeNull();
  });

  it("maps visible grid column indices back to source columns for cell edit, sort, header rename, and selection copy when columns are hidden", async () => {
    const user = userEvent.setup();
    const writeText = stubClipboard();

    function EditableHarness() {
      const [csv, setCsv] = useState(MULTI_COL_FIXTURE);
      return (
        <div>
          <pre data-testid="raw-csv">{csv}</pre>
          <CsvTable text={csv} onCellCommit={setCsv} />
        </div>
      );
    }

    render(<EditableHarness />);

    // Hide column 0 ("id") and column 2 ("year") -> visible columns are [1 ("album"), 3 ("chart")]
    await user.click(screen.getByTestId("csv-table-columns-button"));
    await user.click(screen.getByTestId("csv-table-column-toggle-0"));
    await user.click(screen.getByTestId("csv-table-column-toggle-2"));
    expect(screen.getByTestId("glide-grid-headers")).toHaveTextContent(
      "#ALBUMCHART"
    );

    // Sort by visible grid column 2 (which is source column 3: "chart") ascending
    await user.click(screen.getByTestId("glide-header-2"));
    // Row 0 in sorted view should be Elephant (chart=6)
    expect(cellText(0, 0)).toBe("3");
    expect(cellText(0, 1)).toBe("Elephant");
    expect(cellText(0, 2)).toBe("6");

    // Edit view row 0 (y=0, source row 2 "Elephant"), visible grid column 1 (x=1, source col 1 "album")
    // (Editing album keeps chart=6 so row 0 in ascending chart sort remains source row 2)
    await user.click(screen.getByTestId("glide-edit-0-1"));
    expect(screen.getByTestId("raw-csv").textContent).toBe(
      [
        "id,album,year,chart",
        "1,The White Stripes,1999,99",
        "2,De Stijl,2000,50",
        "3,EDITED,2003,6",
      ].join("\n")
    );

    // Select view row 0 and copy -> copies only visible columns (album,chart)
    await user.click(screen.getByTestId("glide-row-select-0"));
    await user.click(screen.getByTestId("csv-table-copy"));
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    expect(writeText).toHaveBeenCalledWith("album,chart\nEDITED,6");
  });

  it("emits projectedCsv via onProjectedCsvChange only when Apply view to output is toggled on and a view transform is active", async () => {
    const user = userEvent.setup();
    const onProjected = vi.fn();
    render(
      <CsvTable text={MULTI_COL_FIXTURE} onProjectedCsvChange={onProjected} />
    );

    expect(onProjected).toHaveBeenLastCalledWith(null);

    // Hide column 0 ("id") and column 3 ("chart") -> visible: album, year
    await user.click(screen.getByTestId("csv-table-columns-button"));
    await user.click(screen.getByTestId("csv-table-column-toggle-0"));
    await user.click(screen.getByTestId("csv-table-column-toggle-3"));

    // Sort by visible column 2 ("year") descending (2 clicks)
    await user.click(screen.getByTestId("glide-header-2"));
    await user.click(screen.getByTestId("glide-header-2"));

    // Apply view to output is still off -> projectedCsv is null
    const applyBtn = screen.getByTestId("csv-table-apply-view");
    expect(applyBtn).toHaveAttribute("aria-pressed", "false");
    expect(onProjected).toHaveBeenLastCalledWith(null);

    // Toggle Apply view to output ON -> emits projected CSV with sorted rows and visible columns
    await user.click(applyBtn);
    expect(applyBtn).toHaveAttribute("aria-pressed", "true");
    expect(onProjected).toHaveBeenLastCalledWith(
      [
        "album,year",
        "Elephant,2003",
        "De Stijl,2000",
        "The White Stripes,1999",
      ].join("\n")
    );

    // Toggle Apply view to output OFF -> emits null
    await user.click(applyBtn);
    expect(applyBtn).toHaveAttribute("aria-pressed", "false");
    expect(onProjected).toHaveBeenLastCalledWith(null);
  });
});


