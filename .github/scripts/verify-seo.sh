#!/usr/bin/env bash
# Spec criterion 10: the built index.html must carry the whole SEO surface in
# its initial HTML — crawlers never execute JavaScript. Serves the build over
# HTTP, curls it, and greps for every on-page target. Any miss fails the CI
# run.
set -uo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/../../app" || exit 1

PORT=${SEO_CHECK_PORT:-8642}
OUT=$(mktemp)
SERVER_PID=""
cleanup() {
  [ -n "$SERVER_PID" ] && kill "$SERVER_PID" 2>/dev/null
  rm -f "$OUT"
}
trap cleanup EXIT

python3 -m http.server "$PORT" --directory dist >/dev/null 2>&1 &
SERVER_PID=$!
for _ in $(seq 1 40); do
  curl -sf "http://localhost:$PORT/" -o "$OUT" && break
  sleep 0.25
done
if ! [ -s "$OUT" ]; then
  echo "::error::Could not fetch the built index.html over HTTP"
  exit 1
fi

fail=0
check() {
  local label="$1" pattern="$2"
  if ! grep -qF -- "$pattern" "$OUT"; then
    echo "::error::SEO check failed: built index.html is missing: $pattern"
    fail=1
  fi
}

# On-page targets (spec: SEO — prerender at build).
check "<h1> element" "<h1"
check "H1 copy naming both directions" "CSV to JSON and JSON to CSV converter"
check "title" "CSV to JSON Converter — CSVJSON"
check "meta description" 'name="description"'
check "og:title" 'property="og:title"'
check "og:description naming both directions" 'Convert CSV to JSON and JSON to CSV right in your browser. Supports TSV'
check "canonical to /" '<link rel="canonical" href="https://www.csvjson.com/" />'

# The prerender must actually have produced markup, not an empty shell.
# Collapsed FAQ + option hints — content must ship in the initial DOM
# (spec: SEO disclosure pattern; the click only toggles visibility).
check "FAQ trigger line" "How it works &amp; FAQ"
check "FAQ how-it-works question" "How does it work?"
check "FAQ TSV vs CSV section" "TSV vs CSV"
check "FAQ privacy copy" "The conversion runs entirely in your browser"
check "option hint copy (parse numbers)" "it turns 00721 into 7"

# Launch-week banner ships in the initial HTML too (spec: full-width
# feedback banner above the TopBar). Canonical URL lives in
# app/src/components/FeedbackBanner.tsx (FEEDBACK_DISCUSSION_URL).
check "feedback banner copy" "Enjoy a cleaner, simpler CSVJSON"
check "feedback banner link to discussion #163" "https://github.com/FlatFilers/csvjson-app/discussions/163"

# Analytics restored for launch (David, 2026-09-01 — criterion 8 amended):
# the restored Google Ads gtag tag and Plausible must ship in the prerendered
# head, and the dead Universal Analytics ID must never come back. Plausible
# MUST be manual mode (script.manual.js) — the auto-tracking script.js would
# double every visit, because the app fires its own single pageview on mount.
check "gtag.js loader with legacy Ads ID" "googletagmanager.com/gtag/js?id=AW-831825021"
check "Google Ads gtag config" 'gtag("config", "AW-831825021")'
check "Plausible data-domain" 'data-domain="csvjson.com"'
check "Plausible manual-mode script" "https://plausible.io/js/script.manual.js"
if grep -qF 'https://plausible.io/js/script.js"' "$OUT"; then
  echo "::error::SEO check failed: auto-tracking Plausible script.js shipped — manual mode (script.manual.js) required to avoid double-counted pageviews"
  fail=1
fi
if grep -qF "UA-46942708-1" "$OUT"; then
  echo "::error::SEO check failed: dead Universal Analytics ID UA-46942708-1 must never ship"
  fail=1
fi

# Structured data (spec: SEO — structured data).
check "JSON-LD SoftwareApplication" '"@type": "SoftwareApplication"'
check "JSON-LD FAQPage" '"@type":"FAQPage"'
if ! grep -qF '<div id="root"><' "$OUT"; then
  echo "::error::SEO check failed: #root is empty in the built index.html — prerender did not run"
  fail=1
fi

if [ "$fail" -eq 0 ]; then
  echo "SEO check passed — $(wc -c < "$OUT") bytes of prerendered HTML"
fi
exit "$fail"
