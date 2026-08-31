import type { ConverterOptions, Direction } from "@/lib/convert";

/**
 * Legacy permalink hydration (spec: Old share links keep resolving —
 * read-only). Legacy save links are `/<tool>/<32-hex-id>` URLs whose data
 * lives as public-read JSON objects under `data/` in the S3 bucket the
 * site has always used. The browser fetches the object directly (the PHP
 * shim never proxies it), detects the legacy `{elementId: value}` shape
 * written by `APP.save()` (js/src/main.js), and maps it onto the new
 * converter's inputs. Read-only: nothing is ever written back, and the
 * URL is never rewritten.
 */

/** Tools that issued legacy permalinks — mirrors the PHP shim's list. */
const PERMALINK_TOOLS: readonly string[] = [
  "csv2json",
  "json2csv",
  "json_validator",
  "json_beautifier",
  "sql2json",
  "csvjson2json",
  "datajanitor",
];

const PERMALINK_ID_PATTERN = /^[0-9a-f]{32}$/i;

const PATH_PATTERN = /^\/([a-z0-9_]+)\/([0-9a-f]{32})\/?$/i;

/**
 * Build-time constant for the bucket's `data/` prefix. Defaults to the
 * production bucket the CSP already whitelists (csvjson.s3.us-east-2);
 * override with VITE_S3_DATA_URL if the bucket location ever moves.
 */
export const S3_DATA_URL: string =
  import.meta.env.VITE_S3_DATA_URL ??
  "https://csvjson.s3.us-east-2.amazonaws.com/data/";

/** The permalink id this URL hydrates, or null for every other path. */
export function parsePermalinkPath(pathname: string): string | null {
  const match = PATH_PATTERN.exec(pathname);
  if (!match) return null;
  if (!PERMALINK_TOOLS.includes(match[1].toLowerCase())) return null;
  // S3 keys are lowercase hex (md5 ids); normalize so case never 403s.
  return match[2].toLowerCase();
}

/**
 * Unknown or deleted id: 403 (S3's private-bucket answer) and 404 both
 * mean the object is not retrievable, so both land in the not-found state.
 */
export class PermalinkNotFoundError extends Error {
  constructor() {
    super("This data doesn't exist (or was deleted)");
    this.name = "PermalinkNotFoundError";
  }
}

/** Corrupt object, unexpected status, or the network itself failed. */
export class PermalinkFetchError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "PermalinkFetchError";
  }
}

export type HydratedConverterState = {
  direction: Direction;
  input: string;
  /** Only the options the permalink actually set — merged over defaults. */
  options: Partial<ConverterOptions>;
};

/**
 * The one table that turns legacy element ids into converter state —
 * the single place that knows what `js/src/main.js` used to save, so no
 * per-tool special-casing ever appears at the call sites.
 *
 * Legacy saves stored textarea values as strings and checkbox/radio state
 * as booleans (js/src/main.js APP.save). Flags apply their saved value
 * outright — a `false` is as much the author's choice as a `true`.
 */
const LEGACY_ELEMENT_TABLE: Record<
  string,
  (state: HydratedConverterState, value: unknown) => void
> = {
  csv: (state, value) => {
    state.direction = "csv2json";
    state.input = toText(value);
  },
  json: (state, value) => {
    state.input = toText(value);
    state.direction = "json2csv";
  },
  parseNumbers: (state, value) => {
    const bool = toBool(value);
    if (bool !== undefined) state.options.parseNumbers = bool;
  },
  parseJSON: (state, value) => {
    const bool = toBool(value);
    if (bool !== undefined) state.options.parseJSON = bool;
  },
  transpose: (state, value) => {
    const bool = toBool(value);
    if (bool !== undefined) state.options.transpose = bool;
  },
  // Legacy output radios: checked means array/hash output.
  "output-array": (state, value) => {
    const bool = toBool(value);
    if (bool !== undefined) state.options.hash = !bool;
  },
  "output-hash": (state, value) => {
    const bool = toBool(value);
    if (bool !== undefined) state.options.hash = bool;
  },
  flatten: (state, value) => {
    const bool = toBool(value);
    if (bool !== undefined) state.options.flatten = bool;
  },
  // No equivalent option on the new converter — recognized so the shape
  // check tolerates it, applied as a no-op.
  output_csvjson_variant: () => {},
};

function toText(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return "";
}

function toBool(value: unknown): boolean | undefined {
  if (value === true || value === "true") return true;
  if (value === false || value === "false") return false;
  return undefined;
}

function isLegacyShape(data: unknown): data is Record<string, unknown> {
  if (data === null || typeof data !== "object" || Array.isArray(data)) {
    return false;
  }
  // Every legacy save is a flat {elementId: string | boolean} bag.
  return Object.values(data).every(
    (value) => typeof value === "string" || typeof value === "boolean"
  );
}

/**
 * Map a legacy {elementId: value} object onto converter state. Returns
 * null when the payload is not a legacy converter shape (no `csv`/`json`
 * input key — e.g. Data Janitor sessions) so the caller can fall back to
 * the not-found notice. If both input keys somehow appear, `csv` wins:
 * a single legacy save carries exactly one.
 */
export function hydrateConverter(
  data: unknown
): HydratedConverterState | null {
  if (!isLegacyShape(data)) return null;
  const hasCsvInput = "csv" in data;
  const hasJsonInput = "json" in data;
  if (!hasCsvInput && !hasJsonInput) return null;

  const state: HydratedConverterState = {
    direction: hasCsvInput ? "csv2json" : "json2csv",
    input: "",
    options: {},
  };
  for (const [key, value] of Object.entries(data)) {
    LEGACY_ELEMENT_TABLE[key]?.(state, value);
  }
  // Exactly one input key exists in real saves; `csv` wins the tie.
  state.input = hasCsvInput ? toText(data.csv) : toText(data.json);
  return state;
}

/**
 * Fetch a legacy permalink object straight from S3 (read-only GET —
 * the SPA never writes to S3). The response is the raw legacy
 * `{elementId: value}` object; shape mapping happens in hydrateConverter.
 */
export async function fetchLegacyPermalink(
  id: string
): Promise<Record<string, unknown>> {
  if (!PERMALINK_ID_PATTERN.test(id)) {
    throw new PermalinkNotFoundError();
  }
  let response: Response;
  try {
    response = await fetch(`${S3_DATA_URL}${id}`, { mode: "cors" });
  } catch (e) {
    throw new PermalinkFetchError("Network error while loading this data", {
      cause: e,
    });
  }
  if (response.status === 403 || response.status === 404) {
    throw new PermalinkNotFoundError();
  }
  if (!response.ok) {
    throw new PermalinkFetchError(
      `Unexpected response while loading this data (HTTP ${response.status})`
    );
  }
  let data: unknown;
  try {
    const text = await response.text();
    if (text.trim() === "") throw new Error("empty body");
    data = JSON.parse(text);
  } catch {
    throw new PermalinkFetchError("Stored data for this link is malformed");
  }
  return data as Record<string, unknown>;
}
