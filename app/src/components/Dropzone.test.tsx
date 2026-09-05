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

  it("shows an Apple shortcut chip beside the field", () => {
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
      "Press ⌘V to paste anywhere on this page"
    );
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

  it("keeps the browse and example affordances working", async () => {
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

    await user.click(screen.getByTestId("browse"));
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
