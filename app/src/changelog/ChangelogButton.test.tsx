import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ChangelogButton } from "./ChangelogButton";

/**
 * Behaviour tests for the header changelog widget (spec: CSVJSON changelog
 * widget, art_YzASNds2, criteria 2–4): the unseen-dot matrix with mocked
 * localStorage, popout open/close discipline with focus return, and the
 * vote semantics — optimistic render, other-thumb updates, no-op re-clicks,
 * and the honest retry queue that never blocks the page.
 */

const STORAGE_KEY = "csvjson:changelog.v1";
const NEWEST_ID = 6; // newest bundled entry (entries.test pins the ids)

function installAnalytics() {
  const gtag = vi.fn();
  const plausible = vi.fn();
  (window as { gtag?: unknown }).gtag = gtag;
  (window as { plausible?: unknown }).plausible = plausible;
  return { gtag, plausible };
}

function installFetch(implementation: () => Promise<Response>) {
  const mock = vi.fn(implementation);
  vi.stubGlobal("fetch", mock);
  return mock;
}

function okResponse(): Response {
  return { ok: true, status: 204 } as Response;
}

function sentPayload(mock: ReturnType<typeof vi.fn>, callIndex = 0): Record<string, unknown> {
  const [, init] = mock.mock.calls[callIndex] as [string, RequestInit];
  expect(init.method).toBe("POST");
  expect(String(mock.mock.calls[callIndex][0])).toBe("/api/changelog-vote");
  return JSON.parse(String(init.body)) as Record<string, unknown>;
}

function storedState(): {
  lastSeenId?: number | null;
  votes?: Record<string, number>;
  clientId?: string;
  pendingIds?: number[];
} {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  return raw === null ? {} : (JSON.parse(raw) as Record<string, never>);
}

/**
 * Vote events only — opening the popout also fires changelog_open, so vote
 * assertions must not count the open event.
 */
function voteEvents(mock: ReturnType<typeof vi.fn>): unknown[][] {
  return mock.mock.calls.filter(
    (call) => call[0] === "event" && call[1] === "changelog_vote",
  );
}

function plausibleVoteEvents(mock: ReturnType<typeof vi.fn>): unknown[][] {
  return mock.mock.calls.filter((call) => call[0] === "Changelog Vote");
}

async function openPopout(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByTestId("changelog-toggle"));
}

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  delete (window as { gtag?: unknown }).gtag;
  delete (window as { plausible?: unknown }).plausible;
});

describe("ChangelogButton — seen-state dot (criterion 2)", () => {
  it("renders the trigger without the dot or popout on a first visit", () => {
    const fetchMock = installFetch(() => Promise.resolve(okResponse()));
    render(<ChangelogButton />);

    expect(screen.getByTestId("changelog-toggle")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Changelog" })).toBeInTheDocument();
    expect(screen.queryByTestId("changelog-dot")).not.toBeInTheDocument();
    expect(screen.queryByTestId("changelog-popout")).not.toBeInTheDocument();
    // Never posts on mount — no entries are fetched (bundled), no votes sent.
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows the dot when an entry is newer than lastSeenId", () => {
    installFetch(() => Promise.resolve(okResponse()));
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ lastSeenId: NEWEST_ID - 2, votes: {} }),
    );
    render(<ChangelogButton />);

    expect(screen.getByTestId("changelog-dot")).toBeInTheDocument();
  });

  it("never shows the dot when lastSeenId is already the newest entry", () => {
    installFetch(() => Promise.resolve(okResponse()));
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ lastSeenId: NEWEST_ID, votes: {} }),
    );
    render(<ChangelogButton />);

    expect(screen.queryByTestId("changelog-dot")).not.toBeInTheDocument();
  });

  it("opening the popout sets lastSeenId to the newest id and clears the dot", async () => {
    const user = userEvent.setup();
    installFetch(() => Promise.resolve(okResponse()));
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ lastSeenId: NEWEST_ID - 2, votes: {} }),
    );
    render(<ChangelogButton />);

    await openPopout(user);

    expect(screen.queryByTestId("changelog-dot")).not.toBeInTheDocument();
    expect(storedState().lastSeenId).toBe(NEWEST_ID);
  });

  it("the cleared dot survives a reload", async () => {
    const user = userEvent.setup();
    installFetch(() => Promise.resolve(okResponse()));
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ lastSeenId: NEWEST_ID - 2, votes: {} }),
    );
    const { unmount } = render(<ChangelogButton />);
    await openPopout(user);
    unmount();

    render(<ChangelogButton />);

    expect(screen.queryByTestId("changelog-dot")).not.toBeInTheDocument();
  });

  it("degrades silently when localStorage reads throw — no dot, no crash", () => {
    installFetch(() => Promise.resolve(okResponse()));
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("storage blocked");
    });

    expect(() => render(<ChangelogButton />)).not.toThrow();
    expect(screen.getByTestId("changelog-toggle")).toBeInTheDocument();
    expect(screen.queryByTestId("changelog-dot")).not.toBeInTheDocument();
  });

  it("treats corrupted storage as a first visit", () => {
    installFetch(() => Promise.resolve(okResponse()));
    window.localStorage.setItem(STORAGE_KEY, "{not json");

    render(<ChangelogButton />);

    expect(screen.queryByTestId("changelog-dot")).not.toBeInTheDocument();
  });

  it("ignores stored state with malformed votes (type guard)", () => {
    installFetch(() => Promise.resolve(okResponse()));
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ lastSeenId: NEWEST_ID - 2, votes: { five: 1 } }),
    );

    render(<ChangelogButton />);

    expect(screen.queryByTestId("changelog-dot")).not.toBeInTheDocument();
  });
});

describe("ChangelogButton — popout interaction (criterion 3)", () => {
  it("opens as a labelled dialog with aria-expanded and entries newest-first", async () => {
    const { gtag, plausible } = installAnalytics();
    const user = userEvent.setup();
    installFetch(() => Promise.resolve(okResponse()));
    render(<ChangelogButton />);

    await openPopout(user);

    const popout = screen.getByTestId("changelog-popout");
    expect(popout).toHaveAttribute("role", "dialog");
    expect(popout).toHaveAttribute("aria-label", "Changelog");
    expect(screen.getByTestId("changelog-toggle")).toHaveAttribute("aria-expanded", "true");
    // Opening the popout is the changelog_open engagement event.
    expect(gtag).toHaveBeenCalledWith("event", "changelog_open");
    expect(plausible).toHaveBeenCalledWith("Changelog Open");

    const renderedIds = screen
      .getAllByTestId(/^changelog-entry-\d+$/)
      .map((node) => Number(node.dataset.testid?.replace("changelog-entry-", "")));
    expect(renderedIds).toEqual([6, 5, 4, 3, 2, 1]);
    // Rows render tag chip, relative date, title, summary, and thumb pair.
    expect(screen.getByTestId("changelog-up-5")).toBeInTheDocument();
    expect(screen.getByTestId("changelog-down-5")).toBeInTheDocument();
    expect(screen.getByText("Edit the JSON output in place")).toBeInTheDocument();
  });

  it("closes on Escape and returns focus to the trigger", async () => {
    const user = userEvent.setup();
    installFetch(() => Promise.resolve(okResponse()));
    render(<ChangelogButton />);

    await openPopout(user);
    await user.keyboard("{Escape}");

    expect(screen.queryByTestId("changelog-popout")).not.toBeInTheDocument();
    expect(screen.getByTestId("changelog-toggle")).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByTestId("changelog-toggle")).toHaveFocus();
  });

  it("closes on outside click and returns focus to the trigger", async () => {
    const user = userEvent.setup();
    installFetch(() => Promise.resolve(okResponse()));
    render(<ChangelogButton />);

    await openPopout(user);
    await user.click(document.body);

    expect(screen.queryByTestId("changelog-popout")).not.toBeInTheDocument();
    expect(screen.getByTestId("changelog-toggle")).toHaveFocus();
  });

  it("closes via the close button and via a second trigger click", async () => {
    const user = userEvent.setup();
    installFetch(() => Promise.resolve(okResponse()));
    render(<ChangelogButton />);

    await openPopout(user);
    await user.click(screen.getByTestId("changelog-close"));
    expect(screen.queryByTestId("changelog-popout")).not.toBeInTheDocument();

    await openPopout(user);
    await user.click(screen.getByTestId("changelog-toggle"));
    expect(screen.queryByTestId("changelog-popout")).not.toBeInTheDocument();
  });

  it("keeps aria-expanded false and fires no analytics while closed", () => {
    const { gtag, plausible } = installAnalytics();
    installFetch(() => Promise.resolve(okResponse()));
    render(<ChangelogButton />);

    expect(screen.getByTestId("changelog-toggle")).toHaveAttribute("aria-expanded", "false");
    expect(gtag).not.toHaveBeenCalled();
    expect(plausible).not.toHaveBeenCalled();
  });
});

describe("ChangelogButton — votes (criterion 4)", () => {
  it("votes optimistically: pressed thumb and persisted state before the POST settles", async () => {
    const { gtag, plausible } = installAnalytics();
    installFetch(() => new Promise<Response>(() => {})); // never settles
    const user = userEvent.setup();
    render(<ChangelogButton />);

    await openPopout(user);
    await user.click(screen.getByTestId(`changelog-up-${NEWEST_ID}`));

    expect(screen.getByTestId(`changelog-up-${NEWEST_ID}`)).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId(`changelog-down-${NEWEST_ID}`)).toHaveAttribute("aria-pressed", "false");
    const state = storedState();
    expect(state.votes).toMatchObject({ [String(NEWEST_ID)]: 1 });
    expect(state.clientId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    // No analytics until the server confirms; the queued note stays hidden
    // while this submit is in flight.
    expect(voteEvents(gtag)).toHaveLength(0);
    expect(plausibleVoteEvents(plausible)).toHaveLength(0);
    expect(screen.queryByTestId(`changelog-queued-${NEWEST_ID}`)).not.toBeInTheDocument();
  });

  it("posts the exact payload once and fires changelog_vote on success", async () => {
    const { gtag, plausible } = installAnalytics();
    const fetchMock = installFetch(() => Promise.resolve(okResponse()));
    const user = userEvent.setup();
    render(<ChangelogButton />);

    await openPopout(user);
    await user.click(screen.getByTestId(`changelog-up-${NEWEST_ID}`));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const payload = sentPayload(fetchMock);
    expect(payload).toMatchObject({ entryId: NEWEST_ID, vote: 1 });
    expect(String(payload.clientId)).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    await waitFor(() => expect(voteEvents(gtag)).toHaveLength(1));
    expect(gtag).toHaveBeenCalledWith("event", "changelog_vote", {
      entry_id: NEWEST_ID,
      vote: 1,
    });
    expect(plausible).toHaveBeenCalledWith("Changelog Vote", {
      props: { entry_id: NEWEST_ID, vote: 1 },
    });
  });

  it("clicking the other thumb updates the vote and posts the change", async () => {
    const fetchMock = installFetch(() => Promise.resolve(okResponse()));
    const user = userEvent.setup();
    render(<ChangelogButton />);

    await openPopout(user);
    await user.click(screen.getByTestId(`changelog-up-${NEWEST_ID}`));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    await user.click(screen.getByTestId(`changelog-down-${NEWEST_ID}`));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(sentPayload(fetchMock, 1)).toMatchObject({ entryId: NEWEST_ID, vote: -1 });
    expect(screen.getByTestId(`changelog-down-${NEWEST_ID}`)).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId(`changelog-up-${NEWEST_ID}`)).toHaveAttribute("aria-pressed", "false");
    expect(storedState().votes).toMatchObject({ [String(NEWEST_ID)]: -1 });
  });

  it("clicking the active thumb again is a no-op — no extra POST", async () => {
    const fetchMock = installFetch(() => Promise.resolve(okResponse()));
    const user = userEvent.setup();
    render(<ChangelogButton />);

    await openPopout(user);
    await user.click(screen.getByTestId(`changelog-up-${NEWEST_ID}`));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    await user.click(screen.getByTestId(`changelog-up-${NEWEST_ID}`));

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("reuses one clientId across votes so the server upserts, not duplicates", async () => {
    const fetchMock = installFetch(() => Promise.resolve(okResponse()));
    const user = userEvent.setup();
    render(<ChangelogButton />);

    await openPopout(user);
    await user.click(screen.getByTestId(`changelog-up-${NEWEST_ID}`));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    await user.click(screen.getByTestId(`changelog-up-${NEWEST_ID - 1}`));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));

    expect(sentPayload(fetchMock, 0).clientId).toBe(sentPayload(fetchMock, 1).clientId);
  });

  it("a failed POST keeps the pressed thumb, queues honestly, and fires no analytics", async () => {
    const { gtag, plausible } = installAnalytics();
    installFetch(() => Promise.resolve({ ok: false, status: 503 } as Response));
    const user = userEvent.setup();
    render(<ChangelogButton />);

    await openPopout(user);
    await user.click(screen.getByTestId(`changelog-up-${NEWEST_ID}`));

    await waitFor(() =>
      expect(screen.getByTestId(`changelog-queued-${NEWEST_ID}`)).toHaveTextContent(
        "Vote queued — it will retry on your next interaction.",
      ),
    );
    expect(screen.getByTestId(`changelog-up-${NEWEST_ID}`)).toHaveAttribute("aria-pressed", "true");
    expect(storedState().votes).toMatchObject({ [String(NEWEST_ID)]: 1 });
    expect(voteEvents(gtag)).toHaveLength(0);
    expect(plausibleVoteEvents(plausible)).toHaveLength(0);
  });

  it("a network failure queues the same way", async () => {
    installFetch(() => Promise.reject(new TypeError("network down")));
    const user = userEvent.setup();
    render(<ChangelogButton />);

    await openPopout(user);
    await user.click(screen.getByTestId(`changelog-up-${NEWEST_ID}`));

    await waitFor(() => expect(screen.getByTestId(`changelog-queued-${NEWEST_ID}`)).toBeInTheDocument());
    expect(screen.getByTestId(`changelog-up-${NEWEST_ID}`)).toHaveAttribute("aria-pressed", "true");
  });

  it("a failed vote survives a reload — the queue re-seeds from storage and re-submits without user action", async () => {
    const { gtag } = installAnalytics();
    let attempts = 0;
    let releaseRetry: ((response: Response) => void) | undefined;
    const fetchMock = vi.fn(() => {
      attempts += 1;
      if (attempts === 1) {
        // First POST (entry 5) fails; the post-reload retry hangs until released.
        return Promise.resolve({ ok: false, status: 503 } as Response);
      }
      return new Promise<Response>((resolve) => {
        releaseRetry = resolve;
      });
    });
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    const { unmount } = render(<ChangelogButton />);

    await openPopout(user);
    await user.click(screen.getByTestId(`changelog-up-${NEWEST_ID}`));
    await waitFor(() => expect(screen.getByTestId(`changelog-queued-${NEWEST_ID}`)).toBeInTheDocument());
    // The pending mark is persisted next to the vote it belongs to.
    expect(storedState().pendingIds).toEqual([NEWEST_ID]);

    // Reload: full unmount/remount over the same localStorage — the memory
    // queue is gone, so everything that comes back must come from storage.
    unmount();
    render(<ChangelogButton />);

    // The mount effect re-submits the standing vote without user action…
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(sentPayload(fetchMock, 1)).toMatchObject({ entryId: NEWEST_ID, vote: 1 });
    // …exactly once, even while it is still unresolved.
    await openPopout(user);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    // With the retry unsettled, the queued note re-renders from the
    // persisted mark — not from any in-memory queue.
    expect(screen.getByTestId(`changelog-queued-${NEWEST_ID}`)).toBeInTheDocument();
    expect(screen.getByTestId(`changelog-up-${NEWEST_ID}`)).toHaveAttribute("aria-pressed", "true");

    // Success retires the pending mark and the note.
    releaseRetry?.(okResponse());
    await waitFor(() =>
      expect(screen.queryByTestId(`changelog-queued-${NEWEST_ID}`)).not.toBeInTheDocument(),
    );
    expect(storedState().pendingIds).toEqual([]);
    expect(voteEvents(gtag)).toHaveLength(1);
  });

  it("retries the queued vote on the next interaction without blocking the page", async () => {
    const { gtag } = installAnalytics();
    let attempts = 0;
    const fetchMock = vi.fn(() => {
      attempts += 1;
      // First POST (entry 5) fails; everything after succeeds.
      return Promise.resolve(attempts === 1 ? ({ ok: false, status: 503 } as Response) : okResponse());
    });
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<ChangelogButton />);

    await openPopout(user);
    await user.click(screen.getByTestId(`changelog-up-${NEWEST_ID}`));
    await waitFor(() => expect(screen.getByTestId(`changelog-queued-${NEWEST_ID}`)).toBeInTheDocument());

    // Next interaction: a vote on a different entry flushes the queue too.
    await user.click(screen.getByTestId(`changelog-up-${NEWEST_ID - 1}`));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3)); // fail, entry 4, retry of entry 5
    expect(sentPayload(fetchMock, 1)).toMatchObject({ entryId: NEWEST_ID - 1, vote: 1 });
    expect(sentPayload(fetchMock, 2)).toMatchObject({ entryId: NEWEST_ID, vote: 1 });
    await waitFor(() =>
      expect(screen.queryByTestId(`changelog-queued-${NEWEST_ID}`)).not.toBeInTheDocument(),
    );
    // Analytics fired for both confirmed votes, never for the failure.
    await waitFor(() => expect(voteEvents(gtag)).toHaveLength(2));
    expect(gtag).toHaveBeenCalledWith("event", "changelog_vote", {
      entry_id: NEWEST_ID - 1,
      vote: 1,
    });
    expect(gtag).toHaveBeenCalledWith("event", "changelog_vote", {
      entry_id: NEWEST_ID,
      vote: 1,
    });
  });

  it("retries the queued vote when the popout is reopened", async () => {
    let attempts = 0;
    const fetchMock = vi.fn(() => {
      attempts += 1;
      return Promise.resolve(attempts === 1 ? ({ ok: false, status: 503 } as Response) : okResponse());
    });
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<ChangelogButton />);

    await openPopout(user);
    await user.click(screen.getByTestId(`changelog-up-${NEWEST_ID}`));
    await waitFor(() => expect(screen.getByTestId(`changelog-queued-${NEWEST_ID}`)).toBeInTheDocument());
    await user.keyboard("{Escape}");
    await openPopout(user);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(sentPayload(fetchMock, 1)).toMatchObject({ entryId: NEWEST_ID, vote: 1 });
    await waitFor(() =>
      expect(screen.queryByTestId(`changelog-queued-${NEWEST_ID}`)).not.toBeInTheDocument(),
    );
  });

  it("a stale success from a superseded submit never clears the queue or fires twice", async () => {
    const { gtag } = installAnalytics();
    const flights: Array<(response: Response) => void> = [];
    installFetch(
      () =>
        new Promise<Response>((resolve) => {
          flights.push(resolve);
        }),
    );
    const user = userEvent.setup();
    render(<ChangelogButton />);

    await openPopout(user);
    await user.click(screen.getByTestId(`changelog-up-${NEWEST_ID}`));
    await waitFor(() => expect(flights).toHaveLength(1));

    // The user changes their mind while the first POST is in flight.
    await user.click(screen.getByTestId(`changelog-down-${NEWEST_ID}`));
    await waitFor(() => expect(flights).toHaveLength(2));
    expect(storedState().votes).toMatchObject({ [String(NEWEST_ID)]: -1 });

    // The first flight (the upvote) settles late — its success is ignored.
    flights[0](okResponse());
    await waitFor(() => expect(flights[1]).toBeDefined());
    expect(voteEvents(gtag)).toHaveLength(0);

    // The newest flight settles: one analytics fire for the standing vote.
    flights[1](okResponse());
    await waitFor(() => expect(voteEvents(gtag)).toHaveLength(1));
    expect(gtag).toHaveBeenCalledWith("event", "changelog_vote", {
      entry_id: NEWEST_ID,
      vote: -1,
    });
    expect(screen.queryByTestId(`changelog-queued-${NEWEST_ID}`)).not.toBeInTheDocument();
  });
});
