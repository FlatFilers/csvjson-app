import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ChangelogButton } from "./ChangelogButton";
import { changelogEntries, type ChangelogEntry } from "./entries";

/**
 * Ordering lock (fix for the misordered popout David reported): rendering
 * must derive from a newest-id-first sorted copy, so the bundled array's
 * authoring order can never silently reshuffle the display. The module mock
 * scrambles the real bundle — reversed, with a future entry spliced in
 * mid-array — and the tests hold the component to the same behaviour either
 * way.
 */

vi.mock("./entries", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./entries")>();
  const scrambled: ChangelogEntry[] = [...actual.changelogEntries].reverse();
  const newestRealId = Math.max(...actual.changelogEntries.map((entry) => entry.id));
  // A future contributor appends the next entry mid-array — the exact
  // mistake this fix must survive.
  scrambled.splice(2, 0, {
    id: newestRealId + 1,
    date: "2026-09-08",
    tag: "new",
    title: "A future entry, appended out of order",
    summary: "Inserted mid-array to prove authoring order cannot break the display.",
  });
  return { ...actual, changelogEntries: scrambled };
});

const STORAGE_KEY = "csvjson:changelog.v1";

function renderedIds(): number[] {
  return screen
    .getAllByTestId(/^changelog-entry-\d+$/)
    .map((node) => Number(node.dataset.testid?.replace("changelog-entry-", "")));
}

function storedState(): { lastSeenId?: number | null; votes?: Record<string, number> } {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  return raw === null ? {} : (JSON.parse(raw) as Record<string, never>);
}

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ChangelogButton — ordering lock", () => {
  it("renders rows in descending id order no matter how the bundle is authored", async () => {
    // The mock must really be scrambled or these assertions mean nothing.
    const authored = changelogEntries.map((entry) => entry.id);
    expect(authored).not.toEqual([...authored].sort((a, b) => b - a));

    const user = userEvent.setup();
    render(<ChangelogButton />);
    await user.click(screen.getByTestId("changelog-toggle"));

    const ids = renderedIds();
    expect(ids).toEqual([...ids].sort((a, b) => b - a));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("an out-of-order append still renders on top and drives the unseen dot", async () => {
    const user = userEvent.setup();
    const futureId = Math.max(...changelogEntries.map((entry) => entry.id));
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ lastSeenId: futureId - 1, votes: {} }),
    );
    render(<ChangelogButton />);

    // Id-based unseen logic: the out-of-order arrival is still "newer".
    expect(screen.getByTestId("changelog-dot")).toBeInTheDocument();

    await user.click(screen.getByTestId("changelog-toggle"));

    expect(renderedIds()[0]).toBe(futureId);
    expect(screen.getByTestId(`changelog-up-${futureId}`)).toBeInTheDocument();
    expect(screen.queryByTestId("changelog-dot")).not.toBeInTheDocument();
    expect(storedState().lastSeenId).toBe(futureId);
  });
});
