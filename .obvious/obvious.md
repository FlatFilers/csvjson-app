# CSVJSON — FlatFilers/csvjson-app

Source for www.csvjson.com: a minimal React SPA for in-browser data conversion (CSV↔JSON, SQL→JSON, validate/beautify, CSVJSON to JSON) served by a thin PHP front controller on Heroku. All conversions run client-side; the PHP shim serves the SPA, handles redirects/legacy permalinks, and exposes exactly two sanctioned write APIs (feedback votes, changelog votes) backed by PostgreSQL.

## Stack

- **Frontend:** React 19 + Vite + TypeScript + Tailwind 4 (app/). CodeMirror for the editable JSON surface, lucide-react for icons, @tanstack/react-virtual for large tables. Dependencies are pinned; dependency behavior changes land as postinstall patches (`app/scripts/patch-*.mjs`), never as forkes.
- **PHP shim:** plain PHP 8.4 files at the repo root — `index.php` (front controller: SPA serving, 301 redirect map, legacy permalink hydration, route registration), `feedback-db.php` / `feedback-api.php` / `feedback-admin.php`, `changelog-db.php` / `changelog-vote-api.php`. No framework, no composer.
- **Database:** PostgreSQL via `DATABASE_URL` (Heroku/Neon `postgres://` URL parsed to a libpq DSN). Tables self-create on first use (`feedback_ensure_schema`, `changelog_ensure_schema`, `feedback_ensure_write_log`) — there are no migrations. Locally anything runs without a database; the write endpoints answer 503.
- **Build artifacts:** `app/dist` is committed. CI hash-guards it against a fresh `npm run build` — always rebuild and commit `app/dist` when `app/` changes.

## Commands

| Task | Command |
|---|---|
| Install | `cd app && npm ci` (postinstall patches the conversion deps) |
| Dev server | `cd app && npm run dev` |
| Lint | `cd app && npm run lint` |
| Typecheck | `cd app && npx tsc -b --noEmit` |
| Tests (346 as of the changelog PR) | `cd app && npm test` |
| Production build (incl. prerender) | `cd app && npm run build` |
| PHP syntax check | `php -l index.php feedback-db.php feedback-api.php feedback-admin.php changelog-db.php changelog-vote-api.php` |
| API smoke tests | `FEEDBACK_SALT=… ADMIN_TOKEN=… DATABASE_URL=postgres://…/disposable_db bash scripts/smoke-feedback.sh` (same pattern for `scripts/smoke-changelog.sh`) |
| SEO verification | `bash .github/scripts/verify-seo.sh` (after a build) |
| Shim verification | `bash .github/scripts/verify-shim.sh` |

The smoke tests need PHP 8.4 with pdo_pgsql, a reachable Postgres, and a **disposable** database each — the per-IP rate limit makes their write-count asserts one-shot, and each script provisions its own tables. `smoke-changelog.sh` creates its own `changelog_smoke` database from `DATABASE_URL`'s server; `smoke-feedback.sh` expects the database at `DATABASE_URL` to exist.

## Architecture rules

- **Exactly two sanctioned writes:** `POST /api/feedback` and `POST /api/changelog-vote`. Everything else in the SPA is read-only; CI fails on any other `method: POST/PUT/PATCH/DELETE` or S3 write call (the two endpoints are carved out by line-level `sed` in `.github/workflows/ci.yml`). Vote totals are private: admin-only readout, no GET endpoint.
- **Shared rate-limit table:** both vote endpoints log writes to `feedback_write_log` and enforce the same per-IP/24h and global/hour caps. Rejected or over-limit attempts roll back and leave no trace. `feedback_ensure_write_log()` exists separately so a fresh database never depends on one endpoint running before the other.
- **Client identity:** vote clients send a persisted UUID (`csvjson:feedback.v1` / `csvjson:changelog.v1` localStorage, type-guarded and try-caught — storage failure degrades to no dot / non-persistent votes, never a broken page). IPs are stored only as a truncated HMAC-SHA256 keyed by `FEEDBACK_SALT`.
- **Changelog entries are bundled:** `app/src/changelog/entries.ts`, monotonic ids, ISO dates, 1–2 sentence summaries, optional tag (`new` | `fix` | `improvement`). Render order is enforced by `newestFirst()` (newest id on top), so authoring order in the array is free — but author newest first by convention. Dates must agree with id order down the rendered list (schema-tested); the DB enforces `entry_id ≤ 1000000`.
- **Analytics are success-only Plausible manual events** (`changelog_open`, `changelog_vote`) alongside the restored gtag/Plausible/GA4 loader conventions in `app/src/analytics/`.
- **`/feedback-admin`** is the only readout surface: HTTP Basic with `ADMIN_TOKEN`, `X-Robots-Tag: noindex`, escaped output. `robots.txt` disallows `/api/` as a prefix, which covers both vote endpoints.
- **SEO:** routes are prerendered into `app/dist` (`scripts/prerender.mjs`); `verify-seo.sh` gates the build. Client-side rendering starts from `createRoot`, so prerendered HTML must match what React renders first paint.

## Conventions

- **User-facing PRs add their own changelog entry.** Any PR that changes the product's user-visible behavior adds a bundled entry to `app/src/changelog/entries.ts` in the same PR (id = previous max + 1, today's UTC date, honest 1–2 sentence summary). The unseen-dot logic makes the entry the user-facing announcement — there is no separate release-notes channel.
- Accessibility: every control has an accessible name; widget testids follow the established `data-testid` patterns (`changelog-toggle`, `changelog-popout`, `changelog-up-{id}`, `changelog-down-{id}`); dialogs use `role="dialog"` + focus return.
- Keep the test suite green — it is the primary local gate; CI is the final gate.

## CI (`.github/workflows/ci.yml`)

Two jobs. **Frontend:** lint → typecheck → vitest → production build with `app/dist` parity check → `verify-seo.sh`. **PHP shim:** `php -l` over all six root PHP files → `verify-shim.sh` (redirect table, permalinks, removed endpoints) → promotional/telemetry remnant scan → no-write-API scan (carve-outs: `/api/feedback`, `/api/changelog-vote`) → both Postgres smoke tests with fresh disposable databases.

## Gotchas

- The vitest environment is jsdom with `@testing-library/user-event` — for outside-click + focus-return flows, use `click` (not `mousedown`) listeners and let userEvent's blur settle before asserting focus, or the jsdom act warnings will eat the assertion.
- The vote endpoints' Origin check compares `Origin` host against `HTTP_HOST` — under `php -S` in smokes, send `Origin: http://127.0.0.1:<same port>`; cross-origin is 403.
- Heroku auto-deploys on merge to master; the DB credentials live in `SECRET_CSVJSON_FEEDBACK_DB_URL` in the Obvious workspace (Neon, TLS negotiated by libpq defaults).
