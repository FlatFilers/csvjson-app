import { useState } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { SPLIT_MAX, SPLIT_MIN, SPLIT_RESET, clampSplit } from "@/lib/split";
import { SplitPane, type SplitLayout } from "./SplitPane";

function Harness({ layout = "side-by-side" }: { layout?: SplitLayout }) {
  const [split, setSplit] = useState(50);
  return (
    <SplitPane
      layout={layout}
      split={split}
      onSplitChange={setSplit}
      left={null}
      right={null}
    />
  );
}

/** Same split, but with the floating direction switch as seam children. */
function SwitchHarness() {
  const [split, setSplit] = useState(50);
  return (
    <SplitPane
      layout="side-by-side"
      split={split}
      onSplitChange={setSplit}
      left={null}
      right={null}
    >
      <button type="button" data-testid="divider-switch">⇄</button>
    </SplitPane>
  );
}

/** jsdom getBoundingClientRect always returns zeros — stub the container's width. */
function stubContainerWidth() {
  const seam = screen.getByTestId("seam");
  const container = seam.parentElement as HTMLElement;
  Object.defineProperty(container, "getBoundingClientRect", {
    value: () => ({ left: 0, top: 0, width: 1000, height: 500 }),
  });
}

function splitValue() {
  return Number(screen.getByTestId("seam").getAttribute("aria-valuenow"));
}

async function dragSeamTo(seam: HTMLElement, clientX: number) {
  const user = userEvent.setup();
  await user.pointer({ target: seam, keys: "[MouseLeft>]" });
  window.dispatchEvent(new PointerEvent("pointermove", { clientX }));
  window.dispatchEvent(new PointerEvent("pointerup"));
}

describe("clampSplit", () => {
  it("clamps below 20 and above 80, passes through in-range values", () => {
    expect(clampSplit(0)).toBe(SPLIT_MIN);
    expect(clampSplit(5)).toBe(SPLIT_MIN);
    expect(clampSplit(50)).toBe(50);
    expect(clampSplit(95)).toBe(SPLIT_MAX);
    expect(clampSplit(120)).toBe(SPLIT_MAX);
  });
});

describe("SplitPane seam dragging", () => {
  it("clamps drag position to 20–80%", async () => {
    render(<Harness />);
    stubContainerWidth();
    const seam = screen.getByTestId("seam");

    await dragSeamTo(seam, -500);
    expect(splitValue()).toBe(SPLIT_MIN);

    await dragSeamTo(seam, 2000);
    expect(splitValue()).toBe(SPLIT_MAX);
  });

  it("follows the pointer within the clamp range", async () => {
    render(<Harness />);
    stubContainerWidth();
    const seam = screen.getByTestId("seam");

    await dragSeamTo(seam, 350);
    expect(splitValue()).toBe(35);
  });

  it("double-click resets the seam to 50/50", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    stubContainerWidth();
    const seam = screen.getByTestId("seam");

    await dragSeamTo(seam, 700);
    expect(splitValue()).toBe(70);

    await user.dblClick(seam);
    expect(splitValue()).toBe(SPLIT_RESET);
  });

  it("stops resizing after pointerup", async () => {
    render(<Harness />);
    stubContainerWidth();
    const seam = screen.getByTestId("seam");

    await dragSeamTo(seam, 400);
    window.dispatchEvent(new PointerEvent("pointermove", { clientX: 700 }));
    expect(splitValue()).toBe(40);
  });

  it("ignores pointerdowns that start on the floating switch", () => {
    // Regression: the seam's pointer capture used to retarget a click on
    // the divider switch to the seam, so the ⇄ button never fired on real
    // mouse input (Playwright walkthrough caught it; jsdom's synthetic
    // click did not).
    render(<SwitchHarness />);
    stubContainerWidth();

    screen
      .getByTestId("divider-switch")
      .dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    window.dispatchEvent(new PointerEvent("pointermove", { clientX: 700 }));
    window.dispatchEvent(new PointerEvent("pointerup"));
    expect(splitValue()).toBe(50); // untouched — the switch owns the gesture
  });
  it("resizes with arrow keys and resets with Enter", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const seam = screen.getByTestId("seam");

    seam.focus();
    await user.keyboard("{ArrowRight}");
    expect(splitValue()).toBe(51);

    // Shift makes the step 5.
    await user.keyboard("{Shift>}{ArrowLeft}{/Shift}");
    expect(splitValue()).toBe(46);

    await user.keyboard("{Enter}");
    expect(splitValue()).toBe(SPLIT_RESET);
  });
});

describe("SplitPane CSS-first orientation", () => {
  function container() {
    return screen.getByTestId("seam").parentElement as HTMLElement;
  }
  function classList(el: Element): string[] {
    return el.className.split(/\s+/);
  }

  it("renders identical direction classes for both layouts", () => {
    // Orientation must not be a JS decision: the same classes ship in the
    // prerendered HTML and paint correctly in either viewport before React
    // mounts (fix for the stacked→columns first-paint flash on desktop).
    for (const layout of ["stacked", "side-by-side"] as const) {
      const { unmount } = render(<Harness layout={layout} />);
      const classes = classList(container());
      expect(classes).toContain("flex-col");
      expect(classes).toContain("md:flex-row");
      expect(classes).not.toContain("flex-row");
      unmount();
    }
  });

  it("sizes panes via responsive var classes in both layouts", () => {
    for (const layout of ["stacked", "side-by-side"] as const) {
      const { unmount } = render(<Harness layout={layout} />);
      const classes = classList(screen.getByTestId("pane-left"));
      expect(classes).toContain("h-[var(--split)]");
      expect(classes).toContain("md:h-auto");
      expect(classes).toContain("md:w-[var(--split)]");
      expect(classes).toContain("border-b");
      expect(classes).toContain("md:border-b-0");
      expect(classes).toContain("md:border-r");
      unmount();
    }
  });

  it("exposes the split position as a --split custom property on panes and seam", () => {
    render(<Harness />);
    for (const el of [screen.getByTestId("pane-left"), screen.getByTestId("seam")]) {
      expect((el as HTMLElement).style.getPropertyValue("--split")).toBe("50%");
    }
  });

  it("keeps orientation-ternary inline geometry out of the markup", () => {
    // Inline width/height/top/left styles baked one orientation into the
    // prerendered HTML; only the orientation-neutral --split var and
    // touch-action may stay inline.
    render(<Harness />);
    const pane = screen.getByTestId("pane-left") as HTMLElement;
    const seam = screen.getByTestId("seam") as HTMLElement;
    expect(pane.style.height).toBe("");
    expect(pane.style.width).toBe("");
    expect(seam.style.top).toBe("");
    expect(seam.style.left).toBe("");
    expect(seam.style.touchAction).toBe("none");
  });

  it("keeps cursor and aria-orientation following the layout prop", () => {
    // aria-orientation is not a first-paint visual concern — JS-driven is fine.
    const stacked = render(<Harness layout="stacked" />);
    expect(screen.getByTestId("seam").getAttribute("aria-orientation")).toBe("horizontal");
    expect(classList(screen.getByTestId("seam"))).toContain("cursor-row-resize");
    stacked.unmount();

    render(<Harness layout="side-by-side" />);
    // Re-query: the second mount renders fresh DOM nodes.
    expect(screen.getByTestId("seam").getAttribute("aria-orientation")).toBe("vertical");
    expect(classList(screen.getByTestId("seam"))).toContain("md:cursor-col-resize");
  });

  it("drag updates the --split custom property the CSS consumes", async () => {
    render(<Harness />);
    stubContainerWidth();
    const seam = screen.getByTestId("seam");

    await dragSeamTo(seam, 350);
    expect(
      (screen.getByTestId("pane-left") as HTMLElement).style
        .getPropertyValue("--split")
    ).toBe("35%");
  });
});

describe("SplitPane text selection", () => {
  function container() {
    return screen.getByTestId("seam").parentElement as HTMLElement;
  }

  it("keeps pane text selectable outside of a drag", () => {
    // Regression: select-none used to sit on the container unconditionally,
    // making every pane (table cells, JSON editors, read-only output,
    // raw text) unselectable with the mouse.
    render(<Harness />);
    expect(container().className).not.toContain("select-none");
  });

  it("suppresses selection only while a seam drag is live", async () => {
    render(<Harness />);
    stubContainerWidth();
    const seam = screen.getByTestId("seam");
    const user = userEvent.setup();

    await user.pointer({ target: seam, keys: "[MouseLeft>]" }); // down, not up
    expect(container().className).toContain("select-none");

    window.dispatchEvent(new PointerEvent("pointerup"));
    // The pointerup listener is native (not React), so the state update
    // flushes on a microtask — wait for the re-render.
    await waitFor(() => expect(container().className).not.toContain("select-none"));
  });
});
