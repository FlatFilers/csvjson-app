/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Base URL of the legacy permalink bucket's `data/` prefix, with a
   * trailing slash (e.g. https://csvjson.s3.us-east-2.amazonaws.com/data/).
   * Optional — the permalink service falls back to the production bucket.
   */
  readonly VITE_S3_DATA_URL?: string;
}
