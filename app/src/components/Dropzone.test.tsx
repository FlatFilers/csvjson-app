import { render, screen } from "@testing-library/react";
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

describe("Dropzone paste-anywhere affordance", () => {
  it("leads with the paste-anywhere behavior and an Apple shortcut chip", () => {
    const restore = shadowNavigator("platform", "MacIntel");
    render(<Dropzone format="CSV" onBrowse={() => {}} onTryExample={() => {}} />);
    restore();

    expect(screen.getByTestId("paste-shortcut").textContent).toBe("⌘V");
    expect(screen.getByTestId("dropzone").textContent).toContain(
      "Press ⌘V to paste your data — anywhere on this page"
    );
  });

  it("shows Ctrl+V on Windows/Linux", () => {
    const restore = shadowNavigator("platform", "Win32");
    render(<Dropzone format="CSV" onBrowse={() => {}} onTryExample={() => {}} />);
    restore();

    expect(screen.getByTestId("paste-shortcut").textContent).toBe("Ctrl+V");
  });

  it("shows both shortcuts when the platform cannot be determined", () => {
    const restore = shadowNavigator("platform", "");
    render(<Dropzone format="JSON" onBrowse={() => {}} onTryExample={() => {}} />);
    restore();

    expect(screen.getByTestId("paste-shortcut").textContent).toBe("⌘V / Ctrl+V");
  });

  it("prefers userAgentData.platform over the legacy platform string", () => {
    const restorePlatform = shadowNavigator("platform", "Win32");
    const restoreUa = shadowNavigator("userAgentData", { platform: "macOS" });
    render(<Dropzone format="CSV" onBrowse={() => {}} onTryExample={() => {}} />);
    restorePlatform();
    restoreUa();

    expect(screen.getByTestId("paste-shortcut").textContent).toBe("⌘V");
  });

  it("carries the paste-anywhere affordance in the aria-label", () => {
    const restore = shadowNavigator("platform", "MacIntel");
    render(<Dropzone format="CSV" onBrowse={() => {}} onTryExample={() => {}} />);
    restore();

    expect(
      screen.getByRole("button", { name: /paste anywhere on this page/i })
    ).toHaveAttribute(
      "aria-label",
      "Empty input — press ⌘V to paste anywhere on this page, drag & drop, or browse for a CSV file"
    );
  });

  it("keeps the browse and example affordances working", async () => {
    const user = userEvent.setup();
    const onBrowse = vi.fn();
    const onTryExample = vi.fn();
    render(<Dropzone format="CSV" onBrowse={onBrowse} onTryExample={onTryExample} />);

    await user.click(screen.getByTestId("browse"));
    await user.click(screen.getByTestId("try-example"));
    expect(onBrowse).toHaveBeenCalledTimes(1);
    expect(onTryExample).toHaveBeenCalledTimes(1);
    // The field-implying copy is gone.
    expect(screen.getByTestId("dropzone").textContent).not.toContain(
      "paste, or"
    );
  });
});
