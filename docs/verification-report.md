# CSVJSON rebuild — release verification report

Integration branch: `release/rebuild-csvjson-spa` (promotion PR #155, base `master`).
Spec: CSVJSON rebuild spec (Blueprint `art_K61RhTbt`) — the whole Verification table is the checklist.

All verification ran on the integrated branch at the release commit, against the
production build (`app/dist`) served by the PHP shim (`php -S 127.0.0.1:8899 index.php`,
the same front controller Apache uses).

## Results by acceptance criterion

| # | Criterion | Verdict | Evidence |
|---|-----------|---------|----------|
| 1 | Round-trip fidelity | ✅ | vitest fixture suite: 91/91 tests green (11 files) after the chat-promo cut; was 111/111 (13 files) with the promo |
| 2 | Options behave | ✅ | vitest fixtures per option (same suite) |
| 3 | Dense table / highlighted JSON / toggle swap | ✅ | component tests + walkthrough (see criterion 12) |
| 4 | Invalid input → inline error, last valid output retained | ✅ | walkthrough steps `invalid: inline error shown`, `invalid: last valid output retained` |
| 5 | Large-input virtualization, no network upload | ✅ | component tests + FileReader-only upload (no upload endpoint exists; `curl /csv2json/upload` → 410) |
| 6 | Legacy permalink hydration | ✅ | see below |
| 7 | Every dead URL 301s per the map | ✅ | see curl table below |
| 8 | No promotional/telemetry remnants | ✅ | grep over `app/dist`, `app/src`, `index.php`, `.htaccess`, `sitemap.xml`, `robots.txt` for segment/linkedin/carbonads/chikita/flatfile/typekit/putObject → **zero hits**. Amended 2026-09-01 (see "Criterion 8 — analytics restored" below): gtag and Plausible are sanctioned analytics tags asserted present by CI, not banned. |
| 9 | CI green on every PR | ✅ | CI from zero (`.github/workflows/ci.yml`): lint + typecheck + tests + production build; all six child PRs merged green; full local gate re-run on the integrated branch (below) |
| 10 | Crawlable initial HTML | ✅ | curl of built `index.html`: title, H1, og:title/og:description, canonical, 2 JSON-LD blocks (SoftwareApplication, FAQPage with 4 Q/As), "How it works & FAQ", option-hint text ("…00721 into 7…"), "CSV to JSON"/"JSON to CSV"/"TSV" all present |
| 11 | Edge-case behaviors | ✅ | vitest fixtures (ragged rows, duplicate headers, empty cells, direction flip) — part of the 91 |
| 12 | States render per the states table | ✅ | component tests per state + scripted walkthrough, **17/17 checks** |
| 13 | One promo ("Chat with this data in…") | ✂️ **Cut for v1** | Documented product decision (David, 2026-08-31): the chat promo is parked for a future release, not a verification failure. Feature surface (PR #159) fully removed on this branch — no dead code or copy remains (grep-verified); the TopBar's general extension slot is retained for the future re-add. |

## Local verification (integrated branch, this pass)

- lint: clean
- typecheck (`tsc -b`): clean
- test suite: **91 passed (91)**, 11 files (chat-promo suites removed with the feature — cut for v1 per David's direction)
- production build + prerender: green (`dist/index.html` prerendered, 15329 chars of app markup, chat-promo-free)
- legacy permalink E2E (criterion 6): committed script `app/scripts/e2e-legacy-permalink.ts` against the live bucket —
  `GET https://csvjson.s3.us-east-2.amazonaws.com/data/000c44f43e2f62cc15c48d9d7c5a4582` → HTTP 200, direct browser fetch
  (no PHP proxy), hydrates direction `csv2json` with saved options `{parseNumbers:true, parseJSON:true, transpose:false, hash:false}`;
  unknown id (`deadbeef…`) → inline "This data doesn't exist (or was deleted)" notice; URL never rewritten; read-only.

## Criterion 7 — 301 redirect map (curl, PHP shim)

| URL | Status | Result |
|---|---|---|
| `/csv2json`, `/json2csv`, `/json_validator`, `/json_beautifier`, `/sql2json`, `/csvjson2json`, `/datajanitor`, `/dataclean` | 301 → `/` | all 8 tool roots |
| `/csv2json/anything`, `/datajanitor/sub/route`, `/sql2json/x`, `/dataclean/` | 301 → `/` | sub-routes + trailing slashes |
| `/CSV2JSON/foo` | 301 → `/` | case-insensitive |
| `/csv2json/upload`, `/csv2json/instrument` | **410** | removed endpoints die outright |
| `/`, `/<tool>/<32-hex>` (all 7 permalink tools) | **200** (SPA) | permalinks stay live, no redirect |
| `/csv2json/<bogus-32-hex>` | 200 + inline not-found notice (client hydrate failure) | never blank |
| `/nonexistent` | 404 | |
| `/assets/index-*.js` | 200, `text/javascript; charset=utf-8`, `Cache-Control: public, max-age=31536000, immutable` | hashed assets immutable; `index.html` `no-cache` |

## Criterion 8 — analytics restored (scope change, 2026-09-01)

**Decision (David Boskovic, 2026-09-01):** analytics are restored for the launch,
which supersedes criterion 8's zero-telemetry decision **for analytics only** —
the site's own data flow is unchanged and conversions still never touch a
server; only visits are counted.

- **Google Ads**: the exact legacy conversion tag is restored — gtag.js with
  `AW-831825021` (async loader + dataLayer bootstrap + `gtag('js')` +
  `gtag('config')` in `app/index.html`, carried into the prerendered
  `app/dist/index.html`). Conversion actions are configured in the Ads
  console; no frontend code is needed per conversion.
- **GA4**: the loader is GA4-ready. A measurement ID injected at build time
  (`VITE_GA4_MEASUREMENT_ID`) adds its config to the same single gtag.js
  load; unset means only the Ads config ships. The legacy Universal Analytics
  ID `UA-46942708-1` is dead (July 2023 sunset) and a CI/SEO check fails the
  build if it ever reappears.
- **Plausible**: cloud script with `data-domain="csvjson.com"` ships in the
  prerendered head, in **manual mode** (`script.manual.js`, follow-up fix
  2026-09-01) — the auto-tracking script would double every visit next to the
  app's single mount pageview. The app fires exactly one pageview per mount;
  legacy permalink hydration fires a distinct `permalink_view` event
  (gtag) / `Permalink View` (Plausible), never a second pageview.
- The remnant gate keeps `segment|linkedin|carbonads|chikita|flatfile|
  typekit|putObject` banned; `gtag` was removed from the banned list (it is
  now a sanctioned tag), and the dead `UA-46942708` ID was added to the ban
  so the never-ship invariant holds at source level, not just in the built
  HTML. The FAQ privacy copy now characterizes each tag honestly: Plausible
  counts visits cookieless; the Google tag is a standard conversion-
  measurement tag that uses page URL and referrer — neither ever sees user
  data (conversion claims unchanged and still true).

## Criterion 12 — states walkthrough (screenshots in `verification-screenshots/`)

Driven by `app/scripts/states-walkthrough.mjs` (Playwright, trusted browser input) against
the PHP shim serving the production build. 17/17 checks:

empty (dropzone + quiet output placeholder) · drag-over highlight (`data-drag-over`) ·
ready (dense table replaces dropzone, `6 rows · 3 cols` in header) · raw editing toggle ·
direction flip via **real trusted mouse click** · invalid JSON inline error with position +
last valid output retained · dark mode toggle + persistence · 375px stacked panes ·
permalink unknown-id notice · permalink real-object hydration (URL never rewritten) ·
FAQ in initial DOM + click reveal.

Screenshots: `01-empty-light` … `12-faq-open` (light, dark, narrow, permalink states, FAQ open).

## Bugs found and fixed during verification

1. **Direction switch dead on real mouse input** — the seam's `onPointerDown` called
   `setPointerCapture()` unconditionally, retargeting the click to the seam so the ⇄
   button never fired in a real browser (jsdom's synthetic click couldn't see it).
   Fix: the seam ignores pointerdowns originating on the switch; regression test added.
2. **JSON→CSV crashed in the browser bundle** — `csvjson-json2csv@1.0.3` assigns
   `keyValues = []` without a declaration; an implicit global that Node tolerates but a
   strict-mode ESM bundle throws `ReferenceError: keyValues is not defined` on (the
   legacy site loaded the same code as a classic script). Fixed by a one-token
   mechanical patch (`var keyValues = [];`) applied by `app/scripts/patch-json2csv.mjs`
   as a `postinstall` step — no conversion logic changed. Both bugs were invisible to
   jsdom component tests and were caught by the Playwright walkthrough.

## Pre-launch manual items (for David)

1. **Search Console baseline** — export the query/position baseline before launch so
   post-301 movement is measurable.
2. **Deploy transport** — default per spec: commit the built `dist/` (done on this
   branch). If David prefers rsync/SCP from CI, the committed dist can be dropped;
   his call, host-access details only he has.

   The deploy runbook now lives in **`docs/deploy.md`**: Procfile + composer stub
   for the existing Heroku app (PHP buildpack auto-detects, `heroku-php-apache2`
   boots Apache at the repo root, `.htaccess` rewriting unchanged), the
   post-merge cutover checklist, and rollback.
