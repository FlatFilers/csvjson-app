# CSVJSON — FlatFilers/csvjson-app

Source for www.csvjson.com: browser-based data conversion tools (CSV↔JSON, SQL→JSON, JSON validate/beautify, CSVJSON to JSON, Data Janitor). All conversions run client-side in JavaScript; PHP serves pages, telemetry, and permalink storage.

## Stack

- **Language:** PHP 8.4 (CodeIgniter 2.1.4 framework code written for PHP 5.x — see Gotchas)
- **Framework:** CodeIgniter 2.1.4 (`system/`, unmodified), app code in `application/`
- **Frontend:** jQuery 2, Bootstrap 3, Underscore/Backbone/Backgrid; conversion libraries in `js/csvjson/`, UI drivers in `js/src/`
- **Database:** MariaDB 11.8 — used only by telemetry endpoint `POST /csv2json/instrument` (database `csvjson`, table `csv`). No migrations exist.
- **Optional external service:** AWS S3 for saved-permalink storage (env vars `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `S3_BUCKET`). Without them the app stores permalinks in the local `data/` directory. Not required for local dev; S3 mode is broken on PHP 8 (see Gotchas).
- **Package manager:** none. No composer.json/package.json; all dependencies are vendored in the repo.

## Commands

| Task | Command |
|---|---|
| Start MariaDB | `sudo service mariadb start` |
| Start dev server | `nohup php -S 127.0.0.1:8080 router.php > /tmp/php-server.log 2>&1 &` |
| App URL | http://127.0.0.1:8080/ |
| PHP syntax check | `find application -name '*.php' -exec php -l {} \;` |
| Production bundle | Visit `/build` in a browser (minifies + concatenates js/css; built assets are committed to git) |
| Tests / lint | None in repo — no test suite, no linter config |

Tool pages: `/csv2json`, `/json2csv`, `/sql2json`, `/json_validator`, `/json_beautifier`, `/csvjson2json`, `/datajanitor`. Home: `/`.

## Local dev environment (sandbox)

The sandbox ships with PHP 8.4 + extensions, MariaDB (db `csvjson`, user `csvjson`/`csvjson`), chromium, and these repo-local files. They are untracked or gitignored — never commit them:

- `router.php` (untracked) — built-in-server router mirroring `.htaccess`: serves static files, blocks `system/`, `application/`, `.git`, `README.md`, redirects `/dataclean` → `/datajanitor`, routes the rest to `index.php`.
- `application/config/development/config.php` (gitignored) — local `base_url` + `error_reporting(E_ALL & ~E_DEPRECATED & ~E_STRICT)`.
- `application/config/development/database.php` (gitignored) — local DB credentials.
- `application/config/development/aws_s3.php` (gitignored) — disk-based permalinks, no `$_ENV` access.
- `data/` (gitignored) — local permalink storage.

To recreate this environment from a fresh clone, follow `.obvious/skills/local-dev/SKILL.md`.

## Codebase map

See [codebase-map.md](codebase-map.md).

## Local Verification Summary

Verified 2026-08-24 on the sandbox (PHP 8.4.24, MariaDB 11.8.6, Debian 13):

- **Pages:** home + all 7 tool pages return HTTP 200 with zero PHP error output and a clean `<!DOCTYPE html>` start.
- **Assets:** all 39 development asset files referenced in `application/config/assets.php` exist and serve HTTP 200.
- **Primary user flow (browser E2E, Chromium 151 + puppeteer-core):** loaded `/csv2json`, typed CSV into `#csv`, clicked `#convert`, `#result` contained the correct JSON; zero browser console errors. Screenshot: `/tmp/shots/csv2json-converted.png`.
- **Conversion library (node):** `js/csvjson/csv2json.js` produces correct output in array and hash modes.
- **Database:** `POST /csv2json/instrument` writes rows to MariaDB `csvjson.csv` (verified by SELECT).
- **Syntax:** `php -l` over all 63 `application/` and 127 `system/` PHP files — 2 pre-existing PHP 8 parse errors in code paths not used in local dev (see Gotchas).
- **Security:** `/system/...`, `/.git/...`, `/README.md` return 403 via `router.php`.

## Sandbox snapshot

- **Snapshot ID:** `ob0wxtf01k11upr6a1dv:default` (sandbox `i01p5umk7ly564q1bj9mc`)
- **Captured:** 2026-08-24T16:23:53.945Z
- **State:** PHP dev server running on 127.0.0.1:8080, MariaDB running with `csvjson` database seeded, dev config overrides and `router.php` in place.

## Gotchas

- **PHP 8 deprecations:** CI 2.1.4 emits ~44 deprecation notices per request on PHP 8 (dynamic properties, E_STRICT). They are suppressed for display via `error_reporting` in `application/config/development/config.php`; they still appear in `application/logs/`.
- **S3 library is PHP 5 only:** `application/libraries/s3.php` has a parse error on PHP 8 (`$value{0}` curly-brace offset, line 2582). It is only loaded when `AWS_S3_URL` is defined (S3 mode). Local dev uses disk mode and never loads it.
- **Profiler library is PHP 5 only:** `system/libraries/Profiler.php` line 70 has the same parse error; profiler is not enabled in dev.
- **File upload path is PHP 5 era:** `js/src/csv2json.js` posts to `/csv2json/upload`; the request reaches `csvjson_helper.php` expecting `$_FILES["file"]`, and a bare POST emits a pre-existing PHP 8 warning ("Undefined array key \"file\""). Type/paste CSV instead of uploading files.
- **Base URL:** production `base_url` is hardcoded to `https://csvjson.com/` in `application/config/config.php`; the development override points it at `http://127.0.0.1:8080/`.
- **ENVIRONMENT:** `index.php` picks `production` when `SERVER_NAME` contains `csvjson.com`, else `development`. Localhost always gets development (unminified assets from `js/src/`).
