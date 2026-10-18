import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_OPTIONS } from "@/lib/convert";
import { setMediaQueryMatches } from "@/test/setup";
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
    const skip = screen.getByRole("switch", { name: "Skip empty fields" });
    const nulls = screen.getByRole("switch", { name: "NULL as null" });
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
      screen.getByRole("switch", { name: "Skip empty fields" })
    ).toBeChecked();
    expect(
      screen.getByRole("switch", { name: "NULL as null" })
    ).toBeChecked();
    await user.click(
      screen.getByRole("switch", { name: "Skip empty fields" })
    );
    expect(onChange).toHaveBeenLastCalledWith({ emptyFields: "keep" });
    await user.click(screen.getByRole("switch", { name: "NULL as null" }));
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
      screen.queryByRole("switch", { name: "Skip empty fields" })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("switch", { name: "NULL as null" })
    ).not.toBeInTheDocument();
  });
});

describe("parse settings drop-up (spec: parse settings menu, art_kW2qUlGL)", () => {
  beforeEach(() => {
    // Below the fit threshold (xl): the collapsed presentation.
    setMediaQueryMatches(false);
  });

  /** Controlled harness so in-menu toggles flow through App-like state. */
  function SummaryHarness() {
    const [options, setOptions] = useState(DEFAULT_OPTIONS);
    return (
      <OptionsRow
        direction="csv2json"
        options={options}
        onChange={(patch) => setOptions((current) => ({ ...current, ...patch }))}
      />
    );
  }

  it("collapses to a one-line Parse settings bar with the full control set mounted in the DOM (SEO initial-DOM rule)", () => {
    render(
      <OptionsRow
        direction="csv2json"
        options={DEFAULT_OPTIONS}
        onChange={() => {}}
      />
    );

    const bar = screen.getByTestId("options-row");
    const toggle = screen.getByTestId("options-settings-toggle");
    expect(toggle).toHaveTextContent("Parse settings");
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(toggle).toHaveAttribute("aria-haspopup", "true");
    expect(screen.getByTestId("options-settings-summary")).toHaveTextContent(
      "Auto · Parse numbers · Parse JSON"
    );

    // One line at rest: the bar itself never stacks controls — no flex-wrap.
    expect(bar.className).not.toContain("flex-wrap");

    // Closed menu still carries the full set (and hints) in the DOM.
    const menu = screen.getByTestId("options-settings-menu");
    expect(menu).toHaveAttribute("hidden");
    expect(within(menu).getByTestId("opt-separator")).toBeInTheDocument();
    // Role queries default to the accessibility tree — the closed menu is
    // hidden, so include it explicitly.
    expect(
      within(menu).getAllByRole("switch", { hidden: true })
    ).toHaveLength(7);
    expect(menu.querySelectorAll("[data-hint]").length).toBeGreaterThanOrEqual(
      8
    );
  });

  it("opens via the trigger and closes via trigger re-click, Escape, and outside click — returning focus to the trigger each time", async () => {
    const user = userEvent.setup();
    render(
      <>
        <button data-testid="outside">outside</button>
        <OptionsRow
          direction="csv2json"
          options={DEFAULT_OPTIONS}
          onChange={() => {}}
        />
      </>
    );
    const toggle = screen.getByTestId("options-settings-toggle");
    const menu = () => screen.getByTestId("options-settings-menu");

    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(menu()).not.toHaveAttribute("hidden");

    // Trigger re-click closes.
    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(menu()).toHaveAttribute("hidden");
    expect(toggle).toHaveFocus();

    // Escape closes and returns focus.
    await user.click(toggle);
    await user.keyboard("{Escape}");
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(toggle).toHaveFocus();

    // Outside click closes and returns focus (let user-event settle the
    // outside button's focus first — the close refocuses the trigger).
    await user.click(toggle);
    await user.click(screen.getByTestId("outside"));
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(toggle).toHaveFocus();
  });

  it("updates the collapsed summary immediately when a toggle inside the menu changes", async () => {
    const user = userEvent.setup();
    render(<SummaryHarness />);
    await user.click(screen.getByTestId("options-settings-toggle"));

    await user.click(screen.getByRole("switch", { name: "Parse numbers" }));
    expect(screen.getByTestId("options-settings-summary")).toHaveTextContent(
      "Auto · Parse JSON"
    );
    // A control interaction never dismisses the menu.
    expect(screen.getByTestId("options-settings-menu")).not.toHaveAttribute(
      "hidden"
    );
  });

  it("keeps the large-file notice on the collapsed row, never inside the menu", async () => {
    const user = userEvent.setup();
    render(
      <OptionsRow
        direction="csv2json"
        options={DEFAULT_OPTIONS}
        onChange={() => {}}
        notice="Large file — converting on pause"
      />
    );
    const menu = screen.getByTestId("options-settings-menu");
    const notice = screen.getByTestId("options-notice");
    expect(notice).toHaveTextContent("Large file — converting on pause");
    expect(menu.contains(notice)).toBe(false);

    await user.click(screen.getByTestId("options-settings-toggle"));
    expect(screen.getByTestId("options-notice")).toBe(notice);
    expect(menu.contains(notice)).toBe(false);
  });

  it("keeps the direction-conditional contents and the encoding select wiring inside the menu", () => {
    const wired = render(
      <OptionsRow
        direction="json2csv"
        options={DEFAULT_OPTIONS}
        onChange={() => {}}
        uploadEncoding="utf-8"
        onUploadEncodingChange={() => {}}
      />
    );
    const menu = wired.getByTestId("options-settings-menu");
    expect(
      within(menu).getByRole("switch", {
        name: "Flatten nested arrays",
        hidden: true,
      })
    ).toBeInTheDocument();
    expect(
      within(menu).queryByRole("switch", {
        name: "Parse numbers",
        hidden: true,
      })
    ).not.toBeInTheDocument();
    expect(within(menu).getByTestId("opt-encoding")).toBeInTheDocument();
    wired.unmount();

    // Unwired encoding props → no select, same as the inline row.
    const unwired = render(
      <OptionsRow
        direction="json2csv"
        options={DEFAULT_OPTIONS}
        onChange={() => {}}
      />
    );
    expect(
      unwired.queryByTestId("opt-encoding")
    ).not.toBeInTheDocument();
    unwired.unmount();
  });

  it("renders the inline unwrapped row at the fit threshold and above, with no collapse trigger", () => {
    setMediaQueryMatches(true);
    render(
      <OptionsRow
        direction="csv2json"
        options={DEFAULT_OPTIONS}
        onChange={() => {}}
      />
    );
    expect(
      screen.queryByTestId("options-settings-toggle")
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("options-settings-summary")
    ).not.toBeInTheDocument();
    const menu = screen.getByTestId("options-settings-menu");
    expect(menu).not.toHaveAttribute("hidden");
    expect(within(menu).getAllByRole("switch")).toHaveLength(7);
  });
});

describe("legacy option-bar layout", () => {
  it("hides vertical Divider rules until xl:block and only renders the trailing flex-1 spacer when notice is present (AC-9 / D8)", () => {
    const { rerender } = render(
      <OptionsRow
        direction="csv2json"
        options={DEFAULT_OPTIONS}
        onChange={() => {}}
        uploadEncoding="utf-8"
        onUploadEncodingChange={() => {}}
      />
    );

    const menu = screen.getByTestId("options-settings-menu");
    const dividers = Array.from(menu.querySelectorAll("div.w-px"));
    expect(dividers.length).toBeGreaterThanOrEqual(2);
    for (const divider of dividers) {
      expect(divider.className).toContain("hidden");
      expect(divider.className).toContain("fit:block");
      expect(divider.className).not.toContain("md:block");
    }

    // Without notice, no trailing flex-1 spacer renders inside the inline row
    expect(menu.querySelector("div.flex-1")).toBeNull();

    // When notice is provided, the spacer and notice render
    rerender(
      <OptionsRow
        direction="csv2json"
        options={DEFAULT_OPTIONS}
        onChange={() => {}}
        notice="Large file — converting on pause"
      />
    );
    expect(menu.querySelector("div.flex-1")).not.toBeNull();
    expect(screen.getByTestId("options-notice")).toHaveTextContent(
      "Large file — converting on pause"
    );
  });
});
