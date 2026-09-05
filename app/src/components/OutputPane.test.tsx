import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { OutputPane } from "./OutputPane";

/**
 * Malformed-CSV warning notice (spec: silent reinterpretation): rides the
 * pane's quiet notice status in the OUTPUT pane — never an error, never
 * blocking, capped at three messages plus an overflow note.
 */

function renderPane(props: Partial<Parameters<typeof OutputPane>[0]> = {}) {
  return render(
    <OutputPane
      format="JSON"
      inputEmpty={false}
      outputText="[]"
      error={null}
      meta="1 rows · 1 cols"
      staleNotice={null}
      warnings={null}
      dark={false}
      onCopy={() => {}}
      onDownload={() => {}}
      {...props}
    />
  );
}

const outputStatus = () =>
  within(screen.getByTestId("output-pane")).getByTestId("pane-status");

describe("output pane warning notice", () => {
  it("renders the warning notice in the output pane's status slot", () => {
    renderPane({ warnings: ["Unbalanced quote on line 2 — parsed as plain text"] });
    const status = outputStatus();
    expect(status).toHaveTextContent(
      "Unbalanced quote on line 2 — parsed as plain text"
    );
    // Quiet status semantics, not an error (role + still-rendered output).
    expect(status).toHaveAttribute("role", "status");
    expect(screen.getByTestId("output-view")).toBeInTheDocument();
  });

  it("joins warnings line by line and caps at three plus an overflow note", () => {
    renderPane({
      warnings: [
        "Unbalanced quote on line 2 — parsed as plain text",
        "Row 1 has fewer fields than the header, padded",
        "Row 2 has fewer fields than the header, padded",
        "Row 3 has more fields than the header, extra fields dropped",
        "Row 4 has more fields than the header, extra fields dropped",
      ],
    });
    const status = outputStatus();
    expect(status.textContent).toContain(
      "Unbalanced quote on line 2 — parsed as plain text"
    );
    expect(status.textContent).toContain(
      "Row 2 has fewer fields than the header, padded"
    );
    expect(status.textContent).not.toContain("Row 3 has more");
    expect(status.textContent).toContain("+2 more");
  });

  it("clean input stays silent — no status line at all", () => {
    renderPane({ warnings: null });
    expect(
      within(screen.getByTestId("output-pane")).queryByTestId("pane-status")
    ).not.toBeInTheDocument();
  });

  it("an error still renders as the error state, not a notice", () => {
    renderPane({
      error:
        'Expected "\\"" or [\\n\\r] but "j" found. On line 2 and column 4.',
    });
    expect(outputStatus()).toHaveTextContent(/line 2 and column 4/i);
  });
});
