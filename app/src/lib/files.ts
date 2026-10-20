/**
 * Text-file gate for uploads (spec: Drag-over — dropping a non-text file
 * rejects inline, state unchanged). Browsers report empty types for some
 * .csv files, and older Excel saves put non-text MIME types on .csv files
 * (e.g. application/vnd.ms-excel) — the extension list covers both.
 */
const TEXT_EXTENSION = /\.(csv|tsv|txt|json|jsonl|ndjson|md|log)$/i;

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
 *
 * Decoding streams through `file.stream()` so the event loop breathes
 * between chunks instead of holding one synchronous main-thread pass over
 * the whole file: `{ stream: true }` keeps partial multi-byte sequences
 * buffered across chunk boundaries, and the final zero-arg `decode()`
 * flushes the tail.
 */
export async function decodeUpload(
  file: File,
  encoding: UploadEncoding
): Promise<string> {
  const reader = file.stream().getReader();
  let decoded = "";
  try {
    const initialChunks: Uint8Array[] = [];
    let initialBytes = 0;
    while (initialBytes < 2) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value && value.byteLength > 0) {
        initialChunks.push(value);
        initialBytes += value.byteLength;
      }
    }

    let firstChunk: Uint8Array | null = null;
    if (initialChunks.length === 1) {
      firstChunk = initialChunks[0];
    } else if (initialChunks.length > 1) {
      firstChunk = new Uint8Array(initialBytes);
      let offset = 0;
      for (const chunk of initialChunks) {
        firstChunk.set(chunk, offset);
        offset += chunk.byteLength;
      }
    }

    let effectiveEncoding: string = encoding;
    if (encoding === "utf-8" && firstChunk && firstChunk.byteLength >= 2) {
      if (firstChunk[0] === 0xff && firstChunk[1] === 0xfe) {
        effectiveEncoding = "utf-16le";
      } else if (firstChunk[0] === 0xfe && firstChunk[1] === 0xff) {
        effectiveEncoding = "utf-16be";
      }
    }

    const decoder = new TextDecoder(effectiveEncoding, { fatal: false });
    if (firstChunk) {
      decoded += decoder.decode(firstChunk, { stream: true });
    }
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      decoded += decoder.decode(value, { stream: true });
    }
    return decoded + decoder.decode();
  } finally {
    reader.releaseLock();
  }
}
