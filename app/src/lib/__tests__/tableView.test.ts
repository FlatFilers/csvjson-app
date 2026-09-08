import { describe, expect, it } from "vitest";
import { filterRowIndices, sortRowIndices, splitHighlight } from "../tableView";

// Identity grid used across suites: headers are not part of these transforms —
// they only ever see the data rows.
const rows = [
  ["De Stijl", "2000"],
  ["Elephant", "2003"],
  ["White Blood Cells", "2001"],
  ["", "1999"],
];

describe("filterRowIndices", () => {
  it("empty query is the identity — all indices in source order", () => {
    expect(filterRowIndices(rows, "")).toEqual([0, 1, 2, 3]);
  });

  it("matches a case-insensitive substring in any cell", () => {
    expect(filterRowIndices(rows, "eleph")).toEqual([1]);
    expect(filterRowIndices(rows, "BLOOD")).toEqual([2]);
    expect(filterRowIndices(rows, "200")).toEqual([0, 1, 2]); // years 2000/2003/2001
  });

  it("returns only matching rows in source order", () => {
    expect(filterRowIndices(rows, "9")).toEqual([3]);
  });

  it("returns no rows when nothing matches", () => {
    expect(filterRowIndices(rows, "zeppelin")).toEqual([]);
  });

  it("does not match an empty cell against a non-empty query", () => {
    // "" would match any query under .includes(needle) if the needle were
    // empty; a non-empty needle must never match the empty cell itself.
    expect(filterRowIndices(rows, "x")).toEqual([]);
    // Row 3's first cell is empty; "0" only matches the populated years.
    expect(filterRowIndices(rows, "0")).toEqual([0, 1, 2]);
    expect(filterRowIndices([[""], [""]], "0")).toEqual([]);
  });
});

describe("sortRowIndices", () => {
  it("sorts a numeric column numerically ascending", () => {
    const order = sortRowIndices([0, 1, 2, 3], rows, 1, "asc", true);
    expect(order).toEqual([3, 0, 2, 1]); // 1999, 2000, 2001, 2003
  });

  it("sorts a numeric column numerically descending", () => {
    const order = sortRowIndices([0, 1, 2, 3], rows, 1, "desc", true);
    expect(order).toEqual([1, 2, 0, 3]); // 2003, 2001, 2000, 1999
  });

  it("forces non-numeric cells last in both directions (NaN-last)", () => {
    const numeric = [["10"], ["abc"], ["2"], [""]]; // idx 1 and 3 non-numeric
    expect(sortRowIndices([0, 1, 2, 3], numeric, 0, "asc", true)).toEqual([2, 0, 1, 3]);
    expect(sortRowIndices([0, 1, 2, 3], numeric, 0, "desc", true)).toEqual([0, 2, 1, 3]);
  });

  it("sorts text with localeCompare ascending", () => {
    const text = [["pear"], ["Apple"], ["fig"]];
    expect(sortRowIndices([0, 1, 2], text, 0, "asc", false)).toEqual([1, 2, 0]);
    expect(sortRowIndices([0, 1, 2], text, 0, "desc", false)).toEqual([0, 2, 1]);
  });

  it("sorts within a filtered subset only", () => {
    const order = sortRowIndices([1, 2], rows, 1, "asc", true);
    expect(order).toEqual([2, 1]); // 2001 < 2003
  });

  it("compares integers beyond Number.MAX_SAFE_INTEGER exactly", () => {
    const ids = [["9007199254740993"], ["9007199254740994"]];
    // Both round to the same double, so a Number-based comparator ties and
    // stable sort would keep the input order — the reversed input detects it.
    expect(sortRowIndices([1, 0], ids, 0, "asc", true)).toEqual([0, 1]);
    expect(sortRowIndices([0, 1], ids, 0, "desc", true)).toEqual([1, 0]);
  });

  it("does not mutate the input index array", () => {
    const indices = [2, 0, 1];
    sortRowIndices(indices, rows, 0, "asc", false);
    expect(indices).toEqual([2, 0, 1]);
  });

  it("keeps source order for ties (stable)", () => {
    const tied = [["b", "1"], ["a", "1"], ["c", "1"]];
    expect(sortRowIndices([0, 1, 2], tied, 1, "asc", true)).toEqual([0, 1, 2]);
  });

  it("tri-state restore: re-sorting to natural means returning the pre-sort order", () => {
    // The component drops the sort state on the third click; the identity
    // path (filter output) is the natural order — sorting desc then reading
    // the original array confirms the transform never rewrote it.
    const natural = filterRowIndices(rows, "");
    sortRowIndices(natural, rows, 0, "desc", false);
    expect(natural).toEqual([0, 1, 2, 3]);
  });
});

describe("splitHighlight", () => {
  it("empty query yields one literal part", () => {
    expect(splitHighlight("abc", "")).toEqual([{ text: "abc", hit: false }]);
  });

  it("splits literal/hit/literal around a case-insensitive match", () => {
    expect(splitHighlight("The Elephant", "ephan")).toEqual([
      { text: "The El", hit: false },
      { text: "ephan", hit: true },
      { text: "t", hit: false },
    ]);
  });

  it("marks every occurrence", () => {
    expect(splitHighlight("ab-ab", "ab")).toEqual([
      { text: "ab", hit: true },
      { text: "-", hit: false },
      { text: "ab", hit: true },
    ]);
  });

  it("treats the query as literal text, not a regex", () => {
    expect(splitHighlight("a.c", ".")).toEqual([
      { text: "a", hit: false },
      { text: ".", hit: true },
      { text: "c", hit: false },
    ]);
  });

  it("returns no parts for an empty cell", () => {
    expect(splitHighlight("", "x")).toEqual([]);
  });
});
