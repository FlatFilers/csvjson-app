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
    const hint = screen.getByText("00721 into 7", { exact: false });
    expect(hint).toHaveAttribute("data-hint");
    expect(hint).toHaveAttribute("hidden");
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
    expect(screen.getByText(/turns 00721 into 7/)).toBeVisible();
  });
});
