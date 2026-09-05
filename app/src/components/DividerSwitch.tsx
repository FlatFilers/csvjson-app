import { ArrowLeftRight } from "lucide-react";
import type { Direction } from "@/lib/convert";
import { cn } from "@/lib/utils";

function directionLabel(direction: Direction): string {
  return direction === "csv2json" ? "CSV → JSON" : "JSON → CSV";
}

/** The mockup's ⇄ icon (lucide arrow-left-right) — rotates 180° in JSON → CSV. */
function SwapIcon({ flipped }: { flipped: boolean }) {
  return (
    <ArrowLeftRight
      size={18}
      strokeWidth={2}
      aria-hidden="true"
      className={cn("transition-transform duration-300", flipped && "rotate-180")}
    />
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
      className="flex size-9 cursor-pointer items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-sm transition-colors hover:border-muted-foreground/50 hover:text-foreground"
    >
      <SwapIcon flipped={direction === "json2csv"} />
    </button>
  );
}
