/**
 * Clipboard with an execCommand fallback (spec: Browser / platform).
 * Returns whether a copy landed — the caller decides the toast.
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Clipboard API denied or unavailable — fall through to execCommand.
  }
  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    // Keep it off-screen but rendered — display:none breaks execCommand.
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand("copy");
    textarea.remove();
    return copied;
  } catch {
    return false;
  }
}
