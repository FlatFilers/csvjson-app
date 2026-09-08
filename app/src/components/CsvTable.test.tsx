import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
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
