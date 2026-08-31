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
