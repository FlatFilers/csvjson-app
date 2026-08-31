import { useEffect, useMemo, useState } from "react";
import {
  hydrateConverter,
  fetchLegacyPermalink,
  isHydratableTool,
  PermalinkNotFoundError,
  type HydratedConverterState,
  type ParsedPermalink,
} from "@/lib/permalink";

/**
 * Fetch + map one legacy permalink into converter state. The caller owns
 * what happens to the converter; this hook only owns the fetch lifecycle:
 * loading → hydrated (with the mapped state) | not-found | unsupported |
 * error, plus a retry that re-runs the same read-only GET. Permalinks for
 * tools with no converter equivalent (sql2json, json_beautifier, …) are
 * never fetched — the converter just renders normally.
 */
export type PermalinkHydration = {
  phase:
    | "idle"
    | "loading"
    | "not-found"
    | "unsupported"
    | "error"
    | "hydrated";
  /** The mapped converter state, set only in the hydrated phase. */
  hydrated: HydratedConverterState | null;
  /** Human-readable failure detail — set only in the error phase. */
  message: string;
  /** Re-runs the same read-only GET (no-op unless phase === "error"). */
  retry: () => void;
};

export function useLegacyPermalink(
  permalink: ParsedPermalink | null
): PermalinkHydration {
  // Only converter-shaped tools fetch; other tools fall through untouched.
  const id = useMemo(
    () => (permalink && isHydratableTool(permalink.tool) ? permalink.id : null),
    [permalink]
  );
  // Bumped by retry() — the effect re-runs the fetch for the same id.
  const [attempt, setAttempt] = useState(0);
  const [phase, setPhase] = useState<PermalinkHydration["phase"]>(
    id ? "loading" : "idle"
  );
  const [hydrated, setHydrated] = useState<HydratedConverterState | null>(
    null
  );
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    fetchLegacyPermalink(id)
      .then((data) => {
        if (cancelled) return;
        const state = hydrateConverter(data);
        if (state) {
          setHydrated(state);
          setPhase("hydrated");
        } else {
          // Object exists but no longer maps onto the converter (e.g. a
          // Data Janitor session) — a distinct notice from a missing one.
          setPhase("unsupported");
        }
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        if (e instanceof PermalinkNotFoundError) {
          setPhase("not-found");
        } else {
          setMessage(
            e instanceof Error ? e.message : "Couldn't load this data"
          );
          setPhase("error");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [id, attempt]);

  return {
    phase,
    hydrated,
    message,
    retry: () => {
      if (phase !== "error") return;
      setPhase("loading");
      setAttempt((current) => current + 1);
    },
  };
}
