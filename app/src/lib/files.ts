/**
 * Text-file gate for uploads (spec: Drag-over — dropping a non-text file
 * rejects inline, state unchanged). Browsers report empty types for some
 * .csv files, and older Excel saves put non-text MIME types on .csv files
 * (e.g. application/vnd.ms-excel) — the extension list covers both.
 */
const TEXT_EXTENSION = /\.(csv|tsv|txt|json|ndjson|md|log)$/i;

export function isTextFile(file: File): boolean {
  if (file.type.startsWith("text/") || file.type === "application/json") {
    return true;
  }
  return TEXT_EXTENSION.test(file.name);
}
