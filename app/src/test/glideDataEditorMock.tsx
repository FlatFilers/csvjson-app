import { vi } from "vitest";
import type { GridCell, GridColumn, GridSelection } from "@glideapps/glide-data-grid";

/**
 * jsdom cannot exercise a canvas grid, so grid-rendering tests swap
 * DataEditorCore for this mock. It renders the same data the real grid
 * would draw — headers plus each view row's cell text, read through the
 * component's own getCellContent — and re-exposes the interaction
 * callbacks (gutter click, header click, selection change, cell edit) as
 * DOM buttons so the component's real handlers stay under test.
 *
 * Canvas-only gestures (drag ranges, shift+arrow extension, fill handle,
 * the cell editor itself) cannot be simulated honestly here; they are
 * covered by browser dogfood evidence, not jsdom tests.
 *
 * Render budget: rows are capped (the count chip asserts full length), and
 * per-row interaction buttons only render for the first few rows.
 */

/** The subset of DataEditorProps this mock consumes, restated strongly. */
interface MockGridProps {
  columns?: readonly GridColumn[];
  rows?: number;
  getCellContent?: (cell: readonly [number, number]) => GridCell;
  onHeaderClicked?: (colIndex: number, event?: unknown) => void;
  onCellClicked?: (
    cell: readonly [number, number],
    event: { shiftKey: boolean; ctrlKey: boolean; metaKey: boolean }
  ) => void;
  onCellsEdited?: (
    newValues: readonly { location: readonly [number, number]; value: { kind: string; data: string } }[]
  ) => void;
  onGridSelectionChange?: (newSelection: GridSelection) => void;
  onDelete?: (selection: GridSelection) => boolean | GridSelection;
  gridSelection?: GridSelection;
}

/** GridCell unions include LoadingCell, which carries no data. */
function cellData(cell: GridCell | undefined): unknown {
  return cell !== undefined && "data" in cell ? cell.data : "";
}

vi.mock("@glideapps/glide-data-grid", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@glideapps/glide-data-grid")>();
  const React = await import("react");

  // One honest cast at the mock boundary: real callers are typechecked
  // against DataEditorProps; the mock consumes only the subset above.
  const DataEditorCore = (rawProps: object) => {
    const props = rawProps as MockGridProps;
    const { columns, rows, getCellContent } = props;
    const columnList: readonly GridColumn[] = columns ?? [];
    const rowCount: number = rows ?? 0;
    const shown = Math.min(rowCount, 200);
    const interactiveRows = Math.min(shown, 5);

    const headerCells = columnList.map((column, x: number) =>
      React.createElement(
        "button",
        {
          key: `h${x}`,
          type: "button",
          "data-testid": `glide-header-${x}`,
          onClick: () => props.onHeaderClicked?.(x),
        },
        String(column.title ?? "")
      )
    );

    const bodyRows: React.ReactNode[] = [];
    for (let y = 0; y < shown; y++) {
      const cells = columnList.map((_: GridColumn, x: number) => {
        const cell = getCellContent?.([x, y]);
        const children: React.ReactNode[] = [String(cellData(cell))];
        if (y < interactiveRows) {
          if (x === 0) {
            children.push(
              React.createElement(
                "button",
                {
                  key: "sel",
                  type: "button",
                  "data-testid": `glide-row-select-${y}`,
                  onClick: (event: { shiftKey: boolean; ctrlKey: boolean; metaKey: boolean }) =>
                    props.onCellClicked?.([x, y], {
                      shiftKey: event.shiftKey,
                      ctrlKey: event.ctrlKey,
                      metaKey: event.metaKey,
                    }),
                },
                "select"
              )
            );
          } else if (props.onCellsEdited) {
            children.push(
              React.createElement(
                "button",
                {
                  key: "edit",
                  type: "button",
                  "data-testid": `glide-edit-${y}-${x}`,
                  "data-value": "EDITED",
                  onClick: (event: { currentTarget: { dataset: { value?: string } } }) =>
                    props.onCellsEdited?.([
                      {
                        location: [x, y],
                        value: { kind: "text", data: event.currentTarget.dataset.value ?? "EDITED" },
                      },
                    ]),
                },
                "edit"
              )
            );
          }
        }
        return React.createElement(
          "span",
          { key: `c${x}`, "data-col": x, "data-cell": String(cellData(cell)) },
          children
        );
      });
      bodyRows.push(
        React.createElement("div", { key: y, "data-testid": `glide-row-${y}`, "data-view-row": y }, cells)
      );
    }

    const columnSelectButtons = columnList.map((_: GridColumn, x: number) =>
      React.createElement(
        "button",
        {
          key: `colsel${x}`,
          type: "button",
          "data-testid": `glide-select-column-${x}`,
          onClick: (event: { shiftKey: boolean; ctrlKey: boolean; metaKey: boolean }) => {
            const empty = actual.CompactSelection.empty();
            // The real grid blends columns on ctrl/cmd+click.
            const columns =
              event.ctrlKey || event.metaKey ? (props.gridSelection?.columns ?? empty).add(x) : empty.add(x);
            props.onGridSelectionChange?.({
              current: undefined,
              columns,
              rows: empty,
            });
          },
        },
        `colsel-${x}`
      )
    );

    // Keyboard-path triggers. Canvas gestures can't be simulated, but the
    // component's real handlers can: one button injects a 1x2 range
    // selection through the controlled onGridSelectionChange (what the real
    // grid produces for a two-row drag), and one fires the onDelete
    // contract with the live gridSelection — recording its return value so
    // tests can assert the component suppresses Glide's own cell-clearing.
    const emptySelection = actual.CompactSelection.empty();
    const keyTriggers = React.createElement(
      "div",
      { "data-testid": "glide-key-triggers" },
      React.createElement(
        "button",
        {
          type: "button",
          "data-testid": "glide-select-range",
          onClick: () =>
            props.onGridSelectionChange?.({
              current: { cell: [1, 0], range: { x: 1, y: 0, width: 1, height: 2 }, rangeStack: [] },
              rows: emptySelection,
              columns: emptySelection,
            }),
        },
        "select-range"
      ),
      React.createElement(
        "button",
        {
          type: "button",
          "data-testid": "glide-delete-key",
          onClick: (event: { currentTarget: { dataset: { deleteResult?: string } } }) => {
            if (!props.onDelete) return;
            const result = props.onDelete(
              props.gridSelection ?? {
                current: undefined,
                rows: emptySelection,
                columns: emptySelection,
              }
            );
            event.currentTarget.dataset.deleteResult = result === false ? "false" : String(result);
          },
        },
        "delete-key"
      )
    );

    return React.createElement(
      "div",
      { "data-testid": "glide-grid-mock", tabIndex: 0 },
      React.createElement("div", { "data-testid": "glide-grid-headers" }, headerCells),
      React.createElement("div", { "data-testid": "glide-column-selects" }, columnSelectButtons),
      keyTriggers,
      bodyRows
    );
  };

  return {
    ...actual,
    DataEditorCore,
  } as unknown as typeof actual & { DataEditorCore: unknown };
});
