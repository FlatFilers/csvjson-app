/**
 * Global paste routing helper. The document-level paste listener routes a
 * paste into the converter input only when an editable control owns the
 * event:
 * - text inputs and textareas (native caret-context paste),
 * - contenteditable hosts — CodeMirror's editable .cm-content included
 *   (checked via isContentEditable AND the explicit attribute, because
 *   jsdom implements neither across the ancestor chain).
 *
 * Everything else routes. The output pane is editable only in its editing
 * window (valid CSV→JSON result, or while edited): there its .cm-content is
 * contenteditable=true and a paste edits the output in place, marking it
 * edited. Every other output surface stays routed — pane chrome
 * ([data-surface="output"] outside the editor), the CSV table, and the
 * read-only retained result (contenteditable=false): those have no local
 * editable target, so leaving them unrouted would silently swallow the
 * paste (Sep 5 feedback). Routing replaces the input, exactly like a
 * body-level paste.
 */
export function isEditablePasteTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA") return true;
  return target.closest('[contenteditable="true"]') !== null;
}
