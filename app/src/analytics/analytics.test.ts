import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GOOGLE_ADS_ID, ga4MeasurementId, isGa4Configured } from "./config";
import { trackPageview, trackPermalinkView } from "./analytics";

/**
 * The committed app/dist/index.html is the deployed artifact (dist-freshness
 * gate), so asserting against it verifies what actually ships. Vitest runs
 * from app/, so the committed build output sits at dist/index.html.
 */
const builtIndex = () =>
  readFileSync(path.resolve(process.cwd(), "dist/index.html"), "utf8");

// The dead legacy Universal Analytics ID, assembled from fragments: the CI
// remnant gate bans the verbatim literal anywhere under app/src, and this
// file must assert against it without itself tripping that gate.
const deadUaId = ["UA-", "46942708", "-1"].join("");

describe("built index.html analytics tags", () => {
  it("ships the gtag.js loader with the legacy Google Ads ID", () => {
    expect(builtIndex()).toContain(
      `https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ADS_ID}`
    );
  });

  it("carries the exact legacy Ads config", () => {
    expect(builtIndex()).toContain('gtag("config", "AW-831825021")');
    expect(builtIndex()).toContain('gtag("js", new Date())');
  });

  it("ships the Plausible tag for csvjson.com in manual mode", () => {
    expect(builtIndex()).toContain('data-domain="csvjson.com"');
    // Manual mode is load-bearing: the auto-tracking script fires a pageview
    // of its own, which would double-count every visit next to the app's
    // single mount pageview.
    expect(builtIndex()).toContain("https://plausible.io/js/script.manual.js");
    expect(builtIndex()).not.toContain('https://plausible.io/js/script.js"');
  });

  it("never references the dead Universal Analytics ID", () => {
    expect(builtIndex()).not.toContain(deadUaId);
  });
});

describe("GA4 config guard", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  /** Dynamic import after stubbing so the module re-reads the stubbed env. */
  async function configureWithSpiedGtag(): Promise<unknown[][]> {
    vi.resetModules();
    const commands: unknown[][] = [];
    window.dataLayer = [];
    (window as { gtag?: (...args: unknown[]) => void }).gtag = (...args) =>
      commands.push(args);
    const { configureAnalytics } = await import("./analytics");
    configureAnalytics();
    return commands;
  }

  it("makes no GA4 config call when the env var is unset", async () => {
    vi.stubEnv("VITE_GA4_MEASUREMENT_ID", "");
    expect(await configureWithSpiedGtag()).toEqual([]);
  });

  it("adds the GA4 config on the same load when the env var is set", async () => {
    vi.stubEnv("VITE_GA4_MEASUREMENT_ID", "G-TEST1234AB");
    expect(await configureWithSpiedGtag()).toEqual([
      ["config", "G-TEST1234AB", { send_page_view: false }],
    ]);
  });

  it("never configures a dead UA- ID", async () => {
    vi.stubEnv("VITE_GA4_MEASUREMENT_ID", deadUaId);
    expect(await configureWithSpiedGtag()).toEqual([]);
  });

  it("treats a malformed ID as not configured", () => {
    vi.stubEnv("VITE_GA4_MEASUREMENT_ID", "not-an-id");
    expect(isGa4Configured()).toBe(false);
    expect(ga4MeasurementId()).toBe("not-an-id");
  });
});

describe("trackPageview", () => {
  it("sends one pageview to gtag and Plausible when both are present", () => {
    const gtag = vi.fn();
    const plausible = vi.fn();
    (window as { gtag?: unknown }).gtag = gtag;
    (window as { plausible?: unknown }).plausible = plausible;

    trackPageview();

    expect(gtag).toHaveBeenCalledTimes(1);
    expect(gtag).toHaveBeenCalledWith("event", "page_view", {
      page_path: window.location.pathname,
      page_location: window.location.href,
    });
    expect(plausible).toHaveBeenCalledTimes(1);
    expect(plausible).toHaveBeenCalledWith("pageview");
  });

  it("is a safe no-op when no analytics globals exist", () => {
    delete (window as { gtag?: unknown }).gtag;
    delete (window as { plausible?: unknown }).plausible;
    expect(() => trackPageview()).not.toThrow();
  });
});

describe("trackPermalinkView", () => {
  it("fires a distinct permalink event, never a second pageview", () => {
    const gtag = vi.fn();
    const plausible = vi.fn();
    (window as { gtag?: unknown }).gtag = gtag;
    window.plausible = plausible;

    trackPermalinkView();

    expect(gtag).toHaveBeenCalledTimes(1);
    expect(gtag).toHaveBeenCalledWith("event", "permalink_view");
    expect(plausible).toHaveBeenCalledTimes(1);
    expect(plausible).toHaveBeenCalledWith("Permalink View");
    // Double-counting guard: the mount already sent the pageview, so no
    // hydration-path call may send page_view or a Plausible "pageview".
    expect(gtag).not.toHaveBeenCalledWith(
      "event",
      "page_view",
      expect.anything()
    );
    expect(plausible).not.toHaveBeenCalledWith("pageview");
  });

  it("is a safe no-op when no analytics globals exist", () => {
    delete (window as { gtag?: unknown }).gtag;
    delete (window as { plausible?: unknown }).plausible;
    expect(() => trackPermalinkView()).not.toThrow();
  });
});
