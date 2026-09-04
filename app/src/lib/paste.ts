/**
 * Global paste routing helper. The document-level paste listener routes a
 * paste into the converter input only when no editable control or output
 * surface owns the event:
 * - text inputs and textareas (native caret-context paste),
 * - contenteditable hosts — CodeMirror's editable .cm-content included
 *   (checked via isContentEditable AND the explicit attribute, because
 *   jsdom implements neither across the ancestor chain),
 * - the CodeMirror editor surface itself (.cm-editor), which also covers
 *   the read-only output view — its content is contenteditable=false, so
 *   a paste made over the output must stay local, never silently rewrite
 *   the input,
 * - the output pane at large (chrome, CSV table view) for the same reason.
 */
export function isEditablePasteTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA") return true;
  return (
    target.closest('.cm-editor, [data-testid="output-pane"], [contenteditable="true"]') !==
    null
  );
}
