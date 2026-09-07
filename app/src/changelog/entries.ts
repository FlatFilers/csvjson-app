/**
 * Bundled changelog entries (spec: CSVJSON changelog widget, art_YzASNds2).
 *
 * Entries ship inside the hashed JS bundle — no fetch, no cache rule, no new
 * CI gate. Ids are monotonic integers that order the list and drive the
 * unseen-dot logic (any entry id > lastSeenId). Rendering goes through
 * newestFirst(), so the newest id is always on top regardless of the order
 * entries happen to be authored in this array.
 *
 * Authoring convention (recorded in .obvious/obvious.md): a PR that changes
 * what users experience adds one entry — or amends its own unreleased one —
 * in the same PR. Internal-only changes (CI, deps, admin) get no entry.
 */

export interface ChangelogEntry {
  /** Monotonic, never reused; ordering + unseen logic. */
  id: number;
  /** ISO "2026-09-05", displayed relatively ("2 days ago"). */
  date: string;
  /** User-visible, plain language. */
  title: string;
  /** 1–2 sentences. */
  summary: string;
  tag?: "new" | "fix" | "improvement";
}

/**
 * Rendered order: a sorted copy with the newest id first. Defensive — the
 * bundled array is authored newest first, but an out-of-order append must
 * never silently reshuffle the popout.
 */
export function newestFirst(entries: ChangelogEntry[]): ChangelogEntry[] {
  return [...entries].sort((a, b) => b.id - a.id);
}

export const changelogEntries: ChangelogEntry[] = [
  {
    id: 6,
    date: "2026-09-07",
    tag: "new",
    title: "Introducing the changelog",
    summary:
      "This changelog keeps you posted on what's new — recent updates appear here with an unseen dot when you come back. Feel free to vote on what you find useful.",
  },
  {
    id: 5,
    date: "2026-09-05",
    tag: "improvement",
    title: "Icons match the design",
    summary:
      "Action buttons, view toggle, and the empty state now use the same crisp icon set as the rest of the interface.",
  },
  {
    id: 4,
    date: "2026-09-05",
    tag: "new",
    title: "Edit the JSON output in place",
    summary:
      "The output pane is now an editor. Hand edits survive until you reconvert; revert and discard keep you safe.",
  },
  {
    id: 3,
    date: "2026-09-05",
    tag: "fix",
    title: "Pastes land where they belong",
    summary:
      "Paste anywhere on the page and your data routes to the input — including pastes over the read-only output pane.",
  },
  {
    id: 2,
    date: "2026-09-04",
    tag: "improvement",
    title: "A calmer empty state",
    summary:
      "Empty panes now open on a compact paste field with a Choose file button, so starting is obvious on any screen.",
  },
  {
    id: 1,
    date: "2026-09-04",
    tag: "improvement",
    title: "Smarter number handling",
    summary:
      "Numbers convert sensibly out of the box: leading-zero values like 00721 and very long IDs stay strings so nothing gets silently mangled.",
  },
];
