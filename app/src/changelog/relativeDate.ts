/**
 * Relative date label for a changelog entry (spec: CSVJSON changelog widget,
 * art_YzASNds2): "today", "yesterday", "2 days ago", then a short date
 * ("Sep 3") once the age leaves the week window. Pure so tests can pin the
 * clock; entry dates are plain YYYY-MM-DD read as UTC calendar days.
 */

const MS_PER_DAY = 86_400_000;

function utcDay(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

export function relativeDate(iso: string, now: number = Date.now()): string {
  const date = new Date(`${iso}T00:00:00Z`);
  const nowDate = new Date(now);
  const diffDays = Math.round((utcDay(nowDate) - utcDay(date)) / MS_PER_DAY);
  // Future-dated or same-day entries read as "today" (clock skew is not a
  // reason to show a negative age).
  if (diffDays <= 0) return "today";
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  const label = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
  return date.getUTCFullYear() === nowDate.getUTCFullYear()
    ? label
    : `${label}, ${date.getUTCFullYear()}`;
}
