import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import App from "@/App";
import {
  FEEDBACK_DISCUSSION_URL,
  FeedbackBanner,
} from "./FeedbackBanner";

describe("FeedbackBanner", () => {
  it("carries the exact launch-week copy", () => {
    render(<FeedbackBanner />);
    const banner = screen.getByTestId("feedback-banner");
    expect(banner.textContent).toBe(
      "Enjoy a cleaner, simpler CSVJSON. Leave feedback or ask for features here."
    );
    expect(screen.getByText("Leave feedback or ask for features here")).toBeInTheDocument();
  });

  it("links the feedback phrase to discussion #163 in a new tab", () => {
    render(<FeedbackBanner />);
    const link = screen.getByTestId("feedback-link");
    expect(link).toHaveAttribute("href", FEEDBACK_DISCUSSION_URL);
    expect(link).toHaveAttribute("href", "https://github.com/FlatFilers/csvjson-app/discussions/163");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("renders above the TopBar in the app tree", () => {
    const { container } = render(<App />);
    const banner = screen.getByTestId("feedback-banner");
    const topbar = screen.getByTestId("topbar");
    // Banner is a flex-shrink-0 child of the h-svh column, first in DOM
    // order before the TopBar.
    expect(banner.compareDocumentPosition(topbar) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(container.firstElementChild).toContainElement(banner);
  });
});
