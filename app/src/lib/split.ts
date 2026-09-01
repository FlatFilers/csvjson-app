/** Seam drag clamp (spec: clamped 20–80%, double-click resets to 50/50). */
export const SPLIT_MIN = 20;
export const SPLIT_MAX = 80;
export const SPLIT_RESET = 50;

export function clampSplit(percent: number): number {
  return Math.min(SPLIT_MAX, Math.max(SPLIT_MIN, percent));
}
