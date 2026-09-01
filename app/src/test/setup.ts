import { beforeEach } from "vitest";
import "@testing-library/jest-dom/vitest";

// jsdom does not implement matchMedia — stub it. Default: desktop (≥768px).
let stubMatches = true;

export function setMediaQueryMatches(matches: boolean) {
  stubMatches = matches;
}

beforeEach(() => {
  stubMatches = true;
});

window.matchMedia = ((query: string) => ({
  // Only the breakpoint query is controlled by tests; prefers-color-scheme
  // always reports light so the initial theme is deterministic.
  matches: query.includes("min-width") ? stubMatches : false,
  media: query,
  onchange: null,
  addListener: () => {},
  removeListener: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => false,
})) as unknown as typeof window.matchMedia;

// CodeMirror 6 and TanStack Virtual need ResizeObserver; jsdom lacks it.
// The stub fires the callback once on observe so virtualizers measure via
// the element's (test-stubbed) getBoundingClientRect.
class ResizeObserverStub implements ResizeObserver {
  private callback: ResizeObserverCallback;
  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }
  observe(target: Element) {
    this.callback(
      [{ target } as ResizeObserverEntry],
      this as unknown as ResizeObserver
    );
  }
  unobserve() {}
  disconnect() {}
}
if (typeof globalThis.ResizeObserver === "undefined") {
  (globalThis as unknown as { ResizeObserver: typeof ResizeObserver }).ResizeObserver =
    ResizeObserverStub;
}
