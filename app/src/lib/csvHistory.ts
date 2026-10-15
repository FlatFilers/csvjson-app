/** Maximum number of undo snapshots retained for CSV mutations. */
export const MAX_CSV_HISTORY = 50;

export interface CsvHistoryState {
  readonly past: readonly string[];
  readonly present: string;
  readonly future: readonly string[];
}

export interface HistoryShortcutEvent {
  readonly key: string;
  readonly metaKey: boolean;
  readonly ctrlKey: boolean;
  readonly shiftKey: boolean;
  readonly altKey: boolean;
}

export function createCsvHistory(initialPresent = ""): CsvHistoryState {
  return {
    past: [],
    present: initialPresent,
    future: [],
  };
}

/**
 * Record a user-initiated CSV change.
 *
 * When the history is still in its initial untouched empty state
 * (`present === ""`, `past.length === 0`, `future.length === 0`), loading the
 * first CSV document seeds `present` without pushing `""` onto `past`. Once a
 * document is loaded, every subsequent mutation (cell edit, paste, fill,
 * row/column delete, header rename, replacement upload, or Clear) pushes the
 * prior `present` onto `past` (bounded at `maxEntries`) and clears `future`.
 */
export function pushCsvHistory(
  state: CsvHistoryState,
  nextPresent: string,
  maxEntries: number = MAX_CSV_HISTORY
): CsvHistoryState {
  if (nextPresent === state.present) {
    return state;
  }
  if (
    state.present === "" &&
    state.past.length === 0 &&
    state.future.length === 0
  ) {
    return {
      past: [],
      present: nextPresent,
      future: [],
    };
  }
  const appended = [...state.past, state.present];
  const boundedPast =
    appended.length > maxEntries
      ? appended.slice(appended.length - maxEntries)
      : appended;
  return {
    past: boundedPast,
    present: nextPresent,
    future: [],
  };
}

export function undoCsvHistory(state: CsvHistoryState): CsvHistoryState {
  if (state.past.length === 0) {
    return state;
  }
  const previous = state.past[state.past.length - 1];
  const nextPast = state.past.slice(0, state.past.length - 1);
  return {
    past: nextPast,
    present: previous,
    future: [state.present, ...state.future],
  };
}

export function redoCsvHistory(state: CsvHistoryState): CsvHistoryState {
  if (state.future.length === 0) {
    return state;
  }
  const [next, ...remainingFuture] = state.future;
  const appended = [...state.past, state.present];
  const boundedPast =
    appended.length > MAX_CSV_HISTORY
      ? appended.slice(appended.length - MAX_CSV_HISTORY)
      : appended;
  return {
    past: boundedPast,
    present: next,
    future: remainingFuture,
  };
}

export function matchHistoryShortcut(
  event: HistoryShortcutEvent
): "undo" | "redo" | null {
  if (event.altKey) return null;
  if (!event.metaKey && !event.ctrlKey) return null;
  const key = event.key.toLowerCase();
  if (key === "z") {
    return event.shiftKey ? "redo" : "undo";
  }
  if (key === "y" && !event.shiftKey) {
    return "redo";
  }
  return null;
}
