/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Base URL of the legacy permalink bucket's `data/` prefix, with a
   * trailing slash (e.g. https://csvjson.s3.us-east-2.amazonaws.com/data/).
   * Optional — the permalink service falls back to the production bucket.
   */
  readonly VITE_S3_DATA_URL?: string;

  /**
   * GA4 measurement ID (e.g. G-XXXXXXXXXX), injected at build time. Optional
   * — when unset, only the Google Ads config ships (app/src/analytics).
   */
  readonly VITE_GA4_MEASUREMENT_ID?: string;
}
