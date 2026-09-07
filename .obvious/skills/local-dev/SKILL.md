---
name: local-dev
description: Run CSVJSON (React/Vite SPA + PHP shim) locally in the repo sandbox — npm frontend, PHP built-in server, optional Postgres for the vote APIs, and verification steps.
---

# Local Dev — csvjson-app

Two halves, independently runnable: the React SPA in `app/` (most work happens here) and the PHP front controller at the repo root (SPA serving, redirects, the two vote APIs). No framework, no MariaDB — the legacy CodeIgniter stack is gone.

## Frontend (app/)

```bash
cd app
npm ci            # postinstall patches the conversion deps — never use plain npm install
npm run dev       # Vite dev server
npm test          # vitest (the primary local gate)
npm run lint && npx tsc -b --noEmit
npm run build     # tsc + vite build + prerender — app/dist is committed and hash-guarded in CI
```

If `app/src` changed, rebuild `app/dist` and commit it in the same PR; CI fails the parity check otherwise.

## PHP shim

```bash
php -l index.php feedback-db.php feedback-api.php feedback-admin.php changelog-db.php changelog-vote-api.php
php -S 127.0.0.1:8080 index.php   # serves the SPA + APIs; index.php is the router
```

Without `DATABASE_URL` every page works and both vote endpoints answer 503 — that is the designed degradation, not a bug.

## Vote APIs against real Postgres

Needs PHP 8.4 with pdo_pgsql and a reachable Postgres. Each smoke test wants its own **disposable** database (the per-IP rate limit makes their write-count asserts one-shot):

```bash
# feedback: database at DATABASE_URL must exist
sudo -u postgres psql -c "CREATE DATABASE feedback_smoke"
FEEDBACK_SALT=x ADMIN_TOKEN=x DATABASE_URL=postgres://postgres:pw@127.0.0.1:5432/feedback_smoke \
  bash scripts/smoke-feedback.sh

# changelog: provisions its own changelog_smoke database on the same server
FEEDBACK_SALT=x ADMIN_TOKEN=x DATABASE_URL=postgres://postgres:pw@127.0.0.1:5432/anything \
  bash scripts/smoke-changelog.sh
```

The sandbox Postgres superuser password may need (re)setting for TCP auth: `sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'pw'"`.

## Full verification ladder before pushing

1. `cd app && npm test` — all green (346+ as of the changelog PR)
2. `npm run lint && npx tsc -b --noEmit`
3. `npm run build` and commit `app/dist`
4. `bash .github/scripts/verify-seo.sh`
5. `php -l` over the six root PHP files
6. Both smoke tests against disposable databases
7. `bash .github/scripts/verify-shim.sh`
