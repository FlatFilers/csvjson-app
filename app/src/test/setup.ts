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
