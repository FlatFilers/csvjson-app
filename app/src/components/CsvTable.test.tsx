import { render, screen } from "@testing-library/react";
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
