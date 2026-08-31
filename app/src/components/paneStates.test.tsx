import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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
  it("opens the picker on click and on Enter/Space (not a dead target)", async () => {
    render(<App />);
    const pickerClick = vi
      .spyOn(HTMLInputElement.prototype, "click")
      .mockImplementation(() => {});

    // Clicking anywhere in the dashed area opens the browse dialog.
    fireEvent.click(screen.getByTestId("dropzone"));
    expect(pickerClick).toHaveBeenCalledTimes(1);

    // Enter/Space on the focused dropzone do the same.
    fireEvent.keyDown(screen.getByTestId("dropzone"), { key: "Enter" });
    fireEvent.keyDown(screen.getByTestId("dropzone"), { key: " " });
    expect(pickerClick).toHaveBeenCalledTimes(3);
  });

  it("receives paste right after load: the dropzone holds focus", async () => {
    render(<App />);
    // autoFocus keeps focus inside the pane subtree on a fresh load, so
    // Ctrl+V reaches the pane's paste handler.
    expect(screen.getByTestId("dropzone")).toHaveFocus();
    fireEvent.paste(screen.getByTestId("dropzone"), {
      clipboardData: { getData: () => "album,year\nDe Stijl,2000" },
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
