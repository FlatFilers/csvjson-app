/**
 * Text-file gate for uploads (spec: Drag-over — dropping a non-text file
 * rejects inline, state unchanged). Browsers report empty types for some
 * .csv files, so the extension list covers that case.
 */
const TEXT_EXTENSION = /\.(csv|tsv|txt|json|ndjson|md|log)$/i;

export function isTextFile(file: File): boolean {
  if (file.type === "") return TEXT_EXTENSION.test(file.name);
  return file.type.startsWith("text/") || file.type === "application/json";
}
