/**
 * Patch csvjson-csv2json@5.0.6 (issue #114 - silent quote loss on a
 * doubled-quote run abutting the record-closing quote).
 *
 * The PEG grammar itself resolves the run correctly: in `"ends ""x"""` the
 * final `""` before the closing quote parses as one escaped quote and the
 * field decodes to `ends "x"`. The loss happens right after, in convert()'s
 * per-field cleanup, a regex that strips stray leading/trailing quotes -
 * written for fields that fell back to unquoted parsing (e.g. `"Avery,12.50`
 * becomes `Avery`), it also eats a trailing quote that is PART of a
 * successfully decoded value: `ends "x"` becomes `ends "x`. The same regex
 * ran over the header cleanup, so a header decoding to a trailing quote
 * lost it identically.
 *
 * Fix: move the stray-quote strip out of convert() into the parser's
 * unquoted-fallback branch - the only place it is meaningful. Quoted-field
 * values (already fully decoded by the grammar) keep every character, and
 * fallback fields strip exactly as before (same trim-strip order). Header
 * cleanup trims only; fallback headers are stripped at the source.
 *
 * Wired as the app's `postinstall` (chained after patch-json2csv) so CI's
 * fresh `npm ci` gets the patch. Idempotent; fails loudly if the file or a
 * pattern is missing.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const pkg = path.join(
  fileURLToPath(new URL("..", import.meta.url)),
  "node_modules/csvjson-csv2json/csv2json.js"
);

let source;
try {
  source = readFileSync(pkg, "utf8");
} catch {
  console.error(`patch-csv2json: cannot read ${pkg}`);
  process.exit(1);
}

let patched = source;

// Quoted-branch field values stop losing their final character: drop the
// stray-quote strip from convert()'s per-field cleanup (trim stays - the
// smart parse-numbers rule relies on trimmed cells).
const VALUE_STRIP = `var value = (a[l][i]||'').trim().replace(/(^")|("$)/g, '');`;
const VALUE_TRIMMED = `var value = (a[l][i]||'').trim();`;

if (patched.includes(VALUE_TRIMMED)) {
  console.log("patch-csv2json: field cleanup already trim-only");
} else if (patched.includes(VALUE_STRIP)) {
  patched = patched.replace(VALUE_STRIP, VALUE_TRIMMED);
  console.log("patch-csv2json: convert() field cleanup no longer strips decoded values");
} else {
  console.error("patch-csv2json: expected field-cleanup regex not found - package changed upstream, investigate before shipping");
  process.exit(1);
}

// Header cleanup: same strip, same damage (a header decoding to a trailing
// quote lost it). Trim only now; fallback headers are stripped at the source.
const KEY_STRIP = `return key.trim().replace(/(^")|("$)/g, '');`;
const KEY_TRIMMED = `return key.trim();`;

if (patched.includes(KEY_TRIMMED)) {
  console.log("patch-csv2json: header cleanup already trim-only");
} else if (patched.includes(KEY_STRIP)) {
  patched = patched.replace(KEY_STRIP, KEY_TRIMMED);
  console.log("patch-csv2json: header cleanup no longer strips decoded headers");
} else {
  console.error("patch-csv2json: expected header-cleanup regex not found - package changed upstream, investigate before shipping");
  process.exit(1);
}

// The unquoted fallback branch keeps the stray-quote strip - fields that
// failed the quoted grammar carry raw artifacts like the failed opening
// quote. Same trim-strip order convert() used, so fallback behavior is
// byte-identical. (The quoted branch's action - the one passing
// (pos0, result0[1]) - is deliberately untouched: its text is final.)
const FALLBACK_PLAIN = `result0 = (function(offset, text) { return text.join(''); })(pos0, result0);`;
const FALLBACK_STRIPPED = `result0 = (function(offset, text) { return text.join('').trim().replace(/(^")|("$)/g, ''); })(pos0, result0);`;

if (patched.includes(FALLBACK_STRIPPED)) {
  console.log("patch-csv2json: fallback branch already strips stray quotes");
} else if (patched.includes(FALLBACK_PLAIN)) {
  patched = patched.replace(FALLBACK_PLAIN, FALLBACK_STRIPPED);
  console.log("patch-csv2json: stray-quote strip moved into the unquoted fallback branch");
} else {
  console.error("patch-csv2json: expected fallback action not found - package changed upstream, investigate before shipping");
  process.exit(1);
}

if (patched !== source) writeFileSync(pkg, patched);
