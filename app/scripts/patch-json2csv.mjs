/**
 * Patch csvjson-json2csv@1.0.3 (two fixes):
 *
 * 1. Declare `keyValues`.
 *
 *    The package assigns `keyValues = []` without a declaration — an implicit
 *    global that Node tolerates in sloppy mode but that throws
 *    `ReferenceError: keyValues is not defined` in a strict-mode ESM bundle,
 *    i.e. in the shipped browser build (the legacy site loaded the same code
 *    as a classic script, so it never hit this). A one-token declaration fix.
 *
 * 2. Quote object/array cell values with RFC-4180 doubled quotes.
 *
 *    Top-level string values already serialize with `""` doubling, but object
 *    and array values were backslash-escaped (`\"`) inside the wrapping
 *    quotes — not RFC 4180. The app's own preview parser (parseCsvTable) and
 *    the csvjson-csv2json package both read `""` doubling, so backslash-
 *    escaped nested JSON shifted every subsequent preview cell and the lib
 *    could not round-trip its own output. Doubling the quotes fixes the
 *    bytes; the `.replace(/\n/g, '\\n')` is dropped for the same reason —
 *    plain strings in non-variant mode keep embedded newlines literal inside
 *    the quoted field, so object/array values must behave the same (the
 *    output_csvjson_variant dialect keeps its own escaping and is untouched).
 *
 * Wired as the app's `postinstall` so CI's fresh `npm ci` gets the patch.
 * Idempotent; fails loudly if the file or a pattern is missing.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const pkg = path.join(
  fileURLToPath(new URL("..", import.meta.url)),
  "node_modules/csvjson-json2csv/json2csv.js"
);

let source;
try {
  source = readFileSync(pkg, "utf8");
} catch {
  console.error(`patch-json2csv: cannot read ${pkg}`);
  process.exit(1);
}

let patched = source;

// Fix 1: declare `keyValues`.
if (patched.includes("var keyValues = [];")) {
  console.log("patch-json2csv: keyValues already declared");
} else if (patched.includes("keyValues = [];")) {
  patched = patched.replace("    keyValues = [];", "    var keyValues = [];");
  console.log("patch-json2csv: declared keyValues in csvjson-json2csv/json2csv.js");
} else {
  console.error("patch-json2csv: expected `keyValues = [];` not found — package changed upstream, investigate before shipping");
  process.exit(1);
}

// Fix 2: RFC-4180 doubled quotes for object/array values (non-variant branch).
// String.raw so the package's own escaping can be written verbatim.
const BACKSLASH_ESCAPED = String.raw`row[key] = '"' + row[key].replace(/"/g, '\\"').replace(/\n/g, '\\n') + '"';`;
const DOUBLED_QUOTES = String.raw`row[key] = '"' + row[key].replace(/"/g, '""') + '"';`;

if (patched.includes(DOUBLED_QUOTES)) {
  console.log("patch-json2csv: object/array quoting already RFC-4180");
} else if (patched.includes(BACKSLASH_ESCAPED)) {
  patched = patched.replace(BACKSLASH_ESCAPED, DOUBLED_QUOTES);
  console.log("patch-json2csv: object/array cell values now use RFC-4180 doubled quotes (newlines stay literal, matching plain strings)");
} else {
  console.error("patch-json2csv: expected backslash-escaped object quoting not found — package changed upstream, investigate before shipping");
  process.exit(1);
}

if (patched !== source) writeFileSync(pkg, patched);
