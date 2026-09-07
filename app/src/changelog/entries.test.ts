import { describe, expect, it } from "vitest";
import { changelogEntries, newestFirst } from "./entries";

/**
 * Bundled-entry schema tests (spec: CSVJSON changelog widget, art_YzASNds2,
 * criterion 1): the shipped list stays renderable and honest — unique
 * monotonic ids, ISO dates that agree with id order in the rendered list,
 * non-empty copy, known tags. Authoring order is free; newestFirst() sorts
 * at render.
 */

describe("changelogEntries", () => {
  it("ships at least five entries", () => {
    expect(changelogEntries.length).toBeGreaterThanOrEqual(5);
  });

  it("ships unique, positive integer ids (authoring order is free)", () => {
    const ids = changelogEntries.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(Number.isInteger(id)).toBe(true);
      expect(id).toBeGreaterThan(0);
    }
  });

  it("newestFirst() puts the highest id first for any authoring order", () => {
    const rendered = newestFirst([...changelogEntries].reverse());
    for (let i = 1; i < rendered.length; i++) {
      expect(rendered[i - 1].id).toBeGreaterThan(rendered[i].id);
    }
  });

  it("rendered dates never increase down the popout — dates agree with id order", () => {
    // ISO dates compare lexicographically; the displayed list (newest id
    // first) must read as an ordered history, the disorder David reported.
    const rendered = newestFirst(changelogEntries);
    for (let i = 1; i < rendered.length; i++) {
      expect(rendered[i - 1].date >= rendered[i].date).toBe(true);
    }
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
