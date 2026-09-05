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

/**
 * Upload decodings offered in the options row (spec B7 — issue #106).
 * windows-1252 covers Excel's legacy CSV export, whose accented bytes
 * (ü = 0xFC, ö = 0xF6) show as mojibake when read as UTF-8.
 */
export const UPLOAD_ENCODINGS = [
  { value: "utf-8", label: "UTF-8" },
  { value: "windows-1252", label: "Windows-1252" },
] as const;

export type UploadEncoding = (typeof UPLOAD_ENCODINGS)[number]["value"];

/**
 * Decodes an uploaded file's bytes under a selectable TextDecoder label
 * (spec B7 — issue #106; the old FileReader.readAsText was hardwired to
 * UTF-8). `fatal: false` substitutes U+FFFD for bytes the chosen label
 * cannot map instead of throwing, so a mislabeled encoding degrades
 * visibly in the converted output but never blocks the upload. The
 * default "utf-8" label matches readAsText exactly — including stripping
 * a leading UTF-8 BOM — so existing uploads are byte-for-byte unchanged.
 */
export async function decodeUpload(
  file: File,
  encoding: UploadEncoding
): Promise<string> {
  const bytes = await file.arrayBuffer();
  return new TextDecoder(encoding, { fatal: false }).decode(bytes);
}
