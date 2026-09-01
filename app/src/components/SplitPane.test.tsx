import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { SPLIT_MAX, SPLIT_MIN, SPLIT_RESET, clampSplit } from "@/lib/split";
import { SplitPane } from "./SplitPane";

function Harness() {
  const [split, setSplit] = useState(50);
  return (
    <SplitPane
      layout="side-by-side"
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
