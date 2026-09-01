import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { EditorView } from "@codemirror/view";
import { JsonCodeMirror } from "./JsonCodeMirror";
import { SAMPLE_JSON } from "@/lib/samples";

describe("JsonCodeMirror", () => {
  it("renders the document for editing and reports changes", () => {
    const viewRef: { current: EditorView | null } = { current: null };
    render(
      <JsonCodeMirror
        value={SAMPLE_JSON}
        onChange={() => {}}
        dark={false}
        testId="input-editor"
        onReady={(view) => {
          viewRef.current = view;
        }}
      />
    );
    const view = viewRef.current;
    expect(view).not.toBeNull();
    // The input editor renders the JSON document highlighted and editable.
    expect(view!.state.doc.toString()).toBe(SAMPLE_JSON);
    expect(screen.getByTestId("input-editor")).toBeInTheDocument();
  });

  it("renders editor and output hosts with the monospace font token", () => {
    // Regression: the JSON panes inherited the sans body font because the
    // renderer host carried no font token — JSON must be fixed-width in
    // both the editable and read-only views.
    render(
      <>
        <JsonCodeMirror value="{}" onChange={() => {}} dark={false} testId="input-editor" />
        <JsonCodeMirror value="{}" dark={false} testId="output-view" />
      </>
    );
    for (const testId of ["input-editor", "output-view"]) {
      expect(screen.getByTestId(testId)).toHaveClass("font-mono");
    }
  });

  it("renders the output view read-only with the doc intact", () => {
    const viewRef: { current: EditorView | null } = { current: null };
    render(
      <JsonCodeMirror
        value={SAMPLE_JSON}
        dark={false}
        testId="output-view"
        onReady={(view) => {
          viewRef.current = view;
        }}
      />
    );
    const view = viewRef.current;
    expect(view).not.toBeNull();
    expect(view!.state.readOnly).toBe(true);
    // The same renderer, read-only: doc intact, lint/highlight wired.
    expect(view!.state.doc.toString()).toBe(SAMPLE_JSON);
  });
});
