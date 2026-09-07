# Codebase Map — FlatFilers/csvjson-app

Depth-capped folder overview. File counts include git-tracked files only.

| Path | Files | Purpose |
|---|---|---|
| `/` (root PHP) | 6 | The Heroku front controller and the two sanctioned write APIs: `index.php` (SPA serving, 301 redirect map, legacy permalink hydration, route registration), `feedback-db.php` (shared PDO connect, schemas, IP hashing, rate-limit counters), `feedback-api.php` (`POST /api/feedback`), `feedback-admin.php` (`/feedback-admin` readout: Basic auth + `ADMIN_TOKEN`, noindex), `changelog-db.php` (`changelog_votes` schema), `changelog-vote-api.php` (`POST /api/changelog-vote`). All Postgres via `DATABASE_URL`; tables self-create on first hit. |
| `.github/workflows/ci.yml` | 1 | Two jobs: frontend (lint → typecheck → vitest → build + dist parity → SEO verify) and PHP shim (php -l, verify-shim.sh, remnant scan, no-write-API scan with the two vote-endpoint carve-outs, both Postgres smoke tests). |
| `.github/scripts/` | 2 | `verify-seo.sh` (prerender/SEO gates over `app/dist`), `verify-shim.sh` (redirect table, permalinks, removed endpoints). |
| `app/src/` | ~64 | The React SPA. `App.tsx` (routes + topbar-slot mounting FeedbackVote and ChangelogButton), `components/` (TopBar, SplitPane, panes, Dropzone, FeedbackBanner/Vote, Faq), `changelog/` (bundled `entries.ts`, `ChangelogButton.tsx`, `relativeDate.ts`), `analytics/` (gtag/Plausible/GA4 loader + success-only manual events), `lib/` (pure conversion/clipboard/download logic), `hooks/`, `seo/` (prerender entry + FAQ content), `test/` (vitest setup). |
| `app/dist/` | 3 | Committed production build (prerendered HTML + hashed assets). Hash-guarded in CI against a fresh `npm run build` — rebuild and commit on every `app/` change. |
| `app/scripts/` | 3 | Build-time tooling: `prerender.mjs` (static route render) and the two postinstall patches that pin dependency behavior (`patch-json2csv.mjs`, `patch-csv2json.mjs`). |
| `scripts/` | 2 | Postgres smoke tests: `smoke-feedback.sh`, `smoke-changelog.sh` (disposable databases; validation, upsert, rate-limit, 503, admin readout). |
| `docs/` | 2 | `deploy.md` (Heroku deployment), `verification-report.md` (design-verification record). |
| `img/` | 1 | `favicon.ico` only — the SPA has no promotional image assets (CI scans for remnants). |
| `.htaccess`, `.user.ini`, `Procfile`, `composer.json/lock` | 5 | Heroku/runtime plumbing: Apache rewrite rules for the legacy host, PHP settings, web dyno `php -S` boot, PHP version pin. |
| `.obvious/` | 4 | This map, repo guidance (`obvious.md`), repo policy (`config.yml`), local-dev skill. |

Legacy CodeIgniter (`application/`, `system/`, `js/src/`) was removed in the SPA replacement; anything describing it is stale.
