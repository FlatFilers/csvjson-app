import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "@/App";

/**
 * Pane state matrix (spec: Every pane state, including empty — criterion 12)
 * plus the upload path (criterion: FileReader, no network) and throttle
 * hint. All file I/O happens through jsdom's FileReader; the network spies
 * prove no request ever leaves the page (criterion 5 evidence).
 */

function textFile(name: string, content: string, type = "text/csv"): File {
  return new File([content], name, { type });
}

// jsdom has no layout: give the virtualizer a real viewport.
vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(600);
vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(800);


beforeEach(() => {
  localStorage.clear();
  // jsdom lacks both; the download helper and any accidental network call
  // must be observable.
  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    writable: true,
    value: vi.fn(() => "blob:mock-url"),
  });
  URL.revokeObjectURL = vi.fn();
  vi.spyOn(globalThis, "fetch").mockImplementation(() => {
    throw new Error("network request attempted during upload test");
  });
  vi.spyOn(XMLHttpRequest.prototype, "open").mockImplementation(() => {
    throw new Error("XHR attempted during upload test");
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe("dropzone interactions", () => {
  it("opens the picker from the browse link — field clicks place the caret", () => {
    render(<App />);
    const pickerClick = vi
      .spyOn(HTMLInputElement.prototype, "click")
      .mockImplementation(() => {});

    fireEvent.click(screen.getByTestId("browse"));
    expect(pickerClick).toHaveBeenCalledTimes(1);

    // The empty state is a real field now: a click inside it is caret
    // placement and must not open the file picker.
    fireEvent.click(screen.getByTestId("paste-field"));
    expect(pickerClick).toHaveBeenCalledTimes(1);
  });

  it("keeps native Enter activation on the nested try-example button", async () => {
    render(<App />);
    const pickerClick = vi
      .spyOn(HTMLInputElement.prototype, "click")
      .mockImplementation(() => {});

    // Tab to the nested button and press Enter — the container handler must
    // not swallow the child's keydown and open the file picker. jsdom does
    // not synthesize click from Enter, so the child's own click path is
    // asserted separately below.
    fireEvent.keyDown(screen.getByTestId("try-example"), { key: "Enter" });
    expect(pickerClick).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId("try-example"));
    await screen.findByTestId("input-table");
  });

  it("receives paste right after load: the field holds focus", async () => {
    render(<App />);
    // The empty state IS a focused field, so Ctrl+V lands in it natively;
    // the field's change event (a real browser's paste insertion completing)
    // feeds the shared ingest path.
    expect(screen.getByTestId("paste-field")).toHaveFocus();
    fireEvent.change(screen.getByTestId("paste-field"), {
      target: { value: "album,year\nDe Stijl,2000" },
    });
    await screen.findByTestId("input-table");
  });
});

describe("file gate", () => {
  it("accepts .csv files carrying a non-text MIME type", async () => {
    render(<App />);
    const excelCsv = new File(["a,b\n1,2"], "sheet.csv", {
      type: "application/vnd.ms-excel",
    });
    fireEvent.drop(screen.getByTestId("input-pane"), {
      dataTransfer: { files: [excelCsv], types: ["Files"] },
    });
    await screen.findByTestId("input-table");
  });
});

describe("empty state", () => {
  it("shows the dropzone only while the input is empty", async () => {
    render(<App />);
    // Empty: dropzone present, no table, output placeholder.
    expect(screen.getByTestId("dropzone")).toBeInTheDocument();
    expect(screen.queryByTestId("input-table")).not.toBeInTheDocument();
    expect(screen.getByText(/Your JSON appears here/)).toBeInTheDocument();

    // Content arrives → data view replaces the dropzone.
    fireEvent.click(screen.getByTestId("try-example"));
    await screen.findByTestId("input-table");
    expect(screen.queryByTestId("dropzone")).not.toBeInTheDocument();
  });
});

describe("drag-over", () => {
  it("highlights the pane while dragging files and rejects non-text inline", async () => {
    render(<App />);
    const pane = screen.getByTestId("input-pane");

    fireEvent.dragEnter(pane, { dataTransfer: { types: ["Files"] } });
    expect(pane).toHaveAttribute("data-drag-over");

    // Non-text file rejects inline; state unchanged (dropzone stays).
    const png = new File(["pretend"], "photo.png", { type: "image/png" });
    fireEvent.drop(pane, { dataTransfer: { files: [png], types: ["Files"] } });
    await screen.findByText(/as text/);
    expect(screen.getByTestId("dropzone")).toBeInTheDocument();

    // A text file goes through instead.
    const csv = textFile("wines.csv", "album,year\nDe Stijl,2000");
    fireEvent.drop(pane, { dataTransfer: { files: [csv], types: ["Files"] } });
    await screen.findByTestId("input-table");
  });

  it("clears the highlight on drag leave", async () => {
    render(<App />);
    const pane = screen.getByTestId("input-pane");
    fireEvent.dragEnter(pane, { dataTransfer: { types: ["Files"] } });
    expect(pane).toHaveAttribute("data-drag-over");
    fireEvent.dragLeave(pane);
    expect(pane).not.toHaveAttribute("data-drag-over");
  });
});

describe("file upload", () => {
  it("reads the file locally: filename + counts in the header, zero network", async () => {
    render(<App />);
    const file = textFile("wines.csv", "album,year\nDe Stijl,2000\nElephant,2003");
    fireEvent.drop(screen.getByTestId("input-pane"), {
      dataTransfer: { files: [file], types: ["Files"] },
    });

    // Filename and row/col counts land in the input pane header.
    await screen.findByText(/wines\.csv · 2 rows · 2 cols/);
    expect(screen.getByTestId("output-view")).toBeInTheDocument();

    // The network spies throw on use — reaching here proves zero requests.
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe("throttle hint", () => {
  it("stretches the debounce past 2MB with a bottom-bar hint", async () => {
    render(<App />);
    const large = "a,b\n1,2\n" + "x".repeat(2.2 * 1024 * 1024);
    fireEvent.paste(screen.getByTestId("input-pane"), {
      clipboardData: { getData: () => large },
    });
    expect(screen.getByTestId("options-notice")).toHaveTextContent(
      "Large file — converting on pause"
    );
  });
});

describe("malformed-CSV warnings (todo_D8PMLUA1)", () => {
  it("repro: `name,amount\n\"Avery,12.50` converts AND warns in the output pane", async () => {
    render(<App />);
    fireEvent.paste(screen.getByTestId("input-pane"), {
      clipboardData: { getData: () => 'name,amount\n"Avery,12.50' },
    });

    // Conversion succeeds — the result still renders, warnings never block.
    await screen.findByTestId("output-view");
    const output = screen.getByTestId("output-pane");
    await waitFor(() => {
      expect(within(output).getByTestId("pane-status")).toHaveTextContent(
        "Unbalanced quote on line 2 — parsed as plain text"
      );
    });
    // The notice lives in the OUTPUT pane, not the input pane.
    expect(within(screen.getByTestId("input-pane")).queryByTestId("pane-status")).not.toBeInTheDocument();
  });

  it("ragged rows warn; clean CSV stays silent", async () => {
    render(<App />);
    // Pane-level paste ingests only while the input is empty; later edits go
    // through the raw editor (same pattern as the stale-output tests).
    fireEvent.paste(screen.getByTestId("input-pane"), {
      clipboardData: { getData: () => "a,b,c\n1,2" },
    });
    await screen.findByTestId("output-view");
    await waitFor(() => {
      expect(
        within(screen.getByTestId("output-pane")).getByTestId("pane-status")
      ).toHaveTextContent("Row 1 has fewer fields than the header, padded");
    });

    fireEvent.click(screen.getByTestId("raw-toggle"));
    const editor = screen.getByTestId("input-editor") as HTMLTextAreaElement;
    fireEvent.change(editor, { target: { value: "a,b,c\n1,2,3\n3,4,5" } });
    await waitFor(
      () => {
        expect(
          within(screen.getByTestId("output-pane")).queryByTestId("pane-status")
        ).not.toBeInTheDocument();
      },
      { timeout: 2000 }
    );
  });
});

describe("downloads", () => {
  it("adds a UTF-8 BOM to CSV downloads and none to JSON", async () => {
    const blobs: Blob[] = [];
    URL.createObjectURL = vi.fn((blob: Blob) => {
      blobs.push(blob);
      return "blob:mock";
    }) as unknown as typeof URL.createObjectURL;
    render(<App />);
    fireEvent.click(screen.getByTestId("try-example"));
    const outputView = await screen.findByTestId("output-view");
    await waitFor(() => {
      expect(outputView.textContent).not.toBe("");
    });

    // CSV input download carries the BOM; JSON output does not. Blob.text()
    // strips a BOM when decoding, so check the raw leading bytes instead.
    fireEvent.click(screen.getByTestId("download-input"));
    fireEvent.click(screen.getByTestId("download-output"));
    expect(blobs.length).toBe(2);
    // EF BB BF = UTF-8 BOM, then "alb" of "album".
    const csvBytes = new Uint8Array(await blobs[0].arrayBuffer());
    expect(Array.from(csvBytes.slice(0, 6))).toEqual([0xef, 0xbb, 0xbf, 0x61, 0x6c, 0x62]);
    const jsonBytes = new Uint8Array(await blobs[1].arrayBuffer());
    expect(jsonBytesLead(jsonBytes)).toBe(false);
    expect(jsonBytes[0]).toBe(0x5b);
  });
});

/** True when a UTF-8 BOM leads the bytes. */
function jsonBytesLead(bytes: Uint8Array): boolean {
  return bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf;
}
