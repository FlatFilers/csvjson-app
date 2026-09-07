/**
 * Header changelog widget (spec: CSVJSON changelog widget, art_YzASNds2).
 * Renders into the existing TopBar slot next to FeedbackVote: a borderless
 * history icon button that opens an anchored popout of recent changes, one
 * or two sentences each, each votable.
 *
 * Seen-state lives in localStorage (csvjson:changelog.v1): the dot shows
 * while any entry id is newer than lastSeenId, never on a first visit, and
 * clears when the popout opens. Voting follows the feedback widget's model —
 * one changeable vote per browser per entry, optimistic render before the
 * POST resolves, and a failed POST keeps the pressed thumb while queueing
 * the vote behind an honest note; it retries on the next interaction with
 * the widget and the page never blocks. Analytics fire on open and on
 * confirmed (success-only) votes.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { History, ThumbsDown, ThumbsUp, X } from "lucide-react";
import { trackChangelogOpen, trackChangelogVote } from "@/analytics/analytics";
import { changelogEntries, type ChangelogEntry } from "./entries";
import { relativeDate } from "./relativeDate";

const STORAGE_KEY = "csvjson:changelog.v1";

/**
 * Seen/vote state. clientId is this browser's vote identity for the
 * server's UNIQUE (client_id, entry_id) upsert — generated on first vote
 * and persisted next to the state it belongs to.
 */
interface ChangelogState {
  lastSeenId: number | null;
  votes: Record<number, 1 | -1>;
  clientId?: string;
}

type Vote = 1 | -1;

/** Newest id in the bundled set (entries are newest first; max() guards order). */
const NEWEST_ENTRY_ID = Math.max(...changelogEntries.map((entry) => entry.id), 0);

function isChangelogState(value: unknown): value is ChangelogState {
  if (typeof value !== "object" || value === null) return false;
  const record = value as { lastSeenId?: unknown; votes?: unknown; clientId?: unknown };
  if (record.lastSeenId !== null && typeof record.lastSeenId !== "number") return false;
  if (typeof record.votes !== "object" || record.votes === null) return false;
  for (const [key, vote] of Object.entries(record.votes)) {
    if (!/^\d+$/.test(key) || (vote !== 1 && vote !== -1)) return false;
  }
  if (record.clientId !== undefined && !isClientIdShape(record.clientId)) return false;
  return true;
}

function isClientIdShape(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-fA-F-]{8,64}$/.test(value);
}

/** Corrupted or blocked storage behaves as a first visit — never throws. */
function readStored(): ChangelogState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === null) return { lastSeenId: null, votes: {} };
    const value: unknown = JSON.parse(raw);
    return isChangelogState(value) ? value : { lastSeenId: null, votes: {} };
  } catch {
    // Prerender (no window), private mode, corrupted JSON — the dot is lost
    // and votes are non-persistent, never a broken page.
    return { lastSeenId: null, votes: {} };
  }
}

function writeStored(state: ChangelogState): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage may be unavailable (private mode) — the state stays for this
    // session only.
  }
}

/** A random UUID for this browser's changelog votes (feedback-widget pattern). */
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

/**
 * POST one entry vote. Success = any HTTP answer that is not an error status;
 * network failures and 4xx/5xx both reject into the retry queue.
 */
async function postEntryVote(
  clientId: string,
  entryId: number,
  vote: Vote,
): Promise<"ok" | "failed"> {
  try {
    // One line on purpose: CI's read-only-SPA gate carves the sanctioned
    // write endpoints out by line, so the fetch must keep its URL and
    // method on the same line.
    const res = await fetch("/api/changelog-vote", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ clientId, entryId, vote }) });
    return res.ok ? "ok" : "failed";
  } catch {
    return "failed";
  }
}

function thumbButtonClass(active: boolean): string {
  return [
    "flex h-6 w-7 cursor-pointer items-center justify-center rounded-md transition-colors",
    active
      ? "bg-muted text-foreground"
      : "text-muted-foreground hover:bg-muted hover:text-foreground",
  ].join(" ");
}

function EntryRow({
  entry,
  vote,
  queued,
  inFlight,
  onVote,
}: {
  entry: ChangelogEntry;
  vote: Vote | undefined;
  queued: boolean;
  inFlight: boolean;
  onVote: (entryId: number, vote: Vote) => void;
}) {
  return (
    <article className="px-3 py-2.5" data-testid={`changelog-entry-${entry.id}`}>
      <div className="mb-1 flex items-center gap-1.5">
        {entry.tag !== undefined && (
          <span className="rounded-full border border-border px-1.5 py-px text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            {entry.tag}
          </span>
        )}
        <span className="text-[11px] text-muted-foreground">{relativeDate(entry.date)}</span>
      </div>
      <h3 className="text-xs font-semibold text-foreground">{entry.title}</h3>
      <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{entry.summary}</p>
      <div className="mt-1.5 flex gap-1">
        <button
          type="button"
          data-testid={`changelog-up-${entry.id}`}
          onClick={() => onVote(entry.id, 1)}
          aria-pressed={vote === 1}
          aria-label={`Upvote: ${entry.title}`}
          title="Good change"
          className={thumbButtonClass(vote === 1)}
        >
          <ThumbsUp size={13} strokeWidth={2} aria-hidden="true" />
        </button>
        <button
          type="button"
          data-testid={`changelog-down-${entry.id}`}
          onClick={() => onVote(entry.id, -1)}
          aria-pressed={vote === -1}
          aria-label={`Downvote: ${entry.title}`}
          title="Not for me"
          className={thumbButtonClass(vote === -1)}
        >
          <ThumbsDown size={13} strokeWidth={2} aria-hidden="true" />
        </button>
      </div>
      {queued && !inFlight && (
        <p
          data-testid={`changelog-queued-${entry.id}`}
          role="status"
          className="mt-1.5 rounded-sm border border-dashed border-border px-2 py-1 text-[11px] text-muted-foreground"
        >
          Vote queued — it will retry on your next interaction.
        </p>
      )}
    </article>
  );
}

export function ChangelogButton() {
  const [stored, setStored] = useState<ChangelogState>(readStored);
  const [open, setOpen] = useState(false);
  // Entries whose last POST failed — retried on the next interaction with
  // the widget. In-memory on purpose: the stored shape (lastSeenId + votes)
  // is the contract, and re-POSTing every stored vote on mount would burn
  // the shared 10-writes-per-24h rate budget for votes the server already
  // has. A reload while queued keeps the pressed thumb (the vote is in
  // storage) and re-queues on the next interaction.
  const [queued, setQueued] = useState<ReadonlySet<number>>(() => new Set<number>());
  // Entries with a click-initiated POST in flight — suppresses the queued
  // note for that window so a healthy submit never flashes failure copy.
  const [inFlight, setInFlight] = useState<ReadonlySet<number>>(() => new Set<number>());
  const containerRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  // Monotonic token per entry: a response that settles after a newer submit
  // for the same entry must not clobber the newer intent.
  const flightRef = useRef(new Map<number, number>());

  const hasUnseen = stored.lastSeenId !== null && NEWEST_ENTRY_ID > stored.lastSeenId;

  const setInFlightFor = useCallback((entryId: number, add: boolean) => {
    setInFlight((prev) => {
      const next = new Set(prev);
      if (add) {
        next.add(entryId);
      } else {
        next.delete(entryId);
      }
      return next;
    });
  }, []);

  /** POST one entry's vote and settle the outcome. */
  const submitVote = useCallback(
    (entryId: number, vote: Vote, clientId: string, fromClick: boolean) => {
      const flight = (flightRef.current.get(entryId) ?? 0) + 1;
      flightRef.current.set(entryId, flight);
      // This POST is now the entry's newest intent — drop any queued mark.
      setQueued((prev) => {
        if (!prev.has(entryId)) return prev;
        const next = new Set(prev);
        next.delete(entryId);
        return next;
      });
      if (fromClick) setInFlightFor(entryId, true);
      void postEntryVote(clientId, entryId, vote).then((outcome) => {
        if (flightRef.current.get(entryId) !== flight) return; // superseded
        if (outcome === "ok") {
          trackChangelogVote({ entry_id: entryId, vote });
        } else {
          setQueued((prev) => new Set(prev).add(entryId));
        }
        if (fromClick) setInFlightFor(entryId, false);
      });
    },
    [setInFlightFor],
  );

  /**
   * Retry every queued vote against its current standing vote. skipEntryId
   * excludes an entry whose fresh POST just superseded its queued intent —
   * the closure's queued set predates that submit.
   */
  const retryQueued = useCallback(
    (skipEntryId?: number) => {
      if (queued.size === 0) return;
      // handleVote settles the vote identity before any POST, so retries
      // reuse it; without one there is nothing honest to send.
      if (stored.clientId === undefined) return;
      for (const entryId of queued) {
        if (entryId === skipEntryId) continue;
        const vote = stored.votes[entryId];
        if (vote !== undefined) submitVote(entryId, vote, stored.clientId, false);
      }
    },
    [queued, stored, submitVote],
  );

  const handleVote = (entryId: number, vote: Vote) => {
    if (stored.votes[entryId] === vote) {
      // The active thumb is a no-op vote-wise — but the click is still an
      // interaction, so queued retries flush (including this entry's own).
      retryQueued();
      return;
    }
    // Optimistic: settle the vote identity (first vote mints it), render the
    // pressed thumb, persist, then POST.
    const clientId = stored.clientId ?? newClientId();
    const next: ChangelogState = {
      ...stored,
      votes: { ...stored.votes, [entryId]: vote },
      clientId,
    };
    writeStored(next);
    setStored(next);
    submitVote(entryId, vote, clientId, true);
    // Other queued votes ride along; this entry's fresh POST supersedes any
    // queued intent of its own.
    retryQueued(entryId);
  };

  const openPopout = () => {
    setOpen(true);
    trackChangelogOpen();
    // Opening is the read receipt: the dot clears even if nothing changed.
    if (stored.lastSeenId !== NEWEST_ENTRY_ID) {
      const next: ChangelogState = { ...stored, lastSeenId: NEWEST_ENTRY_ID };
      writeStored(next);
      setStored(next);
    }
    retryQueued();
  };

  // Every close path funnels here; the focus return happens in the effect
  // below, after the closing event's own focus changes have settled.
  const closePopout = useCallback(() => {
    setOpen(false);
  }, []);

  // Focus returns to the trigger when the popout closes (spec: focus
  // management). As a transition effect it runs after the closing event's
  // handlers — an outside mousedown blurs the active element in real
  // browsers, so refocusing in the event handler would be undone.
  const wasOpenRef = useRef(false);
  useEffect(() => {
    if (wasOpenRef.current && !open) {
      triggerRef.current?.focus();
    }
    wasOpenRef.current = open;
  }, [open]);

  // Once per mount: a queued vote from earlier in this session (component
  // remount, StrictMode) retries after paint without user action.
  const retriedRef = useRef(false);
  useEffect(() => {
    if (retriedRef.current) return;
    retriedRef.current = true;
    retryQueued();
    // The retriedRef guard above makes re-runs from this dep a no-op.
  }, [retryQueued]);

  // While the popout is open: Escape dismisses it and a click outside the
  // whole widget closes it. The listener is on click (not mousedown) so the
  // browser's blur-on-mousedown for outside targets settles first and the
  // close-transition effect can return focus to the trigger for good.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closePopout();
    };
    const onClickOutside = (event: MouseEvent) => {
      const container = containerRef.current;
      if (container === null || !(event.target instanceof Node)) return;
      if (!container.contains(event.target)) closePopout();
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("click", onClickOutside);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("click", onClickOutside);
    };
  }, [open, closePopout]);

  return (
    <div
      data-testid="changelog"
      ref={containerRef}
      // Static on small screens so the popout's containing block becomes the
      // (positioned) top bar: the panel then spans the viewport with a small
      // inset instead of overflowing off its left edge.
      className="relative max-sm:static"
    >
      <button
        type="button"
        data-testid="changelog-toggle"
        ref={triggerRef}
        onClick={() => (open ? closePopout() : openPopout())}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label="Changelog"
        title="What's new"
        className="relative inline-flex size-8 cursor-pointer items-center justify-center rounded-lg border border-border bg-panel text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <History size={15} strokeWidth={2} aria-hidden="true" />
        {hasUnseen && (
          <span
            data-testid="changelog-dot"
            aria-hidden="true"
            className="absolute right-1 top-1 size-1.5 rounded-full bg-foreground"
          />
        )}
      </button>

      {open && (
        <div
          data-testid="changelog-popout"
          role="dialog"
          aria-label="Changelog"
          className="absolute right-0 top-9 z-50 w-80 rounded-md border border-border bg-panel shadow-md max-sm:inset-x-2 max-sm:top-14 max-sm:w-auto"
        >
          <div className="flex items-center justify-between border-b border-border py-1.5 pl-3 pr-1.5">
            <span className="text-xs font-semibold tracking-tight text-foreground">
              What&apos;s new
            </span>
            <button
              type="button"
              data-testid="changelog-close"
              onClick={closePopout}
              aria-label="Close changelog"
              className="flex size-6 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X size={14} strokeWidth={2} aria-hidden="true" />
            </button>
          </div>
          <div className="max-h-96 divide-y divide-border overflow-y-auto">
            {changelogEntries.map((entry) => (
              <EntryRow
                key={entry.id}
                entry={entry}
                vote={stored.votes[entry.id]}
                queued={queued.has(entry.id)}
                inFlight={inFlight.has(entry.id)}
                onVote={handleVote}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
