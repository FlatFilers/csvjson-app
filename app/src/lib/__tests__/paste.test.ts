import { describe, expect, it } from "vitest";
import { isEditablePasteTarget } from "@/lib/paste";

function el(html: string): HTMLElement {
  const container = document.createElement("div");
  container.innerHTML = html;
  document.body.appendChild(container);
  const first = container.firstElementChild as HTMLElement;
  first.remove();
  container.remove();
  return first;
}

describe("isEditablePasteTarget", () => {
  it("treats text inputs and textareas as editable", () => {
    expect(isEditablePasteTarget(el("<input type=\"text\" />"))).toBe(true);
    expect(isEditablePasteTarget(el("<textarea></textarea>"))).toBe(true);
  });

  it("treats contenteditable hosts as editable", () => {
    expect(
      isEditablePasteTarget(el("<div contenteditable=\"true\"></div>"))
    ).toBe(true);
    // jsdom implements neither contentEditable nor isContentEditable — the
    // explicit attribute check is what makes this work in tests and in
    // browsers alike.
  });

  it("treats the editable output CodeMirror as a native paste target", () => {
    // In the editing window (valid CSV→JSON result, or while edited) the
    // output .cm-content is contenteditable=true — the paste edits the
    // output in place and marks it edited; the router must not take it.
    const editor = el(
      "<div class=\"cm-editor\"><div class=\"cm-content\" contenteditable=\"true\"><div class=\"cm-line\"></div></div></div>"
    );
    const content = editor.querySelector(".cm-content") as HTMLElement;
    expect(isEditablePasteTarget(content)).toBe(true);
    const line = editor.querySelector(".cm-line") as HTMLElement;
    expect(isEditablePasteTarget(line)).toBe(true);
  });

  it("routes a paste over a read-only output CodeMirror (cm-line)", () => {
    // The retained invalid-input result renders read-only (contenteditable
    // =false) — no editable target exists locally, so the paste must fall
    // through to the router (Sep 5 feedback: swallowing it silently was
    // the defect).
    const editor = el(
      "<div class=\"cm-editor\"><div class=\"cm-content\" contenteditable=\"false\"><div class=\"cm-line\"></div></div></div>"
    );
    const line = editor.querySelector(".cm-line") as HTMLElement;
    expect(isEditablePasteTarget(line)).toBe(false);
    expect(isEditablePasteTarget(editor.querySelector(".cm-content"))).toBe(
      false
    );
  });

  it("routes a paste over the output pane chrome ([data-surface=output])", () => {
    const pane = el(
      "<div data-surface=\"output\"><div class=\"output-table\"></div></div>"
    );
    const table = pane.querySelector(".output-table") as HTMLElement;
    expect(isEditablePasteTarget(table)).toBe(false);
    expect(isEditablePasteTarget(pane)).toBe(false);
  });

  it("routes pastes over the output pane's chrome even when its editor is editable", () => {
    // The header/buttons are NOT inside the contenteditable editor — a
    // paste over them routes to the input even in the editing window.
    const pane = el(
      "<div data-surface=\"output\"><div class=\"pane-header\"><button type=\"button\">Copy</button></div><div class=\"cm-editor\"><div class=\"cm-content\" contenteditable=\"true\"></div></div></div>"
    );
    const header = pane.querySelector(".pane-header") as HTMLElement;
    expect(isEditablePasteTarget(header)).toBe(false);
    expect(isEditablePasteTarget(pane)).toBe(false);
    // ...while the editor itself stays native.
    const content = pane.querySelector(".cm-content") as HTMLElement;
    expect(isEditablePasteTarget(content)).toBe(true);
  });

  it("keeps the editable input CodeMirror native (contenteditable .cm-content)", () => {
    const cmContent = el(
      "<div class=\"cm-editor\"><div class=\"cm-content\" contenteditable=\"true\"><div class=\"cm-line\"></div></div></div>"
    );
    // The editable input editor's .cm-content is contenteditable=true —
    // native paste-at-caret owns the event there.
    const content = cmContent.querySelector(".cm-content") as HTMLElement;
    expect(isEditablePasteTarget(content)).toBe(true);
    const line = cmContent.querySelector(".cm-line") as HTMLElement;
    expect(isEditablePasteTarget(line)).toBe(true);
  });

  it("treats page surfaces (body, divs, buttons) as routable", () => {
    expect(isEditablePasteTarget(document.body)).toBe(false);
    expect(isEditablePasteTarget(el("<div></div>"))).toBe(false);
    expect(isEditablePasteTarget(el("<button type=\"button\"></button>"))).toBe(
      false
    );
  });

  it("handles null and non-element targets", () => {
    expect(isEditablePasteTarget(null)).toBe(false);
    expect(isEditablePasteTarget(document)).toBe(false);
  });
});
