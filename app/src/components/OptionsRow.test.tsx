import { render, screen, within } from "@testing-library/react";
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
    // The separator hint (B2, #110) precedes the parse-numbers hint in the
    // DOM, so the parse-numbers info icon is index 1.
    const infoButton = screen.getAllByRole("button", {
      name: "What does this option do?",
    })[1];
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

describe("separator select (spec B2 — issue #110)", () => {
  it("renders the Pipe option and reports its selection", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <OptionsRow
        direction="csv2json"
        options={DEFAULT_OPTIONS}
        onChange={onChange}
      />
    );
    const select = screen.getByTestId("opt-separator");
    expect(select).toHaveValue("auto");
    const pipe = within(select).getByRole("option", { name: "Pipe" });
    expect(pipe).toHaveValue("|");
    await user.selectOptions(select, "|");
    expect(onChange).toHaveBeenLastCalledWith({ separator: "|" });
  });

  it("carries the conservative auto-detect hint in the DOM at load, hidden until clicked (SEO initial-DOM rule)", () => {
    render(
      <OptionsRow
        direction="csv2json"
        options={DEFAULT_OPTIONS}
        onChange={() => {}}
      />
    );
    const hint = screen.getByText("Auto-detect is conservative", {
      exact: false,
    });
    expect(hint).toHaveAttribute("data-hint");
    expect(hint).toHaveAttribute("hidden");
    expect(hint.textContent).toContain(
      "pipe-separated text must be selected explicitly"
    );
  });
});

describe("empty/NULL toggles (spec B1 — issues #65 #100 #46 #6)", () => {
  it("renders both toggles unchecked by default and reports the on states", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <OptionsRow
        direction="csv2json"
        options={DEFAULT_OPTIONS}
        onChange={onChange}
      />
    );
    const skip = screen.getByRole("checkbox", { name: "Skip empty fields" });
    const nulls = screen.getByRole("checkbox", { name: "NULL as null" });
    expect(skip).not.toBeChecked();
    expect(nulls).not.toBeChecked();
    await user.click(skip);
    expect(onChange).toHaveBeenLastCalledWith({ emptyFields: "skip" });
    await user.click(nulls);
    expect(onChange).toHaveBeenLastCalledWith({ nullLiterals: "null" });
  });

  it("reports the off states — keep and string — when starting checked", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <OptionsRow
        direction="csv2json"
        options={{
          ...DEFAULT_OPTIONS,
          emptyFields: "skip",
          nullLiterals: "null",
        }}
        onChange={onChange}
      />
    );
    expect(
      screen.getByRole("checkbox", { name: "Skip empty fields" })
    ).toBeChecked();
    expect(
      screen.getByRole("checkbox", { name: "NULL as null" })
    ).toBeChecked();
    await user.click(
      screen.getByRole("checkbox", { name: "Skip empty fields" })
    );
    expect(onChange).toHaveBeenLastCalledWith({ emptyFields: "keep" });
    await user.click(screen.getByRole("checkbox", { name: "NULL as null" }));
    expect(onChange).toHaveBeenLastCalledWith({ nullLiterals: "string" });
  });

  it("carries both hints in the DOM at load, hidden until clicked (SEO initial-DOM rule)", () => {
    render(
      <OptionsRow
        direction="csv2json"
        options={DEFAULT_OPTIONS}
        onChange={() => {}}
      />
    );
    const skipHint = screen.getByText(
      "dropped from the output instead of becoming",
      { exact: false }
    );
    expect(skipHint).toHaveAttribute("data-hint");
    expect(skipHint).toHaveAttribute("hidden");
    const nullHint = screen.getByText("Matching is exact and case-sensitive", {
      exact: false,
    });
    expect(nullHint).toHaveAttribute("data-hint");
    expect(nullHint).toHaveAttribute("hidden");
    expect(nullHint.textContent).toContain("exact and case-sensitive");
  });

  it("hides both toggles in the json2csv direction", () => {
    render(
      <OptionsRow
        direction="json2csv"
        options={DEFAULT_OPTIONS}
        onChange={() => {}}
      />
    );
    expect(
      screen.queryByRole("checkbox", { name: "Skip empty fields" })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("checkbox", { name: "NULL as null" })
    ).not.toBeInTheDocument();
  });
});
