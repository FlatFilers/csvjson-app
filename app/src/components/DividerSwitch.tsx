import type { Direction } from "@/lib/convert";
import { cn } from "@/lib/utils";

function directionLabel(direction: Direction): string {
  return direction === "csv2json" ? "CSV → JSON" : "JSON → CSV";
}

/** The mockup's ⇄ icon (arrow-right-left) — rotates 180° in JSON → CSV. */
function SwapIcon({ flipped }: { flipped: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn("transition-transform duration-300", flipped && "rotate-180")}
    >
      <path d="M8 3 4 7l4 4" />
      <path d="M4 7h16" />
      <path d="m16 21 4-4-4-4" />
      <path d="M20 17H4" />
    </svg>
  );
}

type DividerSwitchProps = {
  direction: Direction;
  onFlip: () => void;
};

export function DividerSwitch({ direction, onFlip }: DividerSwitchProps) {
  return (
    <button
      type="button"
      data-testid="divider-switch"
      onClick={onFlip}
      // The switch sits on the seam's drag strip — never start a resize from it.
      onMouseDown={(event) => event.stopPropagation()}
      onDoubleClick={(event) => event.stopPropagation()}
      title={`Switch direction (currently ${directionLabel(direction)})`}
      aria-label={`Switch conversion direction (currently ${directionLabel(direction)})`}
      className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-border bg-panel text-muted-foreground shadow-md transition-colors hover:border-muted-foreground/50 hover:text-foreground"
    >
      <SwapIcon flipped={direction === "json2csv"} />
    </button>
  );
}
