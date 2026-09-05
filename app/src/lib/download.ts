/**
 * Client-side file download. CSV downloads carry a UTF-8 BOM — that is what
 * keeps Excel from mangling accented characters, matching the legacy tool's
 * bindDownload (js/src/main.js). Nothing ever touches the network.
 */

export const UTF8_BOM = "\uFEFF";

/** The text with a BOM prepended when `bom` is set (CSV downloads). */
export function withUtf8Bom(text: string, bom: boolean): string {
  return bom ? UTF8_BOM + text : text;
}

export function buildDownloadBlob(text: string, mime: string, bom: boolean): Blob {
  const content = withUtf8Bom(text, bom);
  return new Blob([content], { type: `${mime};charset=utf-8` });
}

/**
 * Extensions the converter recognizes as data sources (.txt is an accepted
 * upload type). A stacked name like "report.csv.json" must not leak a stale
 * data extension into the derived output name.
 */
const DATA_EXTENSIONS = new Set(["csv", "tsv", "json", "txt"]);

function baseName(source: string): string {
  // Strip data extensions from the right, so "report.csv.json" reduces to
  // "report" rather than keeping the mismatched ".csv" in the middle. The
  // dot <= 0 guard keeps dotfiles (".env") whole — the leading dot is a
  // name, not an extension separator.
  let base = source;
  for (;;) {
    const dot = base.lastIndexOf(".");
    if (dot <= 0) break;
    if (dot === base.length - 1) {
      // A trailing bare dot ("data.") is punctuation, not an extension —
      // drop it so the target extension lands cleanly ("data.json").
      base = base.slice(0, dot);
      continue;
    }
    if (!DATA_EXTENSIONS.has(base.slice(dot + 1).toLowerCase())) break;
    base = base.slice(0, dot);
  }
  return base;
}

/**
 * The output download's filename: the source file's base name with the
 * target extension swapped on (aaa.csv → aaa.json, ccc.tsv → ccc.json).
 * Pasted input has no source name, so it falls back to data.json /
 * data.csv (issues #79, #102).
 */
export function outputFilenameFor(
  source: string | null,
  direction: "csv2json" | "json2csv"
): string {
  const ext = direction === "csv2json" ? "json" : "csv";
  if (!source) return `data.${ext}`;
  return `${baseName(source)}.${ext}`;
}

/** Trigger a browser download for the given text. Returns the filename used. */
export function downloadText(
  text: string,
  filename: string,
  { mime = "text/plain", bom = false }: { mime?: string; bom?: boolean } = {}
): string {
  const blob = buildDownloadBlob(text, mime, bom);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // The download starts synchronously on click; revoking on the next tick
  // keeps Safari from cancelling an in-flight save.
  setTimeout(() => URL.revokeObjectURL(url), 0);
  return filename;
}
