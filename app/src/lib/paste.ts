/**
 * Global paste routing helper. The document-level paste listener routes a
 * paste into the converter input only when an editable control owns the
 * event:
 * - text inputs and textareas (native caret-context paste),
 * - contenteditable hosts — CodeMirror's editable input .cm-content
 *   included (checked via isContentEditable AND the explicit attribute,
 *   because jsdom implements neither across the ancestor chain).
 *
 * Everything else routes — including pastes over the read-only output
 * pane (CodeMirror view, CSV table, chrome). The output is not editable
 * (its .cm-content is contenteditable=false), so a paste over it has no
 * local target to receive the text: leaving it unrouted silently swallows
 * the paste (Sep 5 feedback). Routing replaces the input, exactly like a
 * body-level paste — nothing local can be corrupted because nothing
 * local is editable there.
 */
export function isEditablePasteTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA") return true;
  return target.closest('[contenteditable="true"]') !== null;
}
