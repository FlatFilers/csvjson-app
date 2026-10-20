import {
  DEFAULT_OPTIONS,
  type ConverterOptions,
  type Direction,
} from "./convert";

export const RECENT_HISTORY_STORAGE_KEY = "csvjson:recent.v1";
export const MAX_RECENT_SNAPSHOTS = 10;
export const MAX_SNAPSHOT_INPUT_CHARS = 100_000;
const MAX_PREVIEW_CHARS = 80;

export interface RecentSnapshot {
  id: string;
  createdAt: number;
  direction: Direction;
  input: string;
  options: ConverterOptions;
  filename: string | null;
  rows: number;
  cols: number;
  preview: string;
}

export type SaveRecentSnapshotInput = Omit<
  RecentSnapshot,
  "id" | "createdAt" | "preview"
> & {
  createdAt?: number;
};

function isDirection(value: unknown): value is Direction {
  return value === "csv2json" || value === "json2csv";
}

function sanitizeOptions(raw: unknown): ConverterOptions {
  if (typeof raw !== "object" || raw === null) {
    return { ...DEFAULT_OPTIONS };
  }
  const obj = raw as Record<string, unknown>;
  const sep = obj.separator;
  const separator: ConverterOptions["separator"] =
    sep === "auto" || sep === "," || sep === ";" || sep === "\t" || sep === "|"
      ? sep
      : DEFAULT_OPTIONS.separator;
  const emptyFields: ConverterOptions["emptyFields"] =
    obj.emptyFields === "keep" || obj.emptyFields === "skip"
      ? obj.emptyFields
      : DEFAULT_OPTIONS.emptyFields;
  const nullLiterals: ConverterOptions["nullLiterals"] =
    obj.nullLiterals === "string" || obj.nullLiterals === "null"
      ? obj.nullLiterals
      : DEFAULT_OPTIONS.nullLiterals;

  return {
    separator,
    parseNumbers:
      typeof obj.parseNumbers === "boolean"
        ? obj.parseNumbers
        : DEFAULT_OPTIONS.parseNumbers,
    parseJSON:
      typeof obj.parseJSON === "boolean"
        ? obj.parseJSON
        : DEFAULT_OPTIONS.parseJSON,
    emptyFields,
    nullLiterals,
    transpose:
      typeof obj.transpose === "boolean"
        ? obj.transpose
        : DEFAULT_OPTIONS.transpose,
    hash: typeof obj.hash === "boolean" ? obj.hash : DEFAULT_OPTIONS.hash,
    minify:
      typeof obj.minify === "boolean" ? obj.minify : DEFAULT_OPTIONS.minify,
    flatten:
      typeof obj.flatten === "boolean" ? obj.flatten : DEFAULT_OPTIONS.flatten,
    collapseIndexedArrays:
      typeof obj.collapseIndexedArrays === "boolean"
        ? obj.collapseIndexedArrays
        : DEFAULT_OPTIONS.collapseIndexedArrays,
  };
}

export function buildSnapshotPreview(input: string): string {
  const firstNonEmpty =
    input
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find((line) => line.length > 0) ?? "";
  const compact = firstNonEmpty.replace(/\s+/g, " ");
  if (compact.length <= MAX_PREVIEW_CHARS) return compact;
  return `${compact.slice(0, MAX_PREVIEW_CHARS - 1)}…`;
}

function isRecentSnapshot(value: unknown): value is RecentSnapshot {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  if (typeof record.id !== "string" || record.id.trim() === "") return false;
  if (
    typeof record.createdAt !== "number" ||
    !Number.isFinite(record.createdAt)
  ) {
    return false;
  }
  if (!isDirection(record.direction)) return false;
  if (
    typeof record.input !== "string" ||
    record.input.trim() === "" ||
    record.input.length > MAX_SNAPSHOT_INPUT_CHARS
  ) {
    return false;
  }
  if (record.filename !== null && typeof record.filename !== "string") {
    return false;
  }
  if (
    typeof record.rows !== "number" ||
    !Number.isInteger(record.rows) ||
    record.rows < 0
  ) {
    return false;
  }
  if (
    typeof record.cols !== "number" ||
    !Number.isInteger(record.cols) ||
    record.cols < 0
  ) {
    return false;
  }
  if (typeof record.preview !== "string") return false;
  return true;
}

function normalizeSnapshot(raw: RecentSnapshot): RecentSnapshot {
  return {
    id: raw.id,
    createdAt: raw.createdAt,
    direction: raw.direction,
    input: raw.input,
    options: sanitizeOptions(raw.options),
    filename: raw.filename,
    rows: raw.rows,
    cols: raw.cols,
    preview: raw.preview || buildSnapshotPreview(raw.input),
  };
}

function writeSnapshots(snapshots: RecentSnapshot[]): void {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      RECENT_HISTORY_STORAGE_KEY,
      JSON.stringify(snapshots)
    );
  } catch {
    // Storage blocked or quota exceeded — degrade gracefully without throwing.
  }
}

function newSnapshotId(now: number): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  return `snap-${now}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Load recent conversion snapshots from localStorage, newest first.
 * Corrupted or blocked storage safely returns an empty array.
 */
export function loadRecentHistory(): RecentSnapshot[] {
  try {
    if (typeof window === "undefined") return [];
    const raw = window.localStorage.getItem(RECENT_HISTORY_STORAGE_KEY);
    if (raw === null) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const valid = parsed
      .filter(isRecentSnapshot)
      .map(normalizeSnapshot)
      .sort((a, b) => b.createdAt - a.createdAt);
    return valid.slice(0, MAX_RECENT_SNAPSHOTS);
  } catch {
    return [];
  }
}

/**
 * Save or update a recent conversion snapshot in localStorage.
 * - Skips empty inputs or inputs > 100,000 characters.
 * - Deduplicates by `direction + input.trim()` (reusing existing id, updating
 *   timestamp, options, filename, rows/cols, and moving to the top).
 * - Caps stored entries at 10 (newest first).
 */
export function saveRecentSnapshot(
  entry: SaveRecentSnapshotInput
): RecentSnapshot[] {
  const existing = loadRecentHistory();
  const trimmedInput = entry.input.trim();
  if (
    trimmedInput === "" ||
    entry.input.length > MAX_SNAPSHOT_INPUT_CHARS ||
    (entry.rows <= 0 && entry.cols <= 0)
  ) {
    return existing;
  }

  const now = entry.createdAt ?? Date.now();
  const match = existing.find(
    (item) =>
      item.direction === entry.direction && item.input.trim() === trimmedInput
  );

  const nextItem: RecentSnapshot = {
    id: match?.id ?? newSnapshotId(now),
    createdAt: now,
    direction: entry.direction,
    input: entry.input,
    options: sanitizeOptions(entry.options),
    filename: entry.filename,
    rows: entry.rows,
    cols: entry.cols,
    preview: buildSnapshotPreview(entry.input),
  };

  const remaining = existing.filter(
    (item) =>
      !(
        item.direction === entry.direction && item.input.trim() === trimmedInput
      )
  );
  const updated = [nextItem, ...remaining].slice(0, MAX_RECENT_SNAPSHOTS);
  writeSnapshots(updated);
  return updated;
}

/**
 * Remove a single snapshot by id and persist the remaining list.
 */
export function removeRecentSnapshot(id: string): RecentSnapshot[] {
  const existing = loadRecentHistory();
  const updated = existing.filter((item) => item.id !== id);
  writeSnapshots(updated);
  return updated;
}

/**
 * Clear all saved conversion history from localStorage.
 */
export function clearRecentHistory(): void {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(RECENT_HISTORY_STORAGE_KEY);
  } catch {
    // Ignore storage removal errors in restricted environments.
  }
}

/**
 * Human-readable relative timestamp for a snapshot ("just now", "2m ago",
 * "3h ago", "yesterday", "4d ago", or short calendar date).
 */
export function formatRelativeTimestamp(
  createdAt: number,
  now: number = Date.now()
): string {
  const diffMs = Math.max(0, now - createdAt);
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 45) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}
