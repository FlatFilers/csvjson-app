import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { DEFAULT_OPTIONS } from "@/lib/convert";
import { OptionsRow } from "./OptionsRow";

describe("OptionsRow option hints", () => {
  it("carries hint copy in the DOM at load, hidden until clicked (SEO initial-DOM rule)", () => {
    render(
      <OptionsRow
        direction="csv2json"
        options={DEFAULT_OPTIONS}
        onChange={() => {}}
      />
    );
    // The hint text exists in the DOM before any interaction — the click
    // only toggles visibility (spec: SEO initial-DOM rule).
    const hint = screen.getByText("leading-zero values like 00721", {
      exact: false,
    });
    expect(hint).toHaveAttribute("data-hint");
    expect(hint).toHaveAttribute("hidden");
    // Pin the corrected final sentence: unchecking does NOT keep every cell a
    // string while Parse JSON is on (the default) — booleans, null, and
    // containers still convert. Accuracy under default options is the
    // acceptance criterion.
    expect(hint.textContent).toContain(
      "Uncheck to keep numeric cells as strings — booleans, null, and containers still convert while Parse JSON is on."
    );
    expect(hint.textContent).not.toContain("keep every cell a string");
  });

  it("reveals a hint when its info icon is clicked", async () => {
    const user = userEvent.setup();
    render(
      <OptionsRow
        direction="csv2json"
        options={DEFAULT_OPTIONS}
        onChange={() => {}}
      />
    );
    const infoButton = screen.getAllByRole("button", {
      name: "What does this option do?",
    })[0];
    expect(infoButton).toHaveAttribute("aria-expanded", "false");
    await user.click(infoButton);
    expect(screen.getByText(/very long IDs stay strings/)).toBeVisible();
  });
});
