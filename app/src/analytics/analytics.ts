/**
 * Pageview plumbing for the restored analytics (ID policy in ./config).
 * app/index.html carries the single gtag.js loader and the Google Ads config
 * verbatim; this module adds the build-time-conditional GA4 config to that
 * same load and fires explicit pageviews — there is no SPA router to hook,
 * so the app owns the calls.
 */

import { ga4MeasurementId, isGa4Configured } from "./config";

type Gtag = (...args: unknown[]) => void;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: Gtag;
    plausible?: (event: string, options?: Record<string, unknown>) => void;
  }
}

/**
 * Queue the GA4 config onto the gtag.js load bootstrapped in index.html.
 * The Google Ads config ships inline there; this only adds GA4 when the
 * build provided a measurement ID.
 */
export function configureAnalytics(): void {
  const gtag = window.gtag;
  if (typeof gtag !== "function") return; // loader blocked — analytics must never throw
  if (!isGa4Configured()) return;
  // The SPA fires pageviews explicitly (trackPageview below), so the GA4
  // config must not auto-send a duplicate one on load.
  gtag("config", ga4MeasurementId(), { send_page_view: false });
}

/**
 * One pageview to every analytics surface present on the page. Fired exactly
 * once per app mount (main.tsx) — Plausible runs in manual mode
 * (script.manual.js in app/index.html), so this is its only pageview source;
 * gtag has auto pageview suppressed per-property (Ads has no auto pageview,
 * GA4 config passes send_page_view: false).
 */
export function trackPageview(): void {
  window.gtag?.("event", "page_view", {
    page_path: window.location.pathname,
    page_location: window.location.href,
  });
  window.plausible?.("pageview");
}

/**
 * A legacy permalink hydrating is a distinct fact worth measuring as its own
 * event — NOT a second pageview (the mount already carried the permalink URL,
 * and double-counting inflates every /:tool/:id visit).
 */
export function trackPermalinkView(): void {
  window.gtag?.("event", "permalink_view");
  window.plausible?.("Permalink View");
}

/**
 * The changelog popout was opened (spec: CSVJSON changelog widget,
 * art_YzASNds2). An engagement fact, not a pageview — never a second one.
 */
export function trackChangelogOpen(): void {
  window.gtag?.("event", "changelog_open");
  window.plausible?.("Changelog Open");
}

export interface ChangelogVoteProps {
  /** The voted entry id. */
  entry_id: number;
  /** Recorded vote: 1 = up, -1 = down. */
  vote: 1 | -1;
}

/**
 * One changelog vote the server confirmed — success-only, so a queued or
 * failing POST never counts as engagement (the vote re-fires when its retry
 * eventually lands).
 */
export function trackChangelogVote(props: ChangelogVoteProps): void {
  window.gtag?.("event", "changelog_vote", { ...props });
  window.plausible?.("Changelog Vote", { props: { ...props } });
}
