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
// The stub fires the callback on observe so virtualizers measure via
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

// CodeMirror's measure pass reads DOMRects from text nodes through a Range
// (clientRectsFor → textRange().getClientRects) — jsdom's Range implements
// neither rects method. The editable output editor hits this on its first
// measure; return empty/zero rects so measurement sees a zero-size doc,
// the same shape the element-level stubs produce.
if (typeof Range.prototype.getClientRects !== "function") {
  Range.prototype.getClientRects = () =>
    ({ length: 0, item: () => null, [Symbol.iterator]: Array.prototype[Symbol.iterator] }) as unknown as DOMRectList;
}
if (typeof Range.prototype.getBoundingClientRect !== "function") {
  Range.prototype.getBoundingClientRect = () =>
    ({ x: 0, y: 0, width: 0, height: 0, top: 0, right: 0, bottom: 0, left: 0, toJSON: () => ({}) }) as DOMRect;
}
