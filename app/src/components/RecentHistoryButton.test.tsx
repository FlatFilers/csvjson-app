import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { RecentHistoryButton } from "./RecentHistoryButton";
import { DEFAULT_OPTIONS } from "@/lib/convert";
import type { RecentSnapshot } from "@/lib/recentHistory";

function makeSnapshot(overrides: Partial<RecentSnapshot> = {}): RecentSnapshot {
  return {
    id: "snap-1",
    createdAt: Date.now() - 120_000,
    direction: "csv2json",
    input: "album,year\nElephant,2003",
    options: { ...DEFAULT_OPTIONS },
    filename: "albums.csv",
    rows: 1,
    cols: 2,
    preview: "album,year",
    ...overrides,
  };
}

describe("RecentHistoryButton (AC-12 / D11)", () => {
  it("renders trigger button with count badge when snapshots exist and opens empty state when none exist", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const onRemove = vi.fn();
    const onClear = vi.fn();

    const { rerender } = render(
      <RecentHistoryButton
        snapshots={[]}
        onSelect={onSelect}
        onRemove={onRemove}
        onClear={onClear}
      />
    );

    const toggle = screen.getByTestId("recent-history-toggle");
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByTestId("recent-history-count")).toBeNull();

    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    const popout = screen.getByTestId("recent-history-popout");
    expect(popout).toHaveAttribute("role", "dialog");
    expect(popout).toHaveAttribute("aria-label", "Recent conversions");
    expect(screen.getByTestId("recent-history-empty")).toBeInTheDocument();
    expect(screen.queryByTestId("recent-history-clear")).toBeNull();

    rerender(
      <RecentHistoryButton
        snapshots={[makeSnapshot()]}
        onSelect={onSelect}
        onRemove={onRemove}
        onClear={onClear}
      />
    );
    expect(screen.getByTestId("recent-history-count")).toHaveTextContent("1");
    expect(screen.getByTestId("recent-history-clear")).toBeInTheDocument();
  });

  it("calls onSelect and closes the popover when a snapshot item is clicked", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const snap = makeSnapshot({
      id: "snap-42",
      direction: "json2csv",
      filename: null,
      preview: '[{"id":1,"name":"Ada"}]',
      rows: 1,
      cols: 2,
    });

    render(
      <RecentHistoryButton
        snapshots={[snap]}
        onSelect={onSelect}
        onRemove={vi.fn()}
        onClear={vi.fn()}
      />
    );

    await user.click(screen.getByTestId("recent-history-toggle"));
    const item = screen.getByTestId("recent-history-item-snap-42");
    expect(item).toHaveTextContent("JSON→CSV");
    expect(item).toHaveTextContent("1 rows · 2 cols");
    expect(item).toHaveTextContent('[{"id":1,"name":"Ada"}]');

    await user.click(item);
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(snap);
    expect(screen.queryByTestId("recent-history-popout")).toBeNull();
  });

  it("supports per-item deletion without selecting the item, and clearing all history", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const onRemove = vi.fn();
    const onClear = vi.fn();
    const snap = makeSnapshot({ id: "snap-del" });

    render(
      <RecentHistoryButton
        snapshots={[snap]}
        onSelect={onSelect}
        onRemove={onRemove}
        onClear={onClear}
      />
    );

    await user.click(screen.getByTestId("recent-history-toggle"));
    await user.click(screen.getByTestId("recent-history-delete-snap-del"));
    expect(onRemove).toHaveBeenCalledWith("snap-del");
    expect(onSelect).not.toHaveBeenCalled();
    expect(screen.getByTestId("recent-history-popout")).toBeInTheDocument();

    await user.click(screen.getByTestId("recent-history-clear"));
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it("closes on Escape and outside click, returning focus to the trigger button", async () => {
    const user = userEvent.setup();
    render(
      <RecentHistoryButton
        snapshots={[makeSnapshot()]}
        onSelect={vi.fn()}
        onRemove={vi.fn()}
        onClear={vi.fn()}
      />
    );

    const toggle = screen.getByTestId("recent-history-toggle");
    await user.click(toggle);
    expect(screen.getByTestId("recent-history-popout")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(screen.queryByTestId("recent-history-popout")).toBeNull();
    expect(toggle).toHaveFocus();

    await user.click(toggle);
    expect(screen.getByTestId("recent-history-popout")).toBeInTheDocument();

    await user.click(document.body);
    expect(screen.queryByTestId("recent-history-popout")).toBeNull();
    expect(toggle).toHaveFocus();
  });
});
