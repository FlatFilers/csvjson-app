import { afterEach, describe, expect, it, vi } from "vitest";
import {
  byteLength,
  createConversionTracker,
  sizeBucket,
  trackConversion,
  trackExport,
} from "./events";

/**
 * Payload-level tests for the conversion/export event fan-out and the
 * stateful conversion tracker (fire-once-per-signature, 2s window, settle
 * debounce). window.gtag / window.plausible are mocked; the helper must be
 * a safe no-op when either is absent.
 */

function installAnalytics() {
  const gtag = vi.fn();
  const plausible = vi.fn();
  (window as { gtag?: unknown }).gtag = gtag;
  (window as { plausible?: unknown }).plausible = plausible;
  return { gtag, plausible };
}

afterEach(() => {
  delete (window as { gtag?: unknown }).gtag;
  delete (window as { plausible?: unknown }).plausible;
  vi.useRealTimers();
});

describe("event payloads", () => {
  it("fans a conversion event to gtag and Plausible with lowercase machine names", () => {
    const { gtag, plausible } = installAnalytics();

    trackConversion({
      direction: "csv_to_json",
      input: "file",
      size: "10-100KB",
    });

    expect(gtag).toHaveBeenCalledTimes(1);
    expect(gtag).toHaveBeenCalledWith("event", "conversion", {
      direction: "csv_to_json",
      input: "file",
      size: "10-100KB",
    });
    // Same call site feeds Plausible under its capitalized goal name with
    // the same props — one machine name on both surfaces.
    expect(plausible).toHaveBeenCalledTimes(1);
    expect(plausible).toHaveBeenCalledWith("Conversion", {
      props: { direction: "csv_to_json", input: "file", size: "10-100KB" },
    });
  });

  it("fans an export event to both surfaces with via + resolved format", () => {
    const { gtag, plausible } = installAnalytics();

    trackExport({ via: "download", format: "csv" });

    expect(gtag).toHaveBeenCalledTimes(1);
    expect(gtag).toHaveBeenCalledWith("event", "export", {
      via: "download",
      format: "csv",
    });
    expect(plausible).toHaveBeenCalledWith("Export", {
      props: { via: "download", format: "csv" },
    });
  });

  it("is a safe no-op when no analytics globals exist", () => {
    delete (window as { gtag?: unknown }).gtag;
    delete (window as { plausible?: unknown }).plausible;
    expect(() =>
      trackConversion({ direction: "json_to_csv", input: "paste", size: "<10KB" })
    ).not.toThrow();
    expect(() =>
      trackExport({ via: "copy", format: "json" })
    ).not.toThrow();
  });
});

describe("sizeBucket", () => {
  it("buckets bytes at the 10KB / 100KB / 1MB boundaries", () => {
    expect(sizeBucket(0)).toBe("<10KB");
    expect(sizeBucket(10 * 1024 - 1)).toBe("<10KB");
    expect(sizeBucket(10 * 1024)).toBe("10-100KB");
    expect(sizeBucket(100 * 1024 - 1)).toBe("10-100KB");
    expect(sizeBucket(100 * 1024)).toBe("100KB-1MB");
    expect(sizeBucket(1024 * 1024 - 1)).toBe("100KB-1MB");
    expect(sizeBucket(1024 * 1024)).toBe(">1MB");
  });
});

describe("conversion tracker", () => {
  it("fires one event per settled input with the exact payload", () => {
    vi.useFakeTimers();
    const { gtag, plausible } = installAnalytics();
    const tracker = createConversionTracker();

    tracker.edit("csv_to_json", "album,year\nElephant,2003");
    expect(gtag).not.toHaveBeenCalled(); // input has not settled

    vi.advanceTimersByTime(2000);

    const size = sizeBucket(byteLength("album,year\nElephant,2003"));
    expect(gtag).toHaveBeenCalledTimes(1);
    expect(gtag).toHaveBeenCalledWith("event", "conversion", {
      direction: "csv_to_json",
      input: "paste",
      size,
    });
    expect(plausible).toHaveBeenCalledTimes(1);
    expect(plausible).toHaveBeenCalledWith("Conversion", {
      props: { direction: "csv_to_json", input: "paste", size },
    });
  });

  it("debounces: fires once for a burst of keystrokes, ~2s after the last edit", () => {
    vi.useFakeTimers();
    const { gtag } = installAnalytics();
    const tracker = createConversionTracker();

    tracker.edit("csv_to_json", "a,b");
    vi.advanceTimersByTime(1500);
    tracker.edit("csv_to_json", "a,b,c"); // 6 chars — new length
    vi.advanceTimersByTime(1500); // 3s total since first edit, but 1.5s since last edit

    expect(gtag).not.toHaveBeenCalled();

    vi.advanceTimersByTime(500);
    expect(gtag).toHaveBeenCalledTimes(1);
  });

  it("fires once per signature: same input settles again without refiring", () => {
    vi.useFakeTimers();
    const { gtag } = installAnalytics();
    const tracker = createConversionTracker();

    tracker.edit("csv_to_json", "a,b");
    vi.advanceTimersByTime(2000);
    expect(gtag).toHaveBeenCalledTimes(1);

    // Same direction + method + length: the input has not actually changed.
    tracker.edit("csv_to_json", "a,b");
    vi.advanceTimersByTime(3000);
    expect(gtag).toHaveBeenCalledTimes(1);

    // Input actually changes (length grows) → fires again.
    tracker.edit("csv_to_json", "a,b,c");
    vi.advanceTimersByTime(3000);
    expect(gtag).toHaveBeenCalledTimes(2);
  });

  it("never fires more than one conversion event per 2s window", () => {
    const now = vi.fn(() => 10_000);
    const { gtag } = installAnalytics();
    const tracker = createConversionTracker({ now });

    tracker.discrete("csv_to_json", "file", "a,b");
    expect(gtag).toHaveBeenCalledTimes(1); // discrete fires immediately

    // Different input, but inside the 2s window → dropped.
    tracker.discrete("csv_to_json", "drag", "a,b,c,d");
    expect(gtag).toHaveBeenCalledTimes(1); // dropped

    // Past the window, a genuinely new input fires again.
    now.mockReturnValue(10_000 + 2001);
    tracker.discrete("csv_to_json", "permalink", "a,b,c,d,e");
    expect(gtag).toHaveBeenCalledTimes(2);
  });

  it("fires discrete inputs immediately with the given input method", () => {
    const { gtag } = installAnalytics();
    const tracker = createConversionTracker();

    tracker.discrete("json_to_csv", "permalink", '{"a":[1,2]}');

    expect(gtag).toHaveBeenCalledTimes(1);
    expect(gtag).toHaveBeenCalledWith("event", "conversion", {
      direction: "json_to_csv",
      input: "permalink",
      size: sizeBucket(byteLength('{"a":[1,2]}')),
    });
  });

  it("never counts an empty or invalid result as a conversion", () => {
    vi.useFakeTimers();
    const { gtag } = installAnalytics();
    const tracker = createConversionTracker({
      isValid: (_direction, text) => text.startsWith("a,"),
    });

    tracker.edit("csv_to_json", "");
    vi.advanceTimersByTime(3000);
    expect(gtag).not.toHaveBeenCalled();

    tracker.edit("csv_to_json", "garbage");
    vi.advanceTimersByTime(2000);
    expect(gtag).not.toHaveBeenCalled(); // invalid result — not a conversion

    // Later a valid settle fires; the invalid input never burned the window.
    tracker.edit("csv_to_json", "a,b");
    vi.advanceTimersByTime(2000);
    expect(gtag).toHaveBeenCalledTimes(1);
  });

  it("drops pending work when the input is cleared", () => {
    vi.useFakeTimers();
    const { gtag } = installAnalytics();
    const tracker = createConversionTracker();

    tracker.edit("csv_to_json", "a,b");
    tracker.cancel();
    vi.advanceTimersByTime(5000);

    expect(gtag).not.toHaveBeenCalled();
  });

  it("is a safe no-op when no analytics globals exist", () => {
    delete (window as { gtag?: unknown }).gtag;
    delete (window as { plausible?: unknown }).plausible;
    const tracker = createConversionTracker();
    expect(() => {
      tracker.edit("csv_to_json", "a,b");
      tracker.discrete("csv_to_json", "file", "a,b");
      trackConversion({ direction: "csv_to_json", input: "paste", size: "<10KB" });
      trackExport({ via: "copy", format: "json" });
    }).not.toThrow();
  });
});
