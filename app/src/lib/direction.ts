import type { Direction } from "@/lib/convert";

/**
 * Entry-point direction init from `?direction=` (defect fix, 2026-10-03:
 * JSON→CSV worked but was invisible — legacy /json2csv visitors landed in
 * the CSV→JSON default with no hint). Only the two known values are
 * honored; unknown, empty, or absent params keep the csv2json default, so
 * no other entry point changes behavior.
 *
 * Entry-point affordance only: the direction switch never rewrites the
 * URL, and permalink hydration parses the pathname only (lib/permalink.ts)
 * — this param must never leak into hydration.
 */
export function directionFromSearch(search: string): Direction {
  return new URLSearchParams(search).get("direction") === "json2csv"
    ? "json2csv"
    : "csv2json";
}
