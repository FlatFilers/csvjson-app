import { describe, expect, it } from "vitest";
import { changelogEntries } from "./entries";

/**
 * Bundled-entry schema tests (spec: CSVJSON changelog widget, art_YzASNds2,
 * criterion 1): the shipped list stays renderable and honest — monotonic
 * ids ordering newest-first, ISO dates, non-empty copy, known tags.
 */

describe("changelogEntries", () => {
  it("ships at least five entries", () => {
    expect(changelogEntries.length).toBeGreaterThanOrEqual(5);
  });

  it("renders newest first with strictly decreasing, unique ids", () => {
    for (let i = 1; i < changelogEntries.length; i++) {
      expect(changelogEntries[i - 1].id).toBeGreaterThan(changelogEntries[i].id);
    }
    const ids = changelogEntries.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("uses ISO dates that parse as real calendar days", () => {
    for (const entry of changelogEntries) {
      expect(entry.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      const parsed = new Date(`${entry.date}T00:00:00Z`);
      expect(parsed.toISOString().slice(0, 10)).toBe(entry.date);
    }
  });

  it("never ships empty copy", () => {
    for (const entry of changelogEntries) {
      expect(entry.title.trim()).not.toBe("");
      expect(entry.summary.trim()).not.toBe("");
      // The spec's 1–2 sentence budget for summaries.
      expect(entry.summary.split(/[.!?]+/).filter((s) => s.trim() !== "").length).toBeLessThanOrEqual(2);
    }
  });

  it("uses only the known tag values", () => {
    for (const entry of changelogEntries) {
      if (entry.tag !== undefined) {
        expect(["new", "fix", "improvement"]).toContain(entry.tag);
      }
    }
  });
});
