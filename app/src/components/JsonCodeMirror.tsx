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
/**
 * Above this size, skip the Lezer `json()` syntax parser so multi-megabyte
 * JSON strings mount in plain-text virtualized mode without blocking the main
 * thread for seconds.
 */
export const LARGE_DOC_MAX_CHARS = 512 * 1024;
/**
 * Above this size in read-only output mode, cap the in-editor document
 * preview to the first `LARGE_DOC_MAX_CHARS` characters (aligned to a line
 * boundary) and display a notice banner while Copy and Download still export
 * the complete output string.
 */
export const LARGE_OUTPUT_PREVIEW_MAX_CHARS = 2_000_000;

function slicePreviewOnLineBoundary(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  const lastNewline = text.lastIndexOf("\n", maxChars);
  if (lastNewline > maxChars * 0.5) {
    return text.slice(0, lastNewline);
  }
  return text.slice(0, maxChars);
}

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
  "&": { height: "100%", fontSize: "13px", backgroundColor: "transparent" },
  "&.cm-focused": { outline: "none" },
  ".cm-scroller": { fontFamily: "inherit", lineHeight: "1.5rem", overflow: "auto" },
  // The pane header is the chrome; the editor itself stays full-bleed.
  ".cm-gutters": { display: "none" },
  ".cm-activeLine": { backgroundColor: "transparent" },
  ".cm-content": {
    caretColor: "currentColor",
    fontFamily: "inherit",
    // v0 text-surface port: tracking-tight matches the raw-text textarea.
    letterSpacing: "-0.025em",
  },
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
  /** Disable JSON parse linting when displaying non-JSON egress formats (JSONL, SQL, TS). */
  lintJson?: boolean;
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
  lintJson = true,
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
  const languageCompartmentRef = useRef<Compartment | null>(null);
  const editableProp = editable ?? onChange !== undefined;
  const wasEditableRef = useRef(editableProp);
  const wasLintJsonRef = useRef(lintJson);
  const isLargeDoc = value.length > LARGE_DOC_MAX_CHARS;
  const wasLargeDocRef = useRef(isLargeDoc);
  const isPreviewTruncated =
    !editableProp && value.length > LARGE_OUTPUT_PREVIEW_MAX_CHARS;
  const editorValue = isPreviewTruncated
    ? slicePreviewOnLineBoundary(value, LARGE_DOC_MAX_CHARS)
    : value;
  // True while the value-sync effect applies an external value: that
  // transaction must not echo back through the update listener as a user
  // edit — it would mark the output edited on every derived regeneration.
  const applyingExternalRef = useRef(false);

  // One extension bundle per role; the compartment swaps it at runtime.
  // Stable identity: it only touches refs, and the effects below key on it.
  const editabilityExtensions = useCallback(
    (canEdit: boolean, largeDoc: boolean, enableLint: boolean): Extension[] =>
      canEdit
        ? [
            EditorView.updateListener.of((update) => {
              if (update.docChanged && !applyingExternalRef.current) {
                onChangeRef.current?.(update.state.doc.toString());
              }
            }),
            ...(largeDoc || !enableLint
              ? []
              : [linter(sizeGatedJsonLinter, { delay: 300 })]),
          ]
        : [EditorState.readOnly.of(true), EditorView.editable.of(false)],
    []
  );

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const themeCompartment = new Compartment();
    const editabilityCompartment = new Compartment();
    const languageCompartment = new Compartment();

    const state = EditorState.create({
      doc: editorValue,
      extensions: [
        languageCompartment.of(isLargeDoc || !lintJson ? [] : json()),
        EditorView.lineWrapping,
        history(),
        keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
        baseTheme,
        themeCompartment.of(syntaxHighlighting(jsonHighlight(dark))),
        editabilityCompartment.of(
          editabilityExtensions(editableProp, isLargeDoc, lintJson)
        ),
        ...(placeholder ? [cmPlaceholder(placeholder)] : []),
      ],
    });
    const view = new EditorView({ state, parent: host });
    themeCompartmentRef.current = themeCompartment;
    editabilityCompartmentRef.current = editabilityCompartment;
    languageCompartmentRef.current = languageCompartment;
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
    const languageCompartment = languageCompartmentRef.current;
    const editabilityCompartment = editabilityCompartmentRef.current;
    const effects = [];
    if (
      isLargeDoc !== wasLargeDocRef.current ||
      lintJson !== wasLintJsonRef.current
    ) {
      wasLargeDocRef.current = isLargeDoc;
      wasLintJsonRef.current = lintJson;
      if (languageCompartment) {
        effects.push(
          languageCompartment.reconfigure(isLargeDoc || !lintJson ? [] : json())
        );
      }
      if (editabilityCompartment) {
        effects.push(
          editabilityCompartment.reconfigure(
            editabilityExtensions(editableProp, isLargeDoc, lintJson)
          )
        );
      }
    }
    const currentDoc = view.state.doc.toString();
    if (currentDoc === editorValue && effects.length === 0) return;
    applyingExternalRef.current = true;
    try {
      view.dispatch({
        ...(currentDoc !== editorValue
          ? { changes: { from: 0, to: view.state.doc.length, insert: editorValue } }
          : {}),
        ...(effects.length > 0 ? { effects } : {}),
      });
    } finally {
      applyingExternalRef.current = false;
    }
  }, [editorValue, isLargeDoc, lintJson, editableProp, editabilityExtensions]);

  // Runtime editability swap (output editor: editable on a valid result,
  // read-only for a retained invalid-input result).
  useEffect(() => {
    const view = viewRef.current;
    const compartment = editabilityCompartmentRef.current;
    if (!view || !compartment) return;
    if (editableProp === wasEditableRef.current) return;
    wasEditableRef.current = editableProp;
    view.dispatch({
      effects: compartment.reconfigure(
        editabilityExtensions(editableProp, isLargeDoc, lintJson)
      ),
    });
  }, [editableProp, isLargeDoc, lintJson, editabilityExtensions]);

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
      className={cn(
        "flex min-h-0 flex-1 flex-col overflow-hidden font-mono",
        className
      )}
    >
      {isPreviewTruncated ? (
        <div
          data-testid="large-output-preview-banner"
          role="status"
          className="border-b border-border bg-muted/40 px-5 py-1.5 font-sans text-xs text-muted-foreground"
        >
          Showing first 512 KB preview in editor — Copy and Download include the full output
        </div>
      ) : null}
      <div
        ref={hostRef}
        className="min-h-0 flex-1 overflow-hidden px-5 py-4"
      />
    </div>
  );
}
