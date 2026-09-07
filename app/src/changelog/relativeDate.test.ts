import { describe, expect, it } from "vitest";
import { relativeDate } from "./relativeDate";

/**
 * Relative-date labels (spec: CSVJSON changelog widget, art_YzASNds2):
 * today/yesterday/days-ago inside the week, then a short date; years other
 * than the current one are stated explicitly. The clock is pinned via the
 * `now` argument.
 */

const NOW = Date.UTC(2026, 8, 7, 12, 0, 0); // Sep 7 2026, noon UTC

describe("relativeDate", () => {
  it("reads the entry's own day as today", () => {
    expect(relativeDate("2026-09-07", NOW)).toBe("today");
  });

  it("reads future-dated entries as today (clock skew is not a negative age)", () => {
    expect(relativeDate("2026-09-08", NOW)).toBe("today");
  });

  it("reads the previous day as yesterday", () => {
    expect(relativeDate("2026-09-06", NOW)).toBe("yesterday");
  });

  it("counts days ago inside the week window", () => {
    expect(relativeDate("2026-09-02", NOW)).toBe("5 days ago");
    // Seven days out is the edge of the window — it shows the date.
    expect(relativeDate("2026-08-31", NOW)).toBe("Aug 31");
    expect(relativeDate("2026-09-03", NOW)).toBe("4 days ago");
  });

  it("falls back to a short date past the week, same year", () => {
    expect(relativeDate("2026-08-20", NOW)).toBe("Aug 20");
  });

  it("states the year when it differs from the current one", () => {
    expect(relativeDate("2025-11-30", NOW)).toBe("Nov 30, 2025");
  });

  it("handles month and year boundaries (UTC calendar days, not 24h blocks)", () => {
    expect(relativeDate("2026-09-01", NOW)).toBe("6 days ago");
    expect(relativeDate("2025-12-31", NOW)).toBe("Dec 31, 2025");
  });
});
