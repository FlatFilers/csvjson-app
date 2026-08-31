import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Faq } from "./Faq";

describe("Faq", () => {
  it("renders collapsed by default", () => {
    render(<Faq />);
    expect(screen.getByTestId("faq-toggle")).toHaveAttribute(
      "aria-expanded",
      "false"
    );
    expect(screen.getByTestId("faq-content")).toHaveAttribute("hidden");
  });

  it("carries the full FAQ copy in the DOM before any click (SEO initial-DOM rule)", () => {
    render(<Faq />);
    // The content is hidden but present — the click only toggles visibility,
    // never mounts content (spec: SEO initial-DOM rule).
    expect(screen.getByTestId("faq-content")).toHaveAttribute("hidden");
    const text = screen.getByTestId("faq").textContent ?? "";
    expect(text).toContain("How does it work?");
    expect(text).toContain("TSV vs CSV");
    expect(text).toContain("The conversion runs entirely in your browser");
  });

  it("reveals the answers when the trigger is clicked", async () => {
    const user = userEvent.setup();
    render(<Faq />);
    await user.click(screen.getByTestId("faq-toggle"));
    expect(screen.getByTestId("faq-toggle")).toHaveAttribute(
      "aria-expanded",
      "true"
    );
    expect(screen.getByTestId("faq-content")).not.toHaveAttribute("hidden");
    expect(screen.getByText(/How does it work\?/)).toBeVisible();
  });
});
