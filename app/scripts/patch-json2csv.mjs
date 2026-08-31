/**
 * Patch csvjson-json2csv@1.0.3: declare `keyValues`.
 *
 * The package assigns `keyValues = []` without a declaration — an implicit
 * global that Node tolerates in sloppy mode but that throws
 * `ReferenceError: keyValues is not defined` in a strict-mode ESM bundle,
 * i.e. in the shipped browser build (the legacy site loaded the same code
 * as a classic script, so it never hit this). This is a one-token
 * declaration fix; no conversion logic changes.
 *
 * Wired as the app's `postinstall` so CI's fresh `npm ci` gets the patch.
 * Idempotent; fails loudly if the file or pattern is missing.
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

if (source.includes("var keyValues = [];")) {
  console.log("patch-json2csv: already patched");
} else if (source.includes("keyValues = [];")) {
  writeFileSync(pkg, source.replace("    keyValues = [];", "    var keyValues = [];"));
  console.log("patch-json2csv: declared keyValues in csvjson-json2csv/json2csv.js");
} else {
  console.error("patch-json2csv: expected `keyValues = [];` not found — package changed upstream, investigate before shipping");
  process.exit(1);
}
