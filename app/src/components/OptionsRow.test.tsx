import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
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

describe("encoding select (spec B7 — issue #106)", () => {
  it("renders the upload encoding select, defaulting to UTF-8, and reports changes", async () => {
    const user = userEvent.setup();
    const onUploadEncodingChange = vi.fn();
    render(
      <OptionsRow
        direction="csv2json"
        options={DEFAULT_OPTIONS}
        onChange={() => {}}
        uploadEncoding="utf-8"
        onUploadEncodingChange={onUploadEncodingChange}
      />
    );
    const select = screen.getByTestId("opt-encoding");
    expect(select).toHaveValue("utf-8");
    await user.selectOptions(select, "windows-1252");
    expect(onUploadEncodingChange).toHaveBeenCalledWith("windows-1252");
  });

  it("carries the upload-scoping hint in the DOM at load, hidden until clicked (SEO initial-DOM rule)", () => {
    render(
      <OptionsRow
        direction="csv2json"
        options={DEFAULT_OPTIONS}
        onChange={() => {}}
        uploadEncoding="utf-8"
        onUploadEncodingChange={() => {}}
      />
    );
    const hint = screen.getByText("Applies to file uploads and drops only", {
      exact: false,
    });
    expect(hint).toHaveAttribute("data-hint");
    expect(hint).toHaveAttribute("hidden");
    expect(hint.textContent).toContain("always read as UTF-8");
  });

  it("hides the encoding select when no upload-encoding props are given", () => {
    render(
      <OptionsRow
        direction="csv2json"
        options={DEFAULT_OPTIONS}
        onChange={() => {}}
      />
    );
    expect(screen.queryByTestId("opt-encoding")).not.toBeInTheDocument();
  });
});
