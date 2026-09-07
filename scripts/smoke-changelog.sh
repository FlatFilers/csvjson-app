#!/usr/bin/env bash
# Smoke-test the changelog vote endpoint against a real Postgres (spec: CSVJSON
# changelog widget, art_YzASNds2). Boots the PHP shim under its dev server on
# 8092 (with DATABASE_URL) and 8093 (without, for the 503 path), then curls
# the full validation matrix and inspects rows directly: one row per
# (client_id, entry_id), a duplicate vote upserting rather than inserting,
# a vote change updating in place, the rate limit tripping, and the admin
# readout rendering.
#
# The endpoint shares the feedback_write_log rate-limit table with
# /api/feedback, and the log is per-database — so this script provisions its
# own disposable changelog_smoke database and never spends the feedback
# smoke's per-IP write budget.
#
# Requires DATABASE_URL (a Postgres server whose credentials allow CREATE
# DATABASE; the database itself is replaced), FEEDBACK_SALT and ADMIN_TOKEN.
set -uo pipefail
cd "$(dirname "$0")/.."

: "${DATABASE_URL:?DATABASE_URL must point at a disposable Postgres server}"
: "${FEEDBACK_SALT:?FEEDBACK_SALT must be set}"
: "${ADMIN_TOKEN:?ADMIN_TOKEN must be set}"

fail=0
check() { # $1 description, $2 actual, $3 expected
  if [[ "$2" == "$3" ]]; then
    echo "ok: $1 ($2)"
  else
    echo "FAIL: $1 — expected $3, got $2"
    fail=1
  fi
}

# rowstate <client> <entry> → "count,vote" ("" when absent). Inspecting the
# table directly is how the upsert criteria are proven: HTTP 204 alone cannot
# distinguish a fresh row from an updated one.
rowstate() {
  CHANGELOG_URL="$CHANGELOG_URL" php -r '
    $p = parse_url(getenv("CHANGELOG_URL"));
    $pdo = new PDO(
      sprintf("pgsql:host=%s;port=%d;dbname=%s", $p["host"], $p["port"] ?? 5432, trim($p["path"], "/")),
      $p["user"] ?? null,
      $p["pass"] ?? null,
      [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );
    $stmt = $pdo->prepare("SELECT COUNT(*), COALESCE(MAX(vote)::text, \x27\x27) FROM changelog_votes WHERE client_id = ? AND entry_id = ?");
    $stmt->execute([$argv[1], (int) $argv[2]]);
    echo implode(",", $stmt->fetch(PDO::FETCH_NUM));
  ' "$1" "$2"
}

# A disposable changelog_smoke database on the same Postgres server (same
# credentials; the path is swapped for the maintenance database). The CI
# runner has pdo_pgsql through setup-php but no psql client, so PHP does it.
php -r '
  $p = parse_url(getenv("DATABASE_URL"));
  $pdo = new PDO(
    sprintf("pgsql:host=%s;port=%d;dbname=postgres", $p["host"], $p["port"] ?? 5432),
    $p["user"] ?? null,
    $p["pass"] ?? null,
    [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
  );
  $pdo->exec("DROP DATABASE IF EXISTS changelog_smoke");
  $pdo->exec("CREATE DATABASE changelog_smoke");
'
# Point the shim (and the row-level asserts below) at the fresh database:
# its own write log keeps the rate-limit asserts deterministic and the
# feedback smoke's per-IP budget untouched.
export DATABASE_URL="${DATABASE_URL%/*}/changelog_smoke"
CHANGELOG_URL="$DATABASE_URL"

php -S 127.0.0.1:8092 index.php >/tmp/smoke-changelog-php-db.log 2>&1 &
pid_db=$!
env -u DATABASE_URL php -S 127.0.0.1:8093 index.php >/tmp/smoke-changelog-php-nodb.log 2>&1 &
pid_nodb=$!
trap 'kill "$pid_db" "$pid_nodb" 2>/dev/null || true' EXIT

for _ in $(seq 1 50); do
  curl -s -o /dev/null "http://127.0.0.1:8092/robots.txt" && break
  sleep 0.2
done

# Same-origin POST: the Origin host must match the server's HTTP_HOST,
# which under the dev server is 127.0.0.1:<port> (the real site serves
# www.csvjson.com, where browsers send that as the Origin).
post() { # $1 base url, $2 json body
  curl -s -o /dev/null -w '%{http_code}' -X POST "$1/api/changelog-vote" \
    -H 'Content-Type: application/json' \
    -H "Origin: $1" \
    -d "$2"
}

CLIENT_A='11111111-7b31-4c56-9d8e-0a4b2c3d4e5f'
CLIENT_B='22222222-7b31-4c56-9d8e-0a4b2c3d4e5f'
UP_A='{"clientId":"'"$CLIENT_A"'","entryId":1,"vote":1}'

# Happy path lands in Postgres.
check "valid upvote" "$(post http://127.0.0.1:8092 "$UP_A")" 204
check "vote recorded" "$(rowstate "$CLIENT_A" 1)" "1,1"

# Duplicate vote: same client, same entry — the row upserts, never duplicates.
check "duplicate vote accepted" "$(post http://127.0.0.1:8092 "$UP_A")" 204
check "duplicate still one row" "$(rowstate "$CLIENT_A" 1)" "1,1"

# Vote change: same pair, the other thumb — updated in place.
check "vote change accepted" "$(post http://127.0.0.1:8092 '{"clientId":"'"$CLIENT_A"'","entryId":1,"vote":-1}')" 204
check "vote change updated the row" "$(rowstate "$CLIENT_A" 1)" "1,-1"

# A second browser is a second row: the unique pair is (client, entry).
check "second client accepted" "$(post http://127.0.0.1:8092 '{"clientId":"'"$CLIENT_B"'","entryId":1,"vote":1}')" 204
check "second client is its own row" "$(rowstate "$CLIENT_B" 1)" "1,1"

# Validation failures never reach the database.
check "malformed JSON body" "$(post http://127.0.0.1:8092 '{bad json')" 400
check "invalid vote value" "$(post http://127.0.0.1:8092 '{"clientId":"'"$CLIENT_A"'","entryId":1,"vote":5}')" 422
check "missing entryId" "$(post http://127.0.0.1:8092 '{"clientId":"'"$CLIENT_A"'","vote":1}')" 422
check "zero entryId" "$(post http://127.0.0.1:8092 '{"clientId":"'"$CLIENT_A"'","entryId":0,"vote":1}')" 422
check "string entryId" "$(post http://127.0.0.1:8092 '{"clientId":"'"$CLIENT_A"'","entryId":"1","vote":1}')" 422
check "entryId beyond the cap" "$(post http://127.0.0.1:8092 '{"clientId":"'"$CLIENT_A"'","entryId":1000001,"vote":1}')" 422
check "non-UUID clientId" "$(post http://127.0.0.1:8092 '{"clientId":"not-a-uuid","entryId":1,"vote":1}')" 422
check "cross-origin POST" "$(curl -s -o /dev/null -w '%{http_code}' -X POST http://127.0.0.1:8092/api/changelog-vote -H 'Content-Type: application/json' -H 'Origin: https://evil.example' -d '{"clientId":"'"$CLIENT_A"'","entryId":1,"vote":1}')" 403
check "GET on the endpoint" "$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8092/api/changelog-vote)" 405

# Rate limits: 4 writes so far from this IP (3 changes above + the second
# client); 6 more are allowed, and the 11th write inside 24h is refused.
for _ in $(seq 1 6); do
  post http://127.0.0.1:8092 "$UP_A" >/dev/null
done
check "11th write inside 24h" "$(post http://127.0.0.1:8092 "$UP_A")" 429

# No DATABASE_URL configured — the endpoint degrades loudly, not silently.
check "missing database config" "$(post http://127.0.0.1:8093 "$UP_A")" 503

# Admin readout: the changelog section renders under the same auth/noindex
# discipline as the feedback sections.
check "admin without credentials" "$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8092/feedback-admin)" 401
check "admin with wrong token" "$(curl -s -o /dev/null -w '%{http_code}' -u 'admin:wrong-token' http://127.0.0.1:8092/feedback-admin)" 401
admin_headers=$(curl -s -D - -o /dev/null -u "admin:$ADMIN_TOKEN" http://127.0.0.1:8092/feedback-admin)
check "admin with ADMIN_TOKEN" "$(printf '%s' "$admin_headers" | head -1 | awk '{print $2}')" 200
if printf '%s' "$admin_headers" | grep -qi '^x-robots-tag: *noindex'; then
  echo "ok: admin page sends X-Robots-Tag: noindex"
else
  echo "FAIL: admin page missing X-Robots-Tag: noindex"
  fail=1
fi
admin_body=$(curl -s -u "admin:$ADMIN_TOKEN" http://127.0.0.1:8092/feedback-admin)
printf '%s\n' "$admin_body" | grep -q 'Changelog votes' \
  || { echo "FAIL: admin page missing the Changelog votes section"; fail=1; }
printf '%s\n' "$admin_body" | grep -q 'Entry #1' \
  || { echo "FAIL: admin page missing the per-entry changelog totals"; fail=1; }
[[ $fail -eq 0 ]] && echo "ok: admin page carries the changelog readout"

if [[ $fail -eq 0 ]]; then
  echo "All changelog smoke checks passed"
else
  echo "Changelog smoke checks FAILED"
  exit 1
fi
