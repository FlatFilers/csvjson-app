#!/usr/bin/env bash
# Spec criterion 7: every dead old URL 301s per the redirect table; legacy
# permalinks pass through to the SPA unredirected; removed endpoints are
# gone; unknown paths 404. Also exercises the dist-asset serving path:
# hashed-asset caching, traversal refusal, missing-asset 404s.
# Runs the PHP shim under its dev server and curls every row of the map.
set -uo pipefail
cd "$(dirname "$0")/../.."

# Minimal stand-in for the built SPA so the passthrough routes have
# something to serve (the real build is produced by the app CI job).
mkdir -p app/dist/assets
printf '<!doctype html><html><body>spa</body></html>' > app/dist/index.html
printf 'console.log("test asset")' > app/dist/assets/test-abcdefgh1234.js

php -S 127.0.0.1:8080 index.php >/tmp/php-server.log 2>&1 &
server_pid=$!
trap 'kill "$server_pid" 2>/dev/null || true' EXIT

for _ in $(seq 1 50); do
  curl -s -o /dev/null "http://127.0.0.1:8080/" && break
  sleep 0.2
done

fail=0

expect_redirect() { # $1 = path
  local res
  res=$(curl -s -o /dev/null -w '%{http_code} %{redirect_url}' "http://127.0.0.1:8080$1")
  if [[ "$res" == "301 http://127.0.0.1:8080/" ]]; then
    echo "ok: $1 -> 301 /"
  else
    echo "FAIL: $1 -> expected 301 to /, got: $res"
    fail=1
  fi
}

expect_status() { # $1 = path, $2 = expected status
  local code
  code=$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:8080$1")
  if [[ "$code" != "$2" ]]; then
    echo "FAIL: $1 -> expected $2, got $code"
    fail=1
  else
    echo "ok: $1 -> $2"
  fi
}

# Every retired tool root and sub-route 301s to / (spec redirect table).
for tool in csv2json json2csv json_validator json_beautifier sql2json csvjson2json datajanitor; do
  expect_redirect "/$tool"
  expect_redirect "/$tool/sub/route"
done
expect_redirect /dataclean
expect_redirect /dataclean/help

# Legacy permalinks are NOT redirected — the SPA hydrates them (200).
expect_status /csv2json/0123456789abcdef0123456789abcdef 200
expect_status /datajanitor/0123456789abcdef0123456789abcdef 200

# Removed endpoints are gone outright.
expect_status /csv2json/instrument 410
expect_status /csv2json/upload 410
expect_status /json2csv/upload 410

# The root serves the SPA shell; unknown paths 404.
expect_status / 200
if ! curl -s http://127.0.0.1:8080/ | grep -q spa; then
  echo "FAIL: / did not serve the SPA shell"
  fail=1
fi
expect_status /nope 404

# Dist-asset serving: hashed assets cache immutably, traversal out of
# app/dist is refused, missing assets 404 instead of hitting the shell.
expect_status /assets/test-abcdefgh1234.js 200
immutable=$(curl -s -o /dev/null -D - http://127.0.0.1:8080/assets/test-abcdefgh1234.js | tr -d '\r' | grep -i '^cache-control:')
if [[ "$immutable" == *immutable* ]]; then
  echo "ok: hashed asset caches immutable"
else
  echo "FAIL: hashed asset missing immutable cache header, got: $immutable"
  fail=1
fi
expect_status /assets/missing.js 404

traversal=$(curl -s -o /dev/null -w '%{http_code}' --path-as-is "http://127.0.0.1:8080/assets/..%2f..%2findex.php")
if [[ "$traversal" != "404" ]]; then
  echo "FAIL: traversal /assets/..%2f..%2findex.php -> expected 404, got $traversal"
  fail=1
else
  echo "ok: traversal attempt refused"
fi

if [[ $fail -eq 0 ]]; then
  echo "All redirect-table checks passed"
else
  echo "Redirect-table checks FAILED"
  exit 1
fi
