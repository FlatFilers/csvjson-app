import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, vi } from "vitest";
import { describe, expect, it } from "vitest";
import { Dropzone } from "./Dropzone";

/**
 * navigator.platform / userAgentData are prototype getters in jsdom —
 * shadow them with own properties (configurable so they can be removed).
 * userAgentData is not in lib.dom, so the helper works on a loose record.
 */
function shadowNavigator(
  key: "platform" | "userAgentData",
  value: unknown
): () => void {
  const nav = window.navigator as unknown as Record<string, unknown>;
  const hadOwn = Object.prototype.hasOwnProperty.call(nav, key);
  const original = Object.getOwnPropertyDescriptor(nav, key);
  Object.defineProperty(nav, key, {
    value,
    configurable: true,
  });
  return () => {
    if (original && hadOwn) Object.defineProperty(nav, key, original);
    else delete nav[key];
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Dropzone paste field", () => {
  it("is a real, focused textarea with the CSV placeholder", () => {
    render(
      <Dropzone
        format="CSV"
        onIngest={() => {}}
        onBrowse={() => {}}
        onTryExample={() => {}}
      />
    );
    const field = screen.getByTestId("paste-field");
    expect(field.tagName).toBe("TEXTAREA");
    expect(screen.getByRole("textbox", { name: /paste anywhere on this page/i })).toBe(field);
    expect(field).toHaveAttribute("placeholder", "Paste CSV or TSV text here");
    expect(field).toHaveFocus();
  });

  it("is compact: input-height and centered, never filling the pane", () => {
    render(
      <Dropzone
        format="CSV"
        onIngest={() => {}}
        onBrowse={() => {}}
        onTryExample={() => {}}
      />
    );
    const field = screen.getByTestId("paste-field");
    // Input-height field (44px touch target), not a pane-filling flex child.
    expect(field).toHaveClass("min-h-11");
    expect(field).not.toHaveClass("flex-1");
    // The affordances center vertically in the pane inside a max-w-sm column.
    const dropzone = screen.getByTestId("dropzone");
    expect(dropzone).toHaveClass("items-center", "justify-center");
    expect(dropzone.querySelector(".max-w-sm")).not.toBeNull();
  });

  it("grows with stacked content but caps the field at 3 rows", () => {
    render(
      <Dropzone
        format="CSV"
        onIngest={() => {}}
        onBrowse={() => {}}
        onTryExample={() => {}}
      />
    );
    const field = screen.getByTestId("paste-field");
    // Input-height at rest…
    expect(field).toHaveAttribute("rows", "1");
    // …grows for stacked content, capped at 3 rows — never a filled pane.
    fireEvent.change(field, { target: { value: "a\nb" } });
    expect(field).toHaveAttribute("rows", "2");
    fireEvent.change(field, { target: { value: "a\nb\nc\nd" } });
    expect(field).toHaveAttribute("rows", "3");
  });

  it("names JSON in the placeholder after a direction switch", () => {
    render(
      <Dropzone
        format="JSON"
        onIngest={() => {}}
        onBrowse={() => {}}
        onTryExample={() => {}}
      />
    );
    expect(screen.getByTestId("paste-field")).toHaveAttribute(
      "placeholder",
      "Paste JSON here"
    );
  });

  it("ingests typing through the shared onIngest path", async () => {
    const user = userEvent.setup();
    const onIngest = vi.fn();
    render(
      <Dropzone
        format="CSV"
        onIngest={onIngest}
        onBrowse={() => {}}
        onTryExample={() => {}}
      />
    );

    await user.type(screen.getByTestId("paste-field"), "a,b");

    expect(onIngest).toHaveBeenCalled();
    expect(onIngest).toHaveBeenLastCalledWith("a,b");
  });

  it("ingests a paste's content exactly once via the field's change event", () => {
    // jsdom's native paste inserts nothing; the change event stands in for
    // the insertion a real browser completes. Exactly one call — the field
    // alone owns its paste, never a second route through the pane.
    const onIngest = vi.fn();
    render(
      <Dropzone
        format="CSV"
        onIngest={onIngest}
        onBrowse={() => {}}
        onTryExample={() => {}}
      />
    );

    fireEvent.change(screen.getByTestId("paste-field"), {
      target: { value: "album,year\nDe Stijl,2000" },
    });

    expect(onIngest).toHaveBeenCalledTimes(1);
    expect(onIngest).toHaveBeenCalledWith("album,year\nDe Stijl,2000");
  });

  it("shows an Apple shortcut chip in the hint line", () => {
    const restore = shadowNavigator("platform", "MacIntel");
    render(
      <Dropzone
        format="CSV"
        onIngest={() => {}}
        onBrowse={() => {}}
        onTryExample={() => {}}
      />
    );
    restore();

    expect(screen.getByTestId("paste-shortcut").textContent).toBe("⌘V");
    expect(screen.getByTestId("dropzone").textContent).toContain(
      "paste anywhere on the page (⌘V)"
    );
  });

  it("teaches drop and paste-anywhere in one plain hint line", () => {
    render(
      <Dropzone
        format="CSV"
        onIngest={() => {}}
        onBrowse={() => {}}
        onTryExample={() => {}}
      />
    );
    const hint = screen.getByTestId("dropzone").textContent;
    expect(hint).toContain("or drag & drop a file");
    expect(hint).toContain("paste anywhere on the page");
    // jsdom has no platform → the chip shows both shortcuts.
    expect(hint).toContain("(⌘V / Ctrl+V)");
  });

  it("shows Ctrl+V on Windows/Linux", () => {
    const restore = shadowNavigator("platform", "Win32");
    render(
      <Dropzone
        format="CSV"
        onIngest={() => {}}
        onBrowse={() => {}}
        onTryExample={() => {}}
      />
    );
    restore();

    expect(screen.getByTestId("paste-shortcut").textContent).toBe("Ctrl+V");
  });

  it("shows both shortcuts when the platform cannot be determined", () => {
    const restore = shadowNavigator("platform", "");
    render(
      <Dropzone
        format="JSON"
        onIngest={() => {}}
        onBrowse={() => {}}
        onTryExample={() => {}}
      />
    );
    restore();

    expect(screen.getByTestId("paste-shortcut").textContent).toBe("⌘V / Ctrl+V");
  });

  it("prefers userAgentData.platform over the legacy platform string", () => {
    const restorePlatform = shadowNavigator("platform", "Win32");
    const restoreUa = shadowNavigator("userAgentData", { platform: "macOS" });
    render(
      <Dropzone
        format="CSV"
        onIngest={() => {}}
        onBrowse={() => {}}
        onTryExample={() => {}}
      />
    );
    restorePlatform();
    restoreUa();

    expect(screen.getByTestId("paste-shortcut").textContent).toBe("⌘V");
  });

  it("opens the file dialog from a real Choose file button", async () => {
    const user = userEvent.setup();
    const onBrowse = vi.fn();
    const onTryExample = vi.fn();
    render(
      <Dropzone
        format="CSV"
        onIngest={() => {}}
        onBrowse={onBrowse}
        onTryExample={onTryExample}
      />
    );

    const choose = screen.getByRole("button", { name: "Choose file" });
    expect(choose.tagName).toBe("BUTTON");
    expect(choose).toHaveClass("h-11"); // 44px touch target
    await user.click(choose);
    await user.click(screen.getByTestId("try-example"));
    expect(onBrowse).toHaveBeenCalledTimes(1);
    expect(onTryExample).toHaveBeenCalledTimes(1);
  });

  it("places the caret on a field click instead of opening the picker", async () => {
    const user = userEvent.setup();
    const onBrowse = vi.fn();
    render(
      <Dropzone
        format="CSV"
        onIngest={() => {}}
        onBrowse={onBrowse}
        onTryExample={() => {}}
      />
    );

    // The field is an input surface now — a click inside it must focus the
    // caret, not trigger the pane's browse affordance.
    await user.click(screen.getByTestId("paste-field"));
    expect(onBrowse).not.toHaveBeenCalled();
    expect(screen.getByTestId("paste-field")).toHaveFocus();
  });
});
