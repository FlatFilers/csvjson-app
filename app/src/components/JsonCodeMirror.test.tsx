import { act, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { EditorView } from "@codemirror/view";
import { JsonCodeMirror, LINT_MAX_CHARS } from "./JsonCodeMirror";
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

/**
 * Dynamic editability: the output editor switches editable/read-only at
 * runtime (valid CSV→JSON result ↔ retained invalid-input result), and the
 * external value sync must never echo back as a user edit.
 */

function viewFromDom(testId: string): EditorView {
  const editor = screen
    .getByTestId(testId)
    .querySelector(".cm-editor") as HTMLElement;
  const view = EditorView.findFromDOM(editor);
  if (!view) throw new Error(`EditorView not found for ${testId}`);
  return view;
}

const contentOf = (testId: string) =>
  (screen.getByTestId(testId).querySelector(".cm-content") as HTMLElement)
    .getAttribute("contenteditable");

function replaceDoc(view: EditorView, text: string) {
  act(() => {
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: text },
    });
  });
}

describe("JsonCodeMirror dynamic editability", () => {
  it("flips editable ↔ read-only via the editable prop without remounting", () => {
    const { rerender } = render(
      <JsonCodeMirror value="[]" editable onChange={vi.fn()} dark={false} testId="cm" />
    );
    expect(contentOf("cm")).toBe("true");

    rerender(
      <JsonCodeMirror value="[]" editable={false} onChange={vi.fn()} dark={false} testId="cm" />
    );
    expect(contentOf("cm")).toBe("false");

    rerender(
      <JsonCodeMirror value="[]" editable onChange={vi.fn()} dark={false} testId="cm" />
    );
    expect(contentOf("cm")).toBe("true");

    // Same DOM node the whole time — no remount, no state loss.
    expect(viewFromDom("cm").state.doc.toString()).toBe("[]");
  });

  it("suppresses the echo when a programmatic value sync lands", () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <JsonCodeMirror value="[]" editable onChange={onChange} dark={false} testId="cm" />
    );

    // Derived regeneration pushes a new value into the editor…
    rerender(
      <JsonCodeMirror
        value='[{"a": 1}]'
        editable
        onChange={onChange}
        dark={false}
        testId="cm"
      />
    );
    expect(viewFromDom("cm").state.doc.toString()).toBe('[{"a": 1}]');
    // …without that dispatch surfacing as a user modification.
    expect(onChange).not.toHaveBeenCalled();

    // A genuine user transaction still reports.
    replaceDoc(viewFromDom("cm"), "[]");
    expect(onChange).toHaveBeenCalledWith("[]");
  });

  it("keeps the editor editable above the lint bypass threshold (plain text)", () => {
    const big = "[" + "1,".repeat(Math.ceil(LINT_MAX_CHARS / 2)) + "1]";
    render(
      <JsonCodeMirror value={big} editable onChange={vi.fn()} dark={false} testId="cm" />
    );
    expect(big.length).toBeGreaterThan(LINT_MAX_CHARS);
    expect(contentOf("cm")).toBe("true");
  });
});
