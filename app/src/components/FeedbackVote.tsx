/**
 * Header feedback vote widget (spec: CSVJSON feedback votes, art_2AdAvo34).
 * Renders into the existing TopBar slot: two ghost thumbs — an upvote posts
 * immediately, a downvote opens the reason popover and records nothing until
 * a chip is chosen and submitted (Esc / outside click dismiss untouched).
 *
 * One vote per browser: a random clientId lives in localStorage
 * (csvjson:feedback.v1) next to the recorded vote, and the endpoint upserts
 * on that clientId — changing your vote updates the same row, never a
 * duplicate. An intent is stored as queued (pending) until the server
 * confirms it, so even a refresh mid-flight retries on the next mount.
 * While queued — right after a failed submit and after a reload — a visible
 * inline note says the vote is kept on this device and will send
 * automatically once the service is back; a retry success shows the normal
 * thanks confirmation. Analytics fire only on successful submits.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { trackFeedback } from "@/analytics/events";

const STORAGE_KEY = "csvjson:feedback.v1";

/** The six sanctioned downvote reasons — exactly what POST /api/feedback accepts. */
const DOWNVOTE_REASONS = [
  { value: "wrong_output", label: "The conversion is wrong" },
  { value: "hard_to_use", label: "Hard to use" },
  { value: "missing_feature", label: "Missing a feature" },
  { value: "slower", label: "Slower than the old site" },
  { value: "looks_worse", label: "Looks worse" },
  { value: "other", label: "Other" },
] as const;

type ReasonCode = (typeof DOWNVOTE_REASONS)[number]["value"];
type Vote = 1 | -1;

interface StoredFeedback {
  clientId: string;
  vote: Vote;
  reasonCode: ReasonCode | null;
  reasonText: string | null;
  /** True while the last submit failed — retried on the next mount. */
  pending: boolean;
}

function isStoredFeedback(value: unknown): value is StoredFeedback {
  if (typeof value !== "object" || value === null) return false;
  const record = value as {
    clientId?: unknown;
    vote?: unknown;
    reasonCode?: unknown;
    reasonText?: unknown;
    pending?: unknown;
  };
  return (
    typeof record.clientId === "string" &&
    record.clientId.length <= 64 &&
    (record.vote === 1 || record.vote === -1) &&
    (typeof record.reasonCode === "string" || record.reasonCode === null) &&
    (typeof record.reasonText === "string" || record.reasonText === null) &&
    typeof record.pending === "boolean"
  );
}

/** Corrupted or blocked storage behaves as no history — never throws. */
function readStored(): StoredFeedback | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === null) return null;
    const value: unknown = JSON.parse(raw);
    return isStoredFeedback(value) ? value : null;
  } catch {
    return null;
  }
}

function writeStored(record: StoredFeedback): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  } catch {
    // Storage may be unavailable (private mode) — the vote still posts.
  }
}

/** A random UUID for this browser's single vote row. */
function newClientId(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  const bytes = globalThis.crypto?.getRandomValues?.(new Uint8Array(16));
  if (bytes === undefined) throw new Error("no secure randomness available");
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** The wire payload for one vote — upvotes carry no reason (the server clears it). */
function feedbackPayload(record: StoredFeedback): Record<string, unknown> {
  const path = window.location.pathname;
  if (record.vote === 1) {
    return { clientId: record.clientId, vote: 1, path };
  }
  return {
    clientId: record.clientId,
    vote: -1,
    reasonCode: record.reasonCode,
    reasonText: record.reasonText,
    path,
  };
}

/**
 * POST one vote. Success = any HTTP answer that is not an error status;
 * network failures and 4xx/5xx both reject into the retry queue.
 */
async function submitVote(record: StoredFeedback): Promise<"ok" | "failed"> {
  try {
    // One line on purpose: CI's read-only-SPA gate carves the sanctioned
    // feedback endpoint out by line, so the fetch must keep its URL and
    // method on the same line. Everything else stays banned.
    const res = await fetch("/api/feedback", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(feedbackPayload(record)) });
    return res.ok ? "ok" : "failed";
  } catch {
    return "failed";
  }
}

function voteButtonClass(active: boolean): string {
  return [
    "flex h-7 w-7 cursor-pointer items-center justify-center rounded-md transition-colors",
    active
      ? "bg-muted text-foreground"
      : "text-muted-foreground hover:bg-muted hover:text-foreground",
  ].join(" ");
}

export function FeedbackVote() {
  const [stored, setStored] = useState<StoredFeedback | null>(readStored);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [selectedReason, setSelectedReason] = useState<ReasonCode | null>(null);
  const [reasonText, setReasonText] = useState("");
  const [thanksVisible, setThanksVisible] = useState(false);
  // True only while a submit started from a user click is in flight. It
  // suppresses the queued note for that window so a healthy submit never
  // flashes the failure copy; the mount-retry path keeps the note visible
  // the whole time (no flicker between paint and settle).
  const [optimisticFlight, setOptimisticFlight] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  // Monotonic token per submit: a flight that settles after a newer submit
  // started must not overwrite the newer queued intent (or fire duplicate
  // analytics) — the user's last intent wins, matching the endpoint's
  // last-write-wins upsert.
  const flightRef = useRef(0);

  /** Apply a submit outcome: persist, settle the pending flag, surface UX. */
  const settleVote = useCallback((record: StoredFeedback, outcome: "ok" | "failed") => {
    const settled: StoredFeedback = { ...record, pending: outcome === "failed" };
    writeStored(settled);
    setStored(settled);
    if (outcome === "ok") {
      trackFeedback({ vote: record.vote, with_reason: record.reasonCode !== null });
    } else {
      // A failure must never sit next to the thanks note — kill it.
      setThanksVisible(false);
    }
  }, []);

  /** POST one record and settle the outcome; success shows the thanks note. */
  const submitAndSettle = useCallback(
    (record: StoredFeedback, fromClick: boolean) => {
      const flight = ++flightRef.current;
      if (fromClick) setOptimisticFlight(true);
      void submitVote(record)
        .then((outcome) => {
          if (flightRef.current !== flight) return; // superseded by a newer submit
          settleVote(record, outcome);
          if (outcome === "ok") setThanksVisible(true);
        })
        .finally(() => {
          if (fromClick && flightRef.current === flight) setOptimisticFlight(false);
        });
    },
    [settleVote],
  );

  /** Optimistically persist the intent as queued, render it, then POST it. */
  const recordVote = (intent: Omit<StoredFeedback, "pending">) => {
    const queued: StoredFeedback = { ...intent, pending: true };
    writeStored(queued);
    setStored(queued);
    submitAndSettle(queued, true);
  };

  // Retry a queued vote from a previous failed submit — once per mount,
  // after paint, before any user interaction. The ref keeps React 18 Strict
  // mode's dev double-invocation from posting twice.
  const retriedRef = useRef(false);
  useEffect(() => {
    if (retriedRef.current) return;
    retriedRef.current = true;
    const queued = readStored();
    if (queued?.pending) submitAndSettle(queued, false);
    // The retriedRef guard above makes re-runs from this dep a no-op.
  }, [submitAndSettle]);

  useEffect(() => {
    if (!thanksVisible) return;
    const timer = setTimeout(() => setThanksVisible(false), 3000);
    return () => clearTimeout(timer);
  }, [thanksVisible]);

  // While the popover is open: Escape dismisses (recording nothing) and a
  // pointer outside the whole widget closes it the same way.
  useEffect(() => {
    if (!popoverOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPopoverOpen(false);
    };
    const onPointerDown = (event: MouseEvent) => {
      const container = containerRef.current;
      if (container === null || !(event.target instanceof Node)) return;
      if (!container.contains(event.target)) setPopoverOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, [popoverOpen]);

  const handleUpvote = () => {
    // Already recorded and synced: repeat clicks are idempotent (one row
    // per clientId server-side), so just re-show the thanks.
    if (stored?.vote === 1 && !stored.pending) {
      setThanksVisible(true);
      return;
    }
    recordVote({
      clientId: stored?.clientId ?? newClientId(),
      vote: 1,
      reasonCode: null,
      reasonText: null,
    });
  };

  const togglePopover = () => {
    if (popoverOpen) {
      setPopoverOpen(false);
      return;
    }
    // Fresh form each open — nothing is recorded until Submit.
    setSelectedReason(null);
    setReasonText("");
    setPopoverOpen(true);
  };

  const handleDownvoteSubmit = () => {
    if (selectedReason === null) return;
    const text = reasonText.trim();
    // No optimistic thanks: the submit outcome picks the follow-up — thanks
    // on success, the queued note on failure. Never both.
    recordVote({
      clientId: stored?.clientId ?? newClientId(),
      vote: -1,
      reasonCode: selectedReason,
      reasonText: text === "" ? null : text,
    });
    setPopoverOpen(false);
  };

  return (
    <div data-testid="feedback-vote" ref={containerRef} className="relative flex items-center gap-1">
      <button
        type="button"
        data-testid="feedback-up"
        onClick={handleUpvote}
        aria-pressed={stored?.vote === 1}
        aria-label="Helpful — send an upvote"
        title="Helpful"
        className={voteButtonClass(stored?.vote === 1)}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M7 10v12" />
          <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z" />
        </svg>
      </button>
      <button
        type="button"
        data-testid="feedback-down"
        onClick={togglePopover}
        aria-pressed={stored?.vote === -1}
        aria-haspopup="dialog"
        aria-expanded={popoverOpen}
        aria-label="Not helpful — send a downvote"
        title="Not helpful"
        className={voteButtonClass(stored?.vote === -1)}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M17 14V2" />
          <path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88Z" />
        </svg>
      </button>

      {thanksVisible && (
        <span data-testid="feedback-thanks" className="text-xs text-muted-foreground">
          Thanks for the feedback!
        </span>
      )}
      {stored?.pending && !optimisticFlight && (
        <span
          data-testid="feedback-pending"
          role="status"
          className="max-w-44 text-right text-xs text-muted-foreground sm:max-w-none"
        >
          Feedback couldn&apos;t send — your vote is kept on this device and will send automatically once the service is back.
        </span>
      )}

      {popoverOpen && (
        <div
          data-testid="feedback-popover"
          role="dialog"
          aria-label="What went wrong?"
          className="absolute right-0 top-9 z-50 w-72 rounded-md border border-border bg-panel p-3 shadow-md"
        >
          <p className="mb-2 text-xs font-medium text-foreground">What went wrong?</p>
          <div className="mb-2 flex flex-wrap gap-1.5">
            {DOWNVOTE_REASONS.map((reason) => (
              <button
                key={reason.value}
                type="button"
                data-testid={`feedback-reason-${reason.value}`}
                aria-pressed={selectedReason === reason.value}
                onClick={() => setSelectedReason(reason.value)}
                className={[
                  "cursor-pointer rounded-sm border px-2 py-0.5 text-xs transition-colors",
                  selectedReason === reason.value
                    ? "border-foreground bg-foreground text-panel"
                    : "border-border text-muted-foreground hover:border-foreground hover:text-foreground",
                ].join(" ")}
              >
                {reason.label}
              </button>
            ))}
          </div>
          <textarea
            data-testid="feedback-text"
            value={reasonText}
            maxLength={500}
            rows={2}
            onChange={(event) => setReasonText(event.target.value)}
            placeholder="Anything more? (optional)"
            className="mb-2 w-full resize-none rounded-sm border border-border bg-panel px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground/60 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
          />
          <div className="flex items-center justify-end gap-2">
            <span className="text-[10px] text-muted-foreground/70">{reasonText.length}/500</span>
            <button
              type="button"
              data-testid="feedback-submit"
              onClick={handleDownvoteSubmit}
              disabled={selectedReason === null}
              className="cursor-pointer rounded-sm border border-border px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
