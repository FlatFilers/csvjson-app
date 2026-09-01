import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "@/App";

/**
 * Legacy permalink states (spec: Old share links keep resolving —
 * read-only; criterion 6). Covers hydration into the converter, the
 * not-found notice, the network-error retry affordance, and the
 * read-only contract: URL never rewritten, nothing written back.
 */

const ID = "000c44f43e2f62cc15c48d9d7c5a4582";

function visitPermalink(tool = "csv2json"): void {
  window.history.pushState({}, "", `/${tool}/${ID}`);
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
  window.history.pushState({}, "", "/");
});

function jsonResponse(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("legacy permalink hydration", () => {
  it("hydrates the converter from a legacy csv2json save", async () => {
    visitPermalink("csv2json");
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse(
        JSON.stringify({
          csv: "album,year\nElephant,2003\nDe Stijl,2000",
          parseNumbers: false,
          parseJSON: true,
          transpose: false,
          "output-array": true,
          "output-hash": false,
          result: '[{"album":"Elephant","year":"2003"}]',
        })
      )
    );

    render(<App />);

    // Brief loading state while the object is fetched.
    expect(screen.getByTestId("permalink-loading")).toBeInTheDocument();

    // Hydrated: CSV input lands in the input pane (dense table view),
    // CSV → JSON direction, and the URL is unchanged.
    await waitFor(() => {
      expect(screen.getByTestId("input-table")).toBeInTheDocument();
    });
    expect(screen.getByTestId("input-table").textContent).toContain("album");
    await waitFor(() => {
      expect(screen.getByTestId("output-view").textContent).toContain(
        '"Elephant"'
      );
    });
    expect(window.location.pathname).toBe(`/csv2json/${ID}`);
    // The fetch was a plain read-only GET.
    expect(globalThis.fetch).toHaveBeenCalledWith(expect.stringContaining(ID), {
      mode: "cors",
    });
  });

  it("hydrates a json2csv permalink into the json2csv direction", async () => {
    visitPermalink("json2csv");
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse(
        JSON.stringify({
          json: '[{"album":"Elephant","year":2003}]',
          flatten: false,
          output_csvjson_variant: false,
          result: "json,csv",
        })
      )
    );

    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId("output-table")).toBeInTheDocument();
    });
    // Direction flipped to json2csv: the input editor holds the JSON.
    expect(screen.getByTestId("input-editor").textContent).toContain(
      '"Elephant"'
    );
    // Virtualized output rows: assert via the sticky headers.
    expect(screen.getByTestId("output-table").textContent).toContain("album");
  });

  it("shows the not-found notice for a missing id, with a link home", async () => {
    visitPermalink();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse("", 404));

    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId("permalink-notice")).toHaveTextContent(
        "This data doesn't exist (or was deleted)"
      );
    });
    expect(
      screen.getByRole("link", { name: "Go to the converter" })
    ).toHaveAttribute("href", "/");
    // Never a blank page: the converter is still mounted underneath.
    expect(screen.getByTestId("input-pane")).toBeInTheDocument();
  });

  it("shows a retry affordance on network failure and recovers", async () => {
    visitPermalink();
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValueOnce(new TypeError("offline"))
      .mockResolvedValue(
        jsonResponse(JSON.stringify({ csv: "album,year\nElephant,2003" }))
      );

    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId("permalink-notice")).toBeInTheDocument();
    });
    expect(screen.getByTestId("permalink-retry")).toBeInTheDocument();

    // The retry re-runs the same read-only GET and succeeds this time.
    await userEvent.click(screen.getByTestId("permalink-retry"));
    await waitFor(() => {
      expect(screen.getByTestId("input-table")).toBeInTheDocument();
    });
    expect(screen.getByTestId("input-table").textContent).toContain("album");
    expect(window.location.pathname).toBe(`/csv2json/${ID}`);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("falls through untouched for a tool with no converter equivalent", async () => {
    // sql2json links must not fetch (and never blank or notice) — the
    // converter renders normally, read-only contract intact.
    visitPermalink("sql2json");
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(jsonResponse('{"sql":"SELECT 1"}'));

    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId("input-pane")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("permalink-loading")).not.toBeInTheDocument();
    expect(screen.queryByTestId("permalink-notice")).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows the unsupported notice for a live object that no longer maps", async () => {
    visitPermalink();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse(JSON.stringify({ id: ID, date: "Mon", text: "a,b" }))
    );

    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId("permalink-unsupported")).toHaveTextContent(
        "can't be shown in the new converter"
      );
    });
    // It exists — never claim it was deleted.
    expect(screen.queryByTestId("permalink-notice")).not.toBeInTheDocument();
    expect(screen.getByTestId("input-pane")).toBeInTheDocument();
  });

  it("renders the converter normally with no permalink in the URL", () => {
    window.history.pushState({}, "", "/");
    vi.spyOn(globalThis, "fetch").mockRejectedValue(
      new Error("no network calls expected")
    );
    render(<App />);
    expect(screen.queryByTestId("permalink-loading")).not.toBeInTheDocument();
    expect(screen.queryByTestId("permalink-notice")).not.toBeInTheDocument();
    expect(screen.getByTestId("input-pane")).toBeInTheDocument();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});
