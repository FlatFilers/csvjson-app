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
 * Also patches (B2, issue #110): the PEG grammar registers only , ; \t start
 * rules, so a forced pipe separator resolved to `pegjsSeparatorNames["|"] ===
 * undefined` and silently fell back to the default comma rule - pipe input
 * never split. The three start rules are byte-identical apart from the rule
 * name and the separator literal they set, so the patch clones the semicolon
 * rule as a pipe rule and registers it in the parse dispatch and the
 * separator→rule map. Detection (`separators` array) deliberately stays
 * , ; \t - pipe is explicit-only because prose is full of pipes.
 *
 * B5 (fixes #87 #95): the same cleanup also trimmed every field
 * unconditionally - RFC-4180 section 2.4 keeps leading/trailing spaces part
 * of the field, so " | " arrived as "|" and ", " as ",". The trim now hides
 * behind a `trim` option: the library default stays true (byte-identical
 * for every other consumer), and the app passes false. Both trim sites gate
 * on a module-scoped `trimFields` flag that convert() sets before parsing -
 * the PEG actions cannot see `options` (the parser IIFE closes only over
 * its own separator variable), so the flag follows the package's own
 * separator pattern. With trim off the unquoted-fallback branch still
 * strips the stray quotes #114 moved there - quote artifacts are parse
 * damage, not field content - it only stops trimming.
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
// B5: the trim itself becomes conditional (default stays true).
const VALUE_OPTIONAL = VALUE_TRIMMED.replace(
  "(a[l][i]||'').trim()",
  "trimFields ? (a[l][i]||'').trim() : (a[l][i]||'')"
);

if (patched.includes(VALUE_TRIMMED) || patched.includes(VALUE_OPTIONAL)) {
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

// B5 (fixes #87 #95): the gated forms derive from the constants above - no
// patched byte is duplicated here. The ternary is parenthesized: member
// access (.replace) binds tighter than ?:, so unparenthesized the else
// branch would swallow the .replace tail and the default path would lose
// the #114 stray-quote strip. Parenthesized, the strip wraps BOTH branches
// - quote artifacts are parse damage, not field content, on every path.
const FALLBACK_STRIPPED = `result0 = (function(offset, text) { return text.join('').trim().replace(/(^")|("$)/g, ''); })(pos0, result0);`;

const FALLBACK_OPTIONAL = FALLBACK_STRIPPED.replace(
  "return text.join('').trim()",
  "return (trimFields ? text.join('').trim() : text.join(''))"
);

if (patched.includes(FALLBACK_STRIPPED) || patched.includes(FALLBACK_OPTIONAL)) {
  console.log("patch-csv2json: fallback branch already strips stray quotes");
} else if (patched.includes(FALLBACK_PLAIN)) {
  patched = patched.replace(FALLBACK_PLAIN, FALLBACK_STRIPPED);
  console.log("patch-csv2json: stray-quote strip moved into the unquoted fallback branch");
} else {
  console.error("patch-csv2json: expected fallback action not found - package changed upstream, investigate before shipping");
  process.exit(1);
}

// B5 (fixes #87 #95): gate both trim sites behind a trim option. The flag
// lives in the module scope next to the separator list - the PEG actions
// close over it the way they close over `separator` - and convert() sets it
// from options before parsing. Default true: callers that never pass trim
// get today's behavior byte-for-byte.
const NAMES_OPEN = "pegjsSeparatorNames = {";
const NAMES_OPEN_FLAGGED = "trimFields = true,\n      pegjsSeparatorNames = {";

if (patched.includes(NAMES_OPEN_FLAGGED)) {
  console.log("patch-csv2json: trimFields flag already declared");
} else if (patched.includes(NAMES_OPEN)) {
  patched = patched.replace(NAMES_OPEN, NAMES_OPEN_FLAGGED);
  console.log("patch-csv2json: module-scope trimFields flag declared (default true)");
} else {
  console.error("patch-csv2json: expected pegjsSeparatorNames declaration not found - package changed upstream, investigate before shipping");
  process.exit(1);
}

const PARSE_CALL = "var a = csvParser.parse(csv, pegjsSeparatorNames[separator]);";
const PARSE_CALL_FLAGGED = "trimFields = options.trim === false ? false : true; " + PARSE_CALL;

if (patched.includes(PARSE_CALL_FLAGGED)) {
  console.log("patch-csv2json: convert() already sets trimFields");
} else if (patched.includes(PARSE_CALL)) {
  patched = patched.replace(PARSE_CALL, PARSE_CALL_FLAGGED);
  console.log("patch-csv2json: convert() sets trimFields from options before parsing");
} else {
  console.error("patch-csv2json: expected parser call not found - package changed upstream, investigate before shipping");
  process.exit(1);
}

if (patched.includes(FALLBACK_OPTIONAL)) {
  console.log("patch-csv2json: fallback trim already gated");
} else if (patched.includes(FALLBACK_STRIPPED)) {
  patched = patched.replace(FALLBACK_STRIPPED, FALLBACK_OPTIONAL);
  console.log("patch-csv2json: unquoted-fallback trim gated behind trimFields (quote strip kept)");
} else {
  console.error("patch-csv2json: expected fallback action not found - package changed upstream, investigate before shipping");
  process.exit(1);
}

if (patched.includes(VALUE_OPTIONAL)) {
  console.log("patch-csv2json: field trim already gated");
} else if (patched.includes(VALUE_TRIMMED)) {
  patched = patched.replace(VALUE_TRIMMED, VALUE_OPTIONAL);
  console.log("patch-csv2json: convert() field trim gated behind trimFields");
} else {
  console.error("patch-csv2json: expected field trim not found - package changed upstream, investigate before shipping");
  process.exit(1);
}

if (patched !== source) writeFileSync(pkg, patched);

// ---------------------------------------------------------------- B2 (#110)
// Clone the semicolon start rule as a pipe rule. The generated file is CRLF;
// the splice preserves that so the next patch cycle's anchors stay stable.
if (patched.includes("function parse_pipe()")) {
  console.log("patch-csv2json: pipe start rule already present");
} else {
  const semiDecl = "function parse_semicolon() {";
  const declIdx = patched.indexOf(semiDecl);
  const endMarker = "return result0;\r\n        }";
  const endIdx = declIdx === -1 ? -1 : patched.indexOf(endMarker, declIdx);
  if (declIdx === -1 || endIdx === -1) {
    console.error("patch-csv2json: semicolon start rule not found - package changed upstream, investigate before shipping");
    process.exit(1);
  }
  const block = patched.slice(declIdx, endIdx + endMarker.length);
  const pipeBlock = block
    .split("parse_semicolon").join("parse_pipe")
    .split("separator = ';'").join("separator = '|'");
  patched = patched
    .split(block)
    .join(block + "\r\n        \r\n        " + pipeBlock);
  console.log("patch-csv2json: pipe start rule cloned from the semicolon rule");
}

// Register the rule in the parse dispatch and the separator→rule map. The
// detection array (`separators = [",", ";", "\\t"]`) is deliberately NOT
// touched — pipe must never auto-detect (false positives on prose).
const TAB_ENTRY = `          "tab": parse_tab,`;
const TAB_WITH_PIPE = `          "tab": parse_tab,\r\n          "pipe": parse_pipe,`;
const NAMES_TAB = `        "\\t": "tab"`;
const NAMES_TAB_WITH_PIPE = `        "\\t": "tab",\r\n        "|": "pipe"`;

if (patched.includes(TAB_WITH_PIPE)) {
  console.log("patch-csv2json: parse dispatch already registers pipe");
} else if (patched.includes(TAB_ENTRY)) {
  patched = patched.split(TAB_ENTRY).join(TAB_WITH_PIPE);
  console.log("patch-csv2json: parse dispatch registers pipe");
} else {
  console.error("patch-csv2json: parse dispatch table not found - package changed upstream, investigate before shipping");
  process.exit(1);
}

if (patched.includes(NAMES_TAB_WITH_PIPE)) {
  console.log("patch-csv2json: separator map already maps pipe");
} else if (patched.includes(NAMES_TAB)) {
  patched = patched.split(NAMES_TAB).join(NAMES_TAB_WITH_PIPE);
  console.log("patch-csv2json: separator map maps | to the pipe rule");
} else {
  console.error("patch-csv2json: separator→rule map not found - package changed upstream, investigate before shipping");
  process.exit(1);
}

if (patched !== source) writeFileSync(pkg, patched);
