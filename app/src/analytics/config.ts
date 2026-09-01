/**
 * Analytics configuration — restored for launch per David Boskovic
 * (2026-09-01), which supersedes the spec criterion 8 zero-telemetry decision
 * for analytics only. Conversions still never touch a server: the site's own
 * data flow is unchanged, only visits are counted.
 *
 * One gtag.js load (bootstrap in app/index.html) serves every gtag property.
 * The Google Ads conversion tag is the exact tag the legacy site shipped
 * (pre-rebuild master abda3770, application/views/page.php). GA4 must be a
 * NEW property: the legacy Universal Analytics ID (dead since July 2023)
 * collects nothing — never send to it. Its literal is banned in app/src by
 * the CI remnant gate, which is why it appears nowhere verbatim here.
 */

/** Google Ads conversion ID, restored verbatim from the legacy site. */
export const GOOGLE_ADS_ID = "AW-831825021";

/**
 * GA4 measurement ID, injected at build time via VITE_GA4_MEASUREMENT_ID
 * (read through a function so tests can stub the env per case; Vite inlines
 * the literal at build). Empty by default: only the Ads config ships and no
 * GA4 config call is ever made.
 */
export function ga4MeasurementId(): string {
  return import.meta.env.VITE_GA4_MEASUREMENT_ID ?? "";
}

/**
 * GA4 IDs look like G-XXXXXXXXXX. Anything else — a stale UA- ID, a typo —
 * is not a GA4 property and must not ship as a config call.
 */
export function isGa4Configured(): boolean {
  return /^G-[A-Z0-9]+$/.test(ga4MeasurementId());
}
