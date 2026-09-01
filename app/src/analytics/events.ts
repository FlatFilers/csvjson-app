/**
 * Conversion and export event fan-out — one call site feeds every analytics
 * surface (Plausible, and gtag's Google Ads property plus GA4 once a G- ID is
 * configured via VITE_GA4_MEASUREMENT_ID). Machine names stay lowercase
 * "conversion"/"export" everywhere; Plausible's goal names are capitalized.
 *
 * Ads seam: these events carry no send_to yet. When David creates a
 * conversion action in the Google Ads console, its label is added to the
 * conversion call in one line (see docs/verification-report.md).
 *
 * Event payloads are plain, JSON-safe property bags on both surfaces —
 * Plausible custom goals read { props }, gtag reads a flat event object.
 */

/** Direction label used in event props (not the app's csv2json/json2csv). */
export type AnalyticsDirection = "csv_to_json" | "json_to_csv";

/** How the input arrived. Typed/pasted text counts as "paste". */
export type ConversionInput = "paste" | "file" | "drag" | "permalink";

export type ExportVia = "copy" | "download";
export type ExportFormat = "json" | "csv";

export interface ConversionProps {
  direction: AnalyticsDirection;
  input: ConversionInput;
  /** Byte bucket of the input: '<10KB' | '10-100KB' | '100KB-1MB' | '>1MB'. */
  size: string;
}

export interface ExportProps {
  via: ExportVia;
  format: ExportFormat;
}

export type TrackableEventName = "conversion" | "export";

function capitalize(name: TrackableEventName): string {
  return name.charAt(0).toUpperCase() + name.slice(1);
}

/**
 * Fan one event out to every analytics surface on the page. Safe no-op when
 * the tags are absent (loader blocked, tests) — analytics must never throw.
 */
export function trackEvent(
  name: TrackableEventName,
  props: ConversionProps | ExportProps
): void {
  window.gtag?.("event", name, { ...props });
  window.plausible?.(capitalize(name), { props: { ...props } });
}

export function trackConversion(props: ConversionProps): void {
  trackEvent("conversion", props);
}

export function trackExport(props: ExportProps): void {
  trackEvent("export", props);
}

export function byteLength(text: string): number {
  return new TextEncoder().encode(text).length;
}

/** Byte bucket of the input ('<10KB' | '10-100KB' | '100KB-1MB' | '>1MB'). */
export function sizeBucket(bytes: number): string {
  if (bytes < 10 * 1024) return "<10KB";
  if (bytes < 100 * 1024) return "10-100KB";
  if (bytes < 1024 * 1024) return "100KB-1MB";
  return ">1MB";
}

/** One observation of the converter's input, pre-shaped for firing. */
export interface ConversionObservation {
  direction: AnalyticsDirection;
  input: ConversionInput;
  text: string;
}

export interface ConversionTrackerOptions {
  /** Quiet period required before a settled input fires. */
  settleMs?: number;
  /** Hard rate cap: never more than one conversion event per window. */
  minWindowMs?: number;
  /** Injectable clock for tests. */
  now?: () => number;
  /**
   * A conversion only counts when the app produced a valid result from the
   * settled input. Evaluated at fire time so it sees the options current
   * then, not at the last keystroke.
   */
  isValid?: (direction: AnalyticsDirection, text: string) => boolean;
}

/**
 * Stateful gate for conversion events. The app converts live on every
 * keystroke, so raw conversions would be noise: an event fires once per
 * first stable output after input settles, keyed by a signature of
 * direction + input method + input length — it fires again only when the
 * input actually changes (new paste/upload/drop or permalink hydration),
 * and never more than once per {@link minWindowMs} window.
 */
export function createConversionTracker(
  options: ConversionTrackerOptions = {}
): ConversionTracker {
  const settleMs = options.settleMs ?? 2000;
  const minWindowMs = options.minWindowMs ?? 2000;
  const now = options.now ?? (() => Date.now());
  const isValid = options.isValid ?? (() => true);

  let pending: ConversionObservation | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let lastSignature: string | null = null;
  let lastFiredAt = 0; // epoch 0 = "long ago": the first fire is never window-blocked

  function signatureOf(obs: ConversionObservation): string {
    return `${obs.direction}:${obs.input}:${byteLength(obs.text)}`;
  }

  function attemptFire(obs: ConversionObservation): boolean {
    if (obs.text.trim() === "") return false; // nothing to convert — not a conversion
    const signature = signatureOf(obs);
    if (signature === lastSignature) return false;
    if (!isValid(obs.direction, obs.text)) return false;
    const at = now();
    if (at - lastFiredAt < minWindowMs) return false;
    lastSignature = signature;
    lastFiredAt = at;
    trackConversion({
      direction: obs.direction,
      input: obs.input,
      size: sizeBucket(byteLength(obs.text)),
    });
    return true;
  }

  function scheduleSettle(): void {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = undefined;
      if (pending) attemptFire(pending);
    }, settleMs);
  }

  return {
    edit(direction, text) {
      pending = { direction, input: "paste", text };
      scheduleSettle();
    },
    discrete(direction, input, text) {
      pending = { direction, input, text };
      // Keep the settle fallback scheduled: if the immediate fire is blocked
      // by the 2s window, the stable-output fire picks it up afterwards.
      scheduleSettle();
      attemptFire(pending);
    },
    cancel() {
      pending = null;
      if (timer) {
        clearTimeout(timer);
        timer = undefined;
      }
    },
  };
}

export interface ConversionTracker {
  /** A settled (non-discrete) input: paste, typing, example, or post-flip. */
  edit(direction: AnalyticsDirection, text: string): void;
  /** Discrete success (picker/drop/permalink): immediate fire attempt. */
  discrete(
    direction: AnalyticsDirection,
    input: "file" | "drag" | "permalink",
    text: string
  ): void;
  /** Drop any pending observation (input was cleared). */
  cancel(): void;
}
