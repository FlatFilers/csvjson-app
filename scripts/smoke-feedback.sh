#!/usr/bin/env bash
# Smoke-test the feedback vote endpoint against a real Postgres (spec: CSVJSON
# feedback votes, art_2AdAvo34). Boots the PHP shim under its dev server on
# 8090 (with DATABASE_URL) and 8091 (without, for the 503 path), then curls
# the full validation matrix: success, validation, rate limits, auth, robots.
#
# Requires DATABASE_URL, FEEDBACK_SALT and ADMIN_TOKEN in the environment and
# a DISPOSABLE database — the per-IP rate limit makes the write-count asserts
# one-shot, so CI provisions a fresh service container per run.
set -uo pipefail
cd "$(dirname "$0")/.."

: "${DATABASE_URL:?DATABASE_URL must point at a disposable Postgres database}"
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

# Same-origin POST: the Origin host must match the server's HTTP_HOST,
# which under the dev server is 127.0.0.1:<port> (the real site serves
# www.csvjson.com, where browsers send that as the Origin).
post() { # $1 base url, $2 json body
  curl -s -o /dev/null -w '%{http_code}' -X POST "$1/api/feedback" \
    -H 'Content-Type: application/json' \
    -H "Origin: $1" \
    -d "$2"
}

php -S 127.0.0.1:8090 index.php >/tmp/smoke-php-db.log 2>&1 &
pid_db=$!
env -u DATABASE_URL php -S 127.0.0.1:8091 index.php >/tmp/smoke-php-nodb.log 2>&1 &
pid_nodb=$!
trap 'kill "$pid_db" "$pid_nodb" 2>/dev/null || true' EXIT

for _ in $(seq 1 50); do
  curl -s -o /dev/null "http://127.0.0.1:8090/robots.txt" && break
  sleep 0.2
done

# clientIds are UUID-shaped end to end (the widget generates UUIDs, and the
# endpoint only accepts hex-dash strings).
UP='{"clientId":"1f0a9d2c-7b31-4c56-9d8e-0a4b2c3d4e5f","vote":1,"path":"/"}'
DOWN='{"clientId":"1f0a9d2c-7b31-4c56-9d8e-0a4b2c3d4e5f","vote":-1,"reasonCode":"missing_feature","reasonText":"need xml output","path":"/"}'

# Happy paths land in Postgres.
check "valid upvote" "$(post http://127.0.0.1:8090 "$UP")" 204
check "downvote with reason" "$(post http://127.0.0.1:8090 "$DOWN")" 204

# Validation failures never reach the database.
check "malformed JSON body" "$(post http://127.0.0.1:8090 '{bad json')" 400
check "invalid vote value" "$(post http://127.0.0.1:8090 '{"clientId":"x","vote":5}')" 422
check "invalid reason enum" "$(post http://127.0.0.1:8090 '{"clientId":"x","vote":-1,"reasonCode":"because"}')" 422
check "downvote without required reason" "$(post http://127.0.0.1:8090 '{"clientId":"x","vote":-1}')" 422
check "oversize reason text" "$(post http://127.0.0.1:8090 "{\"clientId\":\"x\",\"vote\":-1,\"reasonCode\":\"other\",\"reasonText\":\"$(printf 'a%.0s' {1..501})\"}")" 422
check "cross-origin POST" "$(curl -s -o /dev/null -w '%{http_code}' -X POST http://127.0.0.1:8090/api/feedback -H 'Content-Type: application/json' -H 'Origin: https://evil.example' -d '{"clientId":"x","vote":1,"path":"/"}')" 403
check "GET on the endpoint" "$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8090/api/feedback)" 405

# Rate limits: this shell's IP has 2 writes so far; 8 more are allowed, the
# 11th within 24h is refused with 429.
for _ in $(seq 1 8); do
  post http://127.0.0.1:8090 "$UP" >/dev/null
done
check "11th write inside 24h" "$(post http://127.0.0.1:8090 "$UP")" 429

# No DATABASE_URL configured — the endpoint degrades loudly, not silently.
check "missing database config" "$(post http://127.0.0.1:8091 "$UP")" 503

# Admin page: Basic auth required, token checked with hash_equals.
check "admin without credentials" "$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8090/feedback-admin)" 401
check "admin with wrong token" "$(curl -s -o /dev/null -w '%{http_code}' -u 'admin:wrong-token' http://127.0.0.1:8090/feedback-admin)" 401
admin_headers=$(curl -s -D - -o /dev/null -u "admin:$ADMIN_TOKEN" http://127.0.0.1:8090/feedback-admin)
check "admin with ADMIN_TOKEN" "$(printf '%s' "$admin_headers" | head -1 | awk '{print $2}')" 200
if printf '%s' "$admin_headers" | grep -qi '^x-robots-tag: *noindex'; then
  echo "ok: admin page sends X-Robots-Tag: noindex"
else
  echo "FAIL: admin page missing X-Robots-Tag: noindex"
  fail=1
fi

# robots.txt keeps crawlers off the API and the admin page.
robots=$(curl -s http://127.0.0.1:8090/robots.txt)
printf '%s\n' "$robots" | grep -q 'Disallow: /api/' || { echo "FAIL: robots.txt missing 'Disallow: /api/'"; fail=1; }
printf '%s\n' "$robots" | grep -q 'Disallow: /feedback-admin/' || { echo "FAIL: robots.txt missing 'Disallow: /feedback-admin/'"; fail=1; }
[[ $fail -eq 0 ]] && echo "ok: robots.txt carries both Disallow lines"

if [[ $fail -eq 0 ]]; then
  echo "All feedback smoke checks passed"
else
  echo "Feedback smoke checks FAILED"
  exit 1
fi
