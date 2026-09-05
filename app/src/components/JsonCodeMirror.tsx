import { useCallback, useEffect, useRef } from "react";
import { Compartment, EditorState, type Extension } from "@codemirror/state";
import { EditorView, keymap, placeholder as cmPlaceholder } from "@codemirror/view";
import {
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab,
} from "@codemirror/commands";
import { json, jsonParseLinter } from "@codemirror/lang-json";
import { linter, type Diagnostic } from "@codemirror/lint";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags as t } from "@lezer/highlight";
import { cn } from "@/lib/utils";

/**
 * JSON.parse over a multi-MB document on every edit pause costs more than
 * the diagnostics return — above this size, lint is skipped (spec: Throttled
 * still applies; the editor stays responsive). Exported for the size-gate
 * editability tests.
 */
export const LINT_MAX_CHARS = 512 * 1024;
const sizeGatedJsonLinter = (view: EditorView): Diagnostic[] =>
  view.state.doc.length > LINT_MAX_CHARS ? [] : jsonParseLinter()(view);

/**
 * CodeMirror 6 JSON rendering for both panes (spec: JSON pane — CodeMirror 6
 * editor with JSON highlighting and lint; output side is the same renderer,
 * read-only). Token colors mirror the mockup palette (keys sky, strings
 * green, numbers amber, booleans purple) with dark variants for dark mode.
 *
 * One component, two roles fixed at mount: the input editor (editable, with
 * lint markers showing parse errors inline with position — spec: Errors) and
 * the read-only output view.
 */

function jsonHighlight(dark: boolean) {
  return HighlightStyle.define([
    { tag: t.propertyName, color: dark ? "#7dd3fc" : "#0369a1" },
    { tag: t.string, color: dark ? "#86efac" : "#15803d" },
    { tag: t.number, color: dark ? "#fcd34d" : "#b45309" },
    { tag: t.bool, color: dark ? "#d8b4fe" : "#7e22ce" },
    { tag: t.null, color: dark ? "#a1a1aa" : "#71717a" },
  ]);
}

const baseTheme = EditorView.theme({
  "&": { height: "100%", fontSize: "12.5px", backgroundColor: "transparent" },
  "&.cm-focused": { outline: "none" },
  ".cm-scroller": { fontFamily: "inherit", lineHeight: "1.6", overflow: "auto" },
  // The pane header is the chrome; the editor itself stays full-bleed.
  ".cm-gutters": { display: "none" },
  ".cm-activeLine": { backgroundColor: "transparent" },
  ".cm-content": { caretColor: "currentColor", fontFamily: "inherit" },
  ".cm-placeholder": { color: "var(--color-muted-foreground)" },
});

type JsonCodeMirrorProps = {
  value: string;
  /** Omitted → read-only output view. */
  onChange?: (value: string) => void;
  /**
   * Explicit editability override; defaults to `onChange !== undefined`.
   * Unlike a mount-time role, this may flip at runtime: the output editor
   * switches between editable (valid CSV→JSON result) and read-only
   * (retained invalid-input result) without remounting.
   */
  editable?: boolean;
  dark: boolean;
  placeholder?: string;
  testId?: string;
  className?: string;
  /** Test/editor hook: hands the mounted EditorView to the caller. */
  onReady?: (view: EditorView) => void;
};

export function JsonCodeMirror({
  value,
  onChange,
  editable,
  dark,
  placeholder,
  testId = "json-editor",
  className,
  onReady,
}: JsonCodeMirrorProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  // Keep the latest callback without rebuilding the editor on each render.
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const darkRef = useRef(dark);
  const themeCompartmentRef = useRef<Compartment | null>(null);
  const editabilityCompartmentRef = useRef<Compartment | null>(null);
  const editableProp = editable ?? onChange !== undefined;
  const wasEditableRef = useRef(editableProp);
  // True while the value-sync effect applies an external value: that
  // transaction must not echo back through the update listener as a user
  // edit — it would mark the output edited on every derived regeneration.
  const applyingExternalRef = useRef(false);

  // One extension bundle per role; the compartment swaps it at runtime.
  // Stable identity: it only touches refs, and the effects below key on it.
  const editabilityExtensions = useCallback(
    (canEdit: boolean): Extension[] =>
      canEdit
        ? [
            EditorView.updateListener.of((update) => {
              if (update.docChanged && !applyingExternalRef.current) {
                onChangeRef.current?.(update.state.doc.toString());
              }
            }),
            linter(sizeGatedJsonLinter, { delay: 300 }),
          ]
        : [EditorState.readOnly.of(true), EditorView.editable.of(false)],
    []
  );

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const themeCompartment = new Compartment();
    const editabilityCompartment = new Compartment();

    const state = EditorState.create({
      doc: value,
      extensions: [
        json(),
        EditorView.lineWrapping,
        history(),
        keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
        baseTheme,
        themeCompartment.of(syntaxHighlighting(jsonHighlight(dark))),
        editabilityCompartment.of(editabilityExtensions(editableProp)),
        ...(placeholder ? [cmPlaceholder(placeholder)] : []),
      ],
    });
    const view = new EditorView({ state, parent: host });
    themeCompartmentRef.current = themeCompartment;
    editabilityCompartmentRef.current = editabilityCompartment;
    onReady?.(view);
    viewRef.current = view;
    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // Mount-only: later role changes flow through the compartment below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // External value changes (example load, direction flip, clear, upload).
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    if (view.state.doc.toString() === value) return;
    applyingExternalRef.current = true;
    try {
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: value },
      });
    } finally {
      applyingExternalRef.current = false;
    }
  }, [value]);

  // Runtime editability swap (output editor: editable on a valid result,
  // read-only for a retained invalid-input result).
  useEffect(() => {
    const view = viewRef.current;
    const compartment = editabilityCompartmentRef.current;
    if (!view || !compartment) return;
    if (editableProp === wasEditableRef.current) return;
    wasEditableRef.current = editableProp;
    view.dispatch({
      effects: compartment.reconfigure(editabilityExtensions(editableProp)),
    });
  }, [editableProp, editabilityExtensions]);

  // Dark-mode token palette swap.
  useEffect(() => {
    const view = viewRef.current;
    if (!view || dark === darkRef.current) return;
    darkRef.current = dark;
    const compartment = themeCompartmentRef.current;
    if (!compartment) return;
    view.dispatch({ effects: compartment.reconfigure(syntaxHighlighting(jsonHighlight(dark))) });
  }, [dark]);

  return (
    <div
      data-testid={testId}
      // font-mono consumes the --font-mono theme token (index.css): JSON must
      // render fixed-width in the editor AND the read-only output, in both
      // themes. The CodeMirror content inherits it (fontFamily: inherit).
      className={cn("min-h-0 flex-1 overflow-hidden font-mono", className)}
      ref={hostRef}
    />
  );
}
