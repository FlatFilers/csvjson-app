import { describe, expect, it } from "vitest";
import {
  MAX_CSV_HISTORY,
  createCsvHistory,
  matchHistoryShortcut,
  pushCsvHistory,
  redoCsvHistory,
  undoCsvHistory,
} from "./csvHistory";

describe("csvHistory", () => {
  it("seeds initial CSV from untouched empty state without creating an undo entry", () => {
    const empty = createCsvHistory();
    const seeded = pushCsvHistory(empty, "a,b\n1,2");
    expect(seeded.present).toBe("a,b\n1,2");
    expect(seeded.past).toEqual([]);
    expect(seeded.future).toEqual([]);
  });

  it("pushes mutations onto past, clears future, and ignores no-op commits", () => {
    let state = createCsvHistory("a,b\n1,2");
    expect(pushCsvHistory(state, "a,b\n1,2")).toBe(state);

    state = pushCsvHistory(state, "a,b\n9,2");
    state = pushCsvHistory(state, "a,b\n9,8");
    expect(state.past).toEqual(["a,b\n1,2", "a,b\n9,2"]);
    expect(state.present).toBe("a,b\n9,8");

    const undone = undoCsvHistory(state);
    expect(undone.present).toBe("a,b\n9,2");
    expect(undone.future).toEqual(["a,b\n9,8"]);

    const branched = pushCsvHistory(undone, "a,b\n7,7");
    expect(branched.past).toEqual(["a,b\n1,2", "a,b\n9,2"]);
    expect(branched.present).toBe("a,b\n7,7");
    expect(branched.future).toEqual([]);
  });

  it("supports multi-step undo and redo including Clear to empty string", () => {
    let state = createCsvHistory("a,b\n1,2");
    state = pushCsvHistory(state, "a,b\n3,4");
    state = pushCsvHistory(state, ""); // Clear

    expect(state.present).toBe("");
    expect(state.past).toEqual(["a,b\n1,2", "a,b\n3,4"]);

    const undo1 = undoCsvHistory(state);
    expect(undo1.present).toBe("a,b\n3,4");
    const undo2 = undoCsvHistory(undo1);
    expect(undo2.present).toBe("a,b\n1,2");
    expect(undo2.past).toEqual([]);
    expect(undoCsvHistory(undo2)).toBe(undo2);

    const redo1 = redoCsvHistory(undo2);
    expect(redo1.present).toBe("a,b\n3,4");
    const redo2 = redoCsvHistory(redo1);
    expect(redo2.present).toBe("");
    expect(redo2.future).toEqual([]);
    expect(redoCsvHistory(redo2)).toBe(redo2);
  });

  it("bounds past stack at MAX_CSV_HISTORY (50) entries", () => {
    let state = createCsvHistory("row-0");
    for (let i = 1; i <= 60; i++) {
      state = pushCsvHistory(state, `row-${i}`);
    }
    expect(state.past.length).toBe(MAX_CSV_HISTORY);
    expect(state.past[0]).toBe("row-10");
    expect(state.past[state.past.length - 1]).toBe("row-59");
    expect(state.present).toBe("row-60");
  });

  it("matches Mod+Z, Mod+Shift+Z, and Mod+Y shortcuts", () => {
    const base = {
      key: "z",
      metaKey: false,
      ctrlKey: false,
      shiftKey: false,
      altKey: false,
    };
    expect(matchHistoryShortcut({ ...base, ctrlKey: true })).toBe("undo");
    expect(matchHistoryShortcut({ ...base, metaKey: true })).toBe("undo");
    expect(
      matchHistoryShortcut({ ...base, key: "Z", ctrlKey: true, shiftKey: true })
    ).toBe("redo");
    expect(
      matchHistoryShortcut({ ...base, key: "z", metaKey: true, shiftKey: true })
    ).toBe("redo");
    expect(matchHistoryShortcut({ ...base, key: "y", ctrlKey: true })).toBe(
      "redo"
    );
    expect(
      matchHistoryShortcut({ ...base, key: "y", ctrlKey: true, shiftKey: true })
    ).toBeNull();
    expect(
      matchHistoryShortcut({ ...base, key: "z", ctrlKey: true, altKey: true })
    ).toBeNull();
    expect(matchHistoryShortcut(base)).toBeNull();
  });
});
