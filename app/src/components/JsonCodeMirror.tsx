import { useEffect, useRef } from "react";
import { Compartment, EditorState } from "@codemirror/state";
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
 * still applies; the editor stays responsive).
 */
const LINT_MAX_CHARS = 512 * 1024;
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

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const readOnly = onChange === undefined;
    const themeCompartment = new Compartment();

    const state = EditorState.create({
      doc: value,
      extensions: [
        json(),
        EditorView.lineWrapping,
        history(),
        keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
        baseTheme,
        themeCompartment.of(syntaxHighlighting(jsonHighlight(dark))),
        readOnly
          ? [EditorState.readOnly.of(true), EditorView.editable.of(false)]
          : [
              EditorView.updateListener.of((update) => {
                if (update.docChanged) onChangeRef.current?.(update.state.doc.toString());
              }),
              linter(sizeGatedJsonLinter, { delay: 300 }),
            ],
        ...(placeholder ? [cmPlaceholder(placeholder)] : []),
      ],
    });
    const view = new EditorView({ state, parent: host });
    themeCompartmentRef.current = themeCompartment;
    onReady?.(view);
    viewRef.current = view;
    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // Role (editable vs read-only) is fixed for the component's lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // External value changes (example load, direction flip, clear, upload).
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    if (view.state.doc.toString() === value) return;
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: value },
    });
  }, [value]);

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
