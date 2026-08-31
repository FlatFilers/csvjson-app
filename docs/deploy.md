# Deploying the rebuilt CSVJSON to Heroku

This is the transition runbook for cutting csvjson.com over from the legacy
CodeIgniter tree to the rebuilt SPA (integration branch
`release/rebuild-csvjson-spa`, promotion PR #155). The existing production
Heroku app — the one Cloudflare already proxies csvjson.com to — takes the
new tree on its next deploy; no new app, no DNS or SSL changes.

## What makes the app boot

The repo root carries exactly two pieces of deploy configuration:

- **`Procfile`** — `web: heroku-php-apache2`. The Heroku PHP buildpack boots
  Apache with the default docroot (the app root). We deliberately do **not**
  pass a docroot argument: `index.php` is the front controller at the web
  root, and the committed `.htaccess` does the rewriting.
- **`composer.json`** — `{"require":{"php":"~8.3.0"}}` with a matching
  `composer.lock` (platform-only, no packages). The file is required purely
  for PHP buildpack detection (see
  [Deploying PHP](https://devcenter.heroku.com/articles/deploying-php)); the
  `php` constraint pins the runtime to PHP 8.3.x. There are no Composer
  dependencies — no `vendor/` is built and `composer install` is a no-op.

On deploy, Heroku auto-detects the PHP buildpack from `composer.json`,
installs the PHP 8.3 runtime, reads the `Procfile`, and starts
`heroku-php-apache2` at the repo root. Heroku's Apache build honors the
committed `.htaccess`, so the shim behaves exactly as verified locally:

1. Real files under the docroot are served by Apache directly — the deny
   list in `.htaccess` is the **only** gate, because the docroot is the repo
   root. What stays public: `img/`, `robots.txt`, `sitemap.xml`,
   `license.txt`, and `index.php` itself (the front controller).
2. Everything else committed is forbidden at the web server (403): the SPA
   build tree (`app/`), git/CI metadata (`.git*`, `.github`), repo docs
   (`docs/`), verification screenshots, dotfiles, build/dep metadata
   (`Procfile`, `composer.json`/`composer.lock`), `README.md`,
   `ISSUE_TEMPLATE.md`, and the editor project files. The front controller
   mirrors the same list so the dev server (and CI's `verify-shim.sh`) 404s
   them identically.
3. Everything else rewrites to `index.php`, which serves the built SPA from
   `app/dist` (the committed build is the deploy transport) and applies the
   legacy 301 map and permalink passthrough.

The redirect/asset behavior is exactly what CI enforces on every push:
`.github/scripts/verify-shim.sh` (301 map, permalinks, removed endpoints,
dist-asset caching, traversal refusal) and `php -l index.php` on PHP 8.3.

## Cutover checklist (after PR #155 merges)

0. **Search Console baseline export — BLOCKING, before deploying anything.**
   Export query performance and URL coverage data for csvjson.com from
   Google Search Console before deploying the release branch. It is the
   only before/after evidence available once the old tree is gone — there
   is no way to reconstruct it later. This is a required pre-cutover
   artifact (David's call; already on the pre-launch list in
   `docs/verification-report.md`).

Then deploy the release branch to the production app (via your existing
deploy path — Git push to the Heroku remote, CI auto-deploy, or dashboard),
and verify, in order:

1. **301 map** — run the same checks CI runs, but against production:

   ```bash
   for tool in csv2json json2csv json_validator json_beautifier sql2json \
               csvjson2json datajanitor dataclean; do
     curl -sI "https://csvjson.com/$tool" | head -3
     curl -sI "https://csvjson.com/$tool/sub/route" | head -3
   done
   # each must be: HTTP/2 301, location: https://csvjson.com/

   # Removed endpoints are gone outright:
   curl -s -o /dev/null -w '%{http_code}\n' https://csvjson.com/csv2json/upload      # 410
   curl -s -o /dev/null -w '%{http_code}\n' https://csvjson.com/csv2json/instrument  # 410

   # Unknown paths 404, hashed assets cache immutably:
   curl -s -o /dev/null -w '%{http_code}\n' https://csvjson.com/nope                 # 404
   curl -sI https://csvjson.com/assets/<fingerprinted>.js | grep -i cache-control    # immutable
   ```

   The full curl table lives in `.github/scripts/verify-shim.sh`.

2. **One real legacy permalink** — open a genuine `/<tool>/<32-hex-id>`
   bookmark (e.g. from a CSVJSON share link) and confirm the SPA hydrates
   the stored object from S3: the URL never changes and the data loads
   read-only.

3. **robots.txt and sitemap.xml** — `https://csvjson.com/robots.txt` and
   `https://csvjson.com/sitemap.xml` return 200 with the committed content.

4. **SEO** — view source on `/` and confirm the prerendered HTML is in the
   initial response (title, description, FAQ, `SoftwareApplication` JSON-LD
   — the `.github/scripts/verify-seo.sh` targets). Check
   https://search.google.com/test/rich-results if you want crawler-eye view.

5. **Converter round trip** — paste a CSV, convert, flip direction, convert
   back, and hydrate one permalink in the browser.

## Rollback

Heroku releases are immutable. `heroku rollback` (or dashboard → Activity →
Roll back to) restores the previous release — the old CodeIgniter slug —
instantly, since it only re-points the release; no rebuild. The new tree
makes rollback trivial: the entire legacy app it replaced is whatever the
previous release was.

If the bad deploy came through the release branch, fix forward on a new
commit rather than force-pushing the branch.

## Post-cutover SEO monitoring

With Search Console's baseline in hand (step 0 above), measure after
cutover:

- **Week-2 checkpoint** — compare Search Console URL coverage and query
  rankings against the baseline export. No action threshold yet; this is
  the early-warning read.
- **Week-4 checkpoint** — the decision point. Two things to check:

  1. **Coverage:** legacy tool URLs (`/csv2json`, `/json2csv`, and the
     rest of the 301 map) must show as **"Page is redirected"** in
     coverage — that is the healthy state. Any of them showing as errors
     (not-found, excluded, soft-404) is a cutover defect, not a ranking
     signal, and gets fixed before anything else.
  2. **Query rankings** for the core-tool queries (`csv to json`,
     `json to csv`) versus the baseline.

- **Trigger:** a sustained >20% drop on the core-tool queries at the
  week-4 checkpoint is the trigger to revisit. The recovery play is
  **dedicated landing pages for those intents** — not undoing the
  redirects. The redirects stay: undoing them would resurrect retired
  tool URLs pointing at pages that no longer exist, which trades a
  ranking dip for a genuinely broken site.
- **Expected loss, not a trigger:** satellite-tool query traffic
  (`sql to json`, `data janitor`) is expected to drop, since the content
  those queries matched no longer exists. That is the already-locked
  product decision to consolidate on one converter; it is not a
  regression to react to.

## What does not change

- **DNS / SSL** — untouched. Cloudflare already proxies csvjson.com to the
  app's heroku-router hostname (confirmed by the DNS trace); the same app,
  origin, and certificates keep serving the domain.
- **Docroot gate** — because the default docroot is the repo root, every
  newly committed real file is publicly reachable on csvjson.com unless the
  `.htaccess` deny list (and its mirror in `index.php`) covers it. Anything
  committed at the root in future must either be public by design or added
  to both deny lists.
- **Heroku app identity** — same app name, same config vars, same add-ons.
- **Legacy permalink storage** — objects stay in S3 and are fetched
  read-only by the browser; the server never touches them.

## Notes

- If `composer.json` were ever emptied to `{}` (no `require` section), the
  buildpack would still auto-detect, but Heroku would assign its latest PHP
  (8.x major at deploy time) instead of the pinned 8.3 line — and a lock
  file would not be required. The committed lock pins 8.3 deliberately.
- PHP version compatibility: the shim targets PHP 8.3 (`declare(strict_types=1)`,
  no deprecated constructs) and is lint-checked with `php -l` on 8.3 in CI.
