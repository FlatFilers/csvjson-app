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

  it("treats anything inside a CodeMirror editor as owned by CodeMirror", () => {
    const cmContent = el(
      "<div class=\"cm-editor\"><div class=\"cm-content\"></div></div>"
    );
    const content = cmContent.querySelector(".cm-content") as HTMLElement;
    // The read-only output view sets contenteditable=false — still local.
    content.setAttribute("contenteditable", "false");
    expect(isEditablePasteTarget(content)).toBe(true);
  });

  it("treats the output pane surface as owned by the output", () => {
    const pane = el(
      "<div data-testid=\"output-pane\"><div class=\"output-table\"></div></div>"
    );
    const table = pane.querySelector(".output-table") as HTMLElement;
    expect(isEditablePasteTarget(table)).toBe(true);
    expect(isEditablePasteTarget(pane)).toBe(true);
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
