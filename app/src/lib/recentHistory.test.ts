import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_OPTIONS } from "./convert";
import {
  buildSnapshotPreview,
  clearRecentHistory,
  formatRelativeTimestamp,
  loadRecentHistory,
  MAX_RECENT_SNAPSHOTS,
  MAX_SNAPSHOT_INPUT_CHARS,
  RECENT_HISTORY_STORAGE_KEY,
  removeRecentSnapshot,
  saveRecentSnapshot,
} from "./recentHistory";

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
  window.localStorage.clear();
});

describe("recentHistory storage helpers (AC-12 / D11)", () => {
  it("returns an empty array when storage is empty", () => {
    expect(loadRecentHistory()).toEqual([]);
  });

  it("saves a valid conversion snapshot and loads it back newest-first", () => {
    const saved = saveRecentSnapshot({
      direction: "csv2json",
      input: "name,score\nAda,99\nGrace,100",
      options: DEFAULT_OPTIONS,
      filename: "scores.csv",
      rows: 2,
      cols: 2,
      createdAt: 1_700_000_000_000,
    });

    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({
      direction: "csv2json",
      input: "name,score\nAda,99\nGrace,100",
      filename: "scores.csv",
      rows: 2,
      cols: 2,
      preview: "name,score",
      createdAt: 1_700_000_000_000,
    });
    expect(saved[0].id).toBeTruthy();
    expect(loadRecentHistory()).toEqual(saved);
  });

  it("deduplicates by direction + trimmed input, reuses id, updates metadata, and moves to top", () => {
    const first = saveRecentSnapshot({
      direction: "csv2json",
      input: "a,b\n1,2",
      options: DEFAULT_OPTIONS,
      filename: null,
      rows: 1,
      cols: 2,
      createdAt: 1_000,
    });
    const firstId = first[0].id;

    saveRecentSnapshot({
      direction: "json2csv",
      input: '[{"a":1,"b":2}]',
      options: DEFAULT_OPTIONS,
      filename: "items.json",
      rows: 1,
      cols: 2,
      createdAt: 2_000,
    });

    // Re-save the first CSV with surrounding whitespace and updated options/filename
    const updated = saveRecentSnapshot({
      direction: "csv2json",
      input: "  a,b\n1,2  \n",
      options: { ...DEFAULT_OPTIONS, hash: true },
      filename: "updated.csv",
      rows: 1,
      cols: 2,
      createdAt: 3_000,
    });

    expect(updated).toHaveLength(2);
    expect(updated[0].id).toBe(firstId);
    expect(updated[0].createdAt).toBe(3_000);
    expect(updated[0].filename).toBe("updated.csv");
    expect(updated[0].options.hash).toBe(true);
  });

  it("caps stored snapshots at 10 (MAX_RECENT_SNAPSHOTS), evicting the oldest", () => {
    for (let i = 1; i <= 12; i++) {
      saveRecentSnapshot({
        direction: "csv2json",
        input: `col\nrow_${i}`,
        options: DEFAULT_OPTIONS,
        filename: `file_${i}.csv`,
        rows: 1,
        cols: 1,
        createdAt: i * 1_000,
      });
    }

    const loaded = loadRecentHistory();
    expect(loaded).toHaveLength(MAX_RECENT_SNAPSHOTS);
    expect(loaded[0].filename).toBe("file_12.csv");
    expect(loaded[loaded.length - 1].filename).toBe("file_3.csv");
  });

  it("skips inputs larger than 100,000 characters or empty inputs", () => {
    saveRecentSnapshot({
      direction: "csv2json",
      input: "a,b\n1,2",
      options: DEFAULT_OPTIONS,
      filename: "small.csv",
      rows: 1,
      cols: 2,
      createdAt: 1_000,
    });

    const oversized = "a,b\n" + "1,2\n".repeat(30_000);
    expect(oversized.length).toBeGreaterThan(MAX_SNAPSHOT_INPUT_CHARS);

    const afterOversized = saveRecentSnapshot({
      direction: "csv2json",
      input: oversized,
      options: DEFAULT_OPTIONS,
      filename: "huge.csv",
      rows: 30_000,
      cols: 2,
      createdAt: 2_000,
    });
    expect(afterOversized).toHaveLength(1);
    expect(afterOversized[0].filename).toBe("small.csv");

    const afterEmpty = saveRecentSnapshot({
      direction: "csv2json",
      input: "   \n  ",
      options: DEFAULT_OPTIONS,
      filename: null,
      rows: 0,
      cols: 0,
      createdAt: 3_000,
    });
    expect(afterEmpty).toHaveLength(1);
  });

  it("removes an individual snapshot by id and clears all history", () => {
    const s1 = saveRecentSnapshot({
      direction: "csv2json",
      input: "a\n1",
      options: DEFAULT_OPTIONS,
      filename: "one.csv",
      rows: 1,
      cols: 1,
      createdAt: 1_000,
    })[0];
    const s2 = saveRecentSnapshot({
      direction: "csv2json",
      input: "b\n2",
      options: DEFAULT_OPTIONS,
      filename: "two.csv",
      rows: 1,
      cols: 1,
      createdAt: 2_000,
    })[0];

    const remaining = removeRecentSnapshot(s1.id);
    expect(remaining).toHaveLength(1);
    expect(remaining[0].id).toBe(s2.id);

    clearRecentHistory();
    expect(loadRecentHistory()).toEqual([]);
    expect(window.localStorage.getItem(RECENT_HISTORY_STORAGE_KEY)).toBeNull();
  });

  it("degrades gracefully on corrupted JSON, invalid entries, or throwing localStorage", () => {
    window.localStorage.setItem(RECENT_HISTORY_STORAGE_KEY, "{broken json");
    expect(loadRecentHistory()).toEqual([]);

    window.localStorage.setItem(
      RECENT_HISTORY_STORAGE_KEY,
      JSON.stringify([{ invalid: true }, null, "bad"])
    );
    expect(loadRecentHistory()).toEqual([]);

    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError: storage blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });

    expect(() => loadRecentHistory()).not.toThrow();
    expect(loadRecentHistory()).toEqual([]);
    expect(() =>
      saveRecentSnapshot({
        direction: "csv2json",
        input: "a,b\n1,2",
        options: DEFAULT_OPTIONS,
        filename: null,
        rows: 1,
        cols: 2,
      })
    ).not.toThrow();
    expect(() => clearRecentHistory()).not.toThrow();
  });

  it("formats first-line previews and relative timestamps cleanly", () => {
    expect(buildSnapshotPreview("\n\n  album,   year, chart \nElephant,2003")).toBe(
      "album, year, chart"
    );
    const longLine = "x".repeat(120);
    const preview = buildSnapshotPreview(longLine);
    expect(preview.length).toBe(80);
    expect(preview.endsWith("…")).toBe(true);

    const now = 1_700_000_000_000;
    expect(formatRelativeTimestamp(now - 10_000, now)).toBe("just now");
    expect(formatRelativeTimestamp(now - 5 * 60_000, now)).toBe("5m ago");
    expect(formatRelativeTimestamp(now - 3 * 3_600_000, now)).toBe("3h ago");
    expect(formatRelativeTimestamp(now - 24 * 3_600_000, now)).toBe("yesterday");
    expect(formatRelativeTimestamp(now - 4 * 24 * 3_600_000, now)).toBe("4d ago");
  });
});
