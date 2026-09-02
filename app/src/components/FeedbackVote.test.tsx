import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FeedbackVote } from "./FeedbackVote";

/**
 * Behaviour tests for the header vote widget (spec: CSVJSON feedback votes,
 * art_2AdAvo34): exact wire payloads, one-row-per-browser semantics
 * (same clientId on updates), popover discipline (nothing recorded on
 * dismiss), the failure/retry queue, and analytics fired on success only.
 */

const STORAGE_KEY = "csvjson:feedback.v1";

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
  return JSON.parse(String(init.body)) as Record<string, unknown>;
}

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete (window as { gtag?: unknown }).gtag;
  delete (window as { plausible?: unknown }).plausible;
});

describe("FeedbackVote", () => {
  it("renders both vote buttons and never posts on mount", () => {
    const fetchMock = installFetch(() => Promise.resolve(okResponse()));
    render(<FeedbackVote />);

    expect(screen.getByTestId("feedback-up")).toBeInTheDocument();
    expect(screen.getByTestId("feedback-down")).toBeInTheDocument();
    expect(screen.queryByTestId("feedback-popover")).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("renders a previously recorded vote as pre-selected from localStorage", () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ clientId: "client-1", vote: -1, reasonCode: "other", reasonText: null, pending: false }),
    );
    render(<FeedbackVote />);

    expect(screen.getByTestId("feedback-down")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("feedback-up")).toHaveAttribute("aria-pressed", "false");
  });

  it("upvote posts the exact payload and fires analytics without a reason", async () => {
    const { gtag, plausible } = installAnalytics();
    const fetchMock = installFetch(() => Promise.resolve(okResponse()));
    const user = userEvent.setup();
    render(<FeedbackVote />);

    await user.click(screen.getByTestId("feedback-up"));

    await waitFor(() => expect(gtag).toHaveBeenCalledTimes(1));
    const payload = sentPayload(fetchMock);
    expect(payload.vote).toBe(1);
    expect(payload.reasonCode).toBeUndefined();
    expect(payload.reasonText).toBeUndefined();
    expect(String(payload.clientId)).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(gtag).toHaveBeenCalledWith("event", "feedback", { vote: 1, with_reason: false });
    expect(plausible).toHaveBeenCalledWith("Feedback", { props: { vote: 1, with_reason: false } });

    // Persisted for the one-row-per-browser upsert semantics.
    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}") as {
      vote?: number;
      pending?: boolean;
    };
    expect(stored.vote).toBe(1);
    expect(stored.pending).toBe(false);
    expect(screen.getByTestId("feedback-thanks")).toBeInTheDocument();
  });

  it("downvote requires a reason chip before Submit unlocks", async () => {
    installFetch(() => Promise.resolve(okResponse()));
    const user = userEvent.setup();
    render(<FeedbackVote />);

    await user.click(screen.getByTestId("feedback-down"));
    expect(screen.getByTestId("feedback-submit")).toBeDisabled();

    await user.click(screen.getByTestId("feedback-reason-missing_feature"));
    expect(screen.getByTestId("feedback-submit")).toBeEnabled();
  });

  it("downvote posts the exact payload with the chosen reason and free text", async () => {
    const { gtag } = installAnalytics();
    const fetchMock = installFetch(() => Promise.resolve(okResponse()));
    const user = userEvent.setup();
    render(<FeedbackVote />);

    await user.click(screen.getByTestId("feedback-down"));
    await user.click(screen.getByTestId("feedback-reason-missing_feature"));
    await user.type(screen.getByTestId("feedback-text"), "Need XML output");
    await user.click(screen.getByTestId("feedback-submit"));

    await waitFor(() => expect(gtag).toHaveBeenCalledTimes(1));
    const payload = sentPayload(fetchMock);
    expect(payload.vote).toBe(-1);
    expect(payload.reasonCode).toBe("missing_feature");
    expect(payload.reasonText).toBe("Need XML output");
    expect(gtag).toHaveBeenCalledWith("event", "feedback", { vote: -1, with_reason: true });

    // Popover closed after a successful submit.
    expect(screen.queryByTestId("feedback-popover")).not.toBeInTheDocument();
  });

  it("Escape dismisses the popover and records nothing", async () => {
    const fetchMock = installFetch(() => Promise.resolve(okResponse()));
    const user = userEvent.setup();
    render(<FeedbackVote />);

    await user.click(screen.getByTestId("feedback-down"));
    await user.click(screen.getByTestId("feedback-reason-other"));
    await user.keyboard("{Escape}");

    expect(screen.queryByTestId("feedback-popover")).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("outside click dismisses the popover and records nothing", async () => {
    const fetchMock = installFetch(() => Promise.resolve(okResponse()));
    const user = userEvent.setup();
    render(<FeedbackVote />);

    await user.click(screen.getByTestId("feedback-down"));
    await user.click(screen.getByTestId("feedback-reason-other"));
    // Mousedown anywhere outside the widget's container.
    await user.click(document.body);

    expect(screen.queryByTestId("feedback-popover")).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("changing the vote updates the same row — same clientId, reason cleared", async () => {
    installFetch(() => Promise.resolve(okResponse()));
    const user = userEvent.setup();
    render(<FeedbackVote />);

    await user.click(screen.getByTestId("feedback-down"));
    await user.click(screen.getByTestId("feedback-reason-wrong_output"));
    await user.click(screen.getByTestId("feedback-submit"));

    await user.click(screen.getByTestId("feedback-up"));

    await waitFor(() => expect(screen.getByTestId("feedback-up")).toHaveAttribute("aria-pressed", "true"));
    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}") as {
      clientId?: string;
      vote?: number;
      reasonCode?: string | null;
      reasonText?: string | null;
    };
    expect(stored.vote).toBe(1);
    expect(stored.reasonCode).toBeNull();
    expect(stored.reasonText).toBeNull();
  });

  it("change-vote reuses one clientId across posts so the server upserts, not duplicates", async () => {
    const fetchMock = installFetch(() => Promise.resolve(okResponse()));
    const user = userEvent.setup();
    render(<FeedbackVote />);

    await user.click(screen.getByTestId("feedback-down"));
    await user.click(screen.getByTestId("feedback-reason-other"));
    await user.click(screen.getByTestId("feedback-submit"));
    await user.click(screen.getByTestId("feedback-up"));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const first = sentPayload(fetchMock, 0);
    const second = sentPayload(fetchMock, 1);
    expect(first.clientId).toBe(second.clientId);
    expect(second.vote).toBe(1);
    expect(second.reasonCode).toBeUndefined();
  });

  it("failed submit keeps the intent queued, shows the error note, and retries on the next mount", async () => {
    const gtag = vi.fn();
    (window as { gtag?: unknown }).gtag = gtag;
    // First mount: network failure. Second mount: success.
    let attempts = 0;
    const fetchMock = vi.fn(() => {
      attempts += 1;
      return attempts === 1
        ? Promise.reject(new TypeError("network down"))
        : Promise.resolve(okResponse());
    });
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    const { unmount } = render(<FeedbackVote />);

    await user.click(screen.getByTestId("feedback-up"));
    await waitFor(() =>
      expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}")).toMatchObject({ pending: true }),
    );
    expect(screen.getByTestId("feedback-error")).toBeInTheDocument();
    expect(gtag).not.toHaveBeenCalled();

    unmount();
    render(<FeedbackVote />);

    // The queued intent posts again on mount; analytics fire only on success.
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(gtag).toHaveBeenCalledTimes(1));
    expect(gtag).toHaveBeenCalledWith("event", "feedback", { vote: 1, with_reason: false });
    await waitFor(() =>
      expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}")).toMatchObject({ pending: false }),
    );
  });

  it("failed submit via 503 also queues and does not fire analytics", async () => {
    const gtag = vi.fn();
    (window as { gtag?: unknown }).gtag = gtag;
    installFetch(() => Promise.resolve({ ok: false, status: 503 } as Response));
    const user = userEvent.setup();
    render(<FeedbackVote />);

    await user.click(screen.getByTestId("feedback-up"));

    await waitFor(() =>
      expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}")).toMatchObject({ pending: true }),
    );
    expect(gtag).not.toHaveBeenCalled();
  });

  it("repeat upvote clicks after a synced vote are idempotent — no extra POST", async () => {
    const fetchMock = installFetch(() => Promise.resolve(okResponse()));
    const user = userEvent.setup();
    render(<FeedbackVote />);

    await user.click(screen.getByTestId("feedback-up"));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}")).toMatchObject({ pending: false }),
    );
    await user.click(screen.getByTestId("feedback-up"));

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
