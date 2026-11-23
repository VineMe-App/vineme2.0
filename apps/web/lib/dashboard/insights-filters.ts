/**
 * The page-wide filters on Insights, kept in the URL so a view can be shared:
 *
 * - `tab`: activity (default), results, groups or team
 * - `who`: everyone (default) or newcomers
 * - `range`: 3m, 6m, 12m (default), year, all or custom, with `from` and `to`
 *   (YYYY-MM-DD) for custom
 * - `by`: week, month (default) or quarter, for charts over time
 */

export type InsightsTab = "activity" | "results" | "groups" | "team";
export type Audience = "everyone" | "newcomers";
export type RangePreset = "3m" | "6m" | "12m" | "year" | "all" | "custom";
export type Period = "week" | "month" | "quarter";

export interface InsightsFilters {
  tab: InsightsTab;
  who: Audience;
  range: RangePreset;
  /** Custom range only. */
  from: string | null;
  to: string | null;
  by: Period;
}

export const tabOptions: { value: InsightsTab; label: string }[] = [
  { value: "activity", label: "Activity" },
  { value: "results", label: "Results" },
  { value: "groups", label: "Groups" },
  { value: "team", label: "Team" },
];

export const audienceOptions: { value: Audience; label: string }[] = [
  { value: "everyone", label: "Everyone" },
  { value: "newcomers", label: "Newcomers" },
];

export const rangeOptions: { value: RangePreset; label: string }[] = [
  { value: "3m", label: "Last 3 months" },
  { value: "6m", label: "Last 6 months" },
  { value: "12m", label: "Last 12 months" },
  { value: "year", label: "This year" },
  { value: "all", label: "All time" },
  { value: "custom", label: "Custom dates" },
];

export const periodOptions: { value: Period; label: string }[] = [
  { value: "week", label: "By week" },
  { value: "month", label: "By month" },
  { value: "quarter", label: "By quarter" },
];

export const defaultFilters: InsightsFilters = {
  tab: "activity",
  who: "everyone",
  range: "12m",
  from: null,
  to: null,
  by: "month",
};

const isoDate = /^\d{4}-\d{2}-\d{2}$/;

function pick<T extends string>(
  value: string | null,
  options: { value: T }[],
  fallback: T,
): T {
  return options.some((option) => option.value === value)
    ? (value as T)
    : fallback;
}

export function parseFilters(params: URLSearchParams): InsightsFilters {
  const from = params.get("from");
  const to = params.get("to");
  return {
    tab: pick(params.get("tab"), tabOptions, defaultFilters.tab),
    who: pick(params.get("who"), audienceOptions, defaultFilters.who),
    range: pick(params.get("range"), rangeOptions, defaultFilters.range),
    from: from && isoDate.test(from) ? from : null,
    to: to && isoDate.test(to) ? to : null,
    by: pick(params.get("by"), periodOptions, defaultFilters.by),
  };
}

/** The URL params for these filters, leaving out anything at its default. */
export function filterParams(filters: InsightsFilters): URLSearchParams {
  const params = new URLSearchParams();
  for (const key of ["tab", "who", "range", "by"] as const) {
    if (filters[key] !== defaultFilters[key]) params.set(key, filters[key]);
  }
  if (filters.range === "custom") {
    if (filters.from) params.set("from", filters.from);
    if (filters.to) params.set("to", filters.to);
  }
  return params;
}

function parseLocalDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function toIsoDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export interface DateRange {
  /** Start of the first day, or null for no lower bound. */
  start: Date | null;
  /** End of the last day. */
  end: Date;
}

/** The dates a range covers, in the viewer's time zone. */
export function resolveRange(filters: InsightsFilters, now: Date): DateRange {
  const endOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    23,
    59,
    59,
    999,
  );
  const monthsBack = (count: number) =>
    new Date(now.getFullYear(), now.getMonth() - (count - 1), 1);

  switch (filters.range) {
    case "3m":
      return { start: monthsBack(3), end: endOfToday };
    case "6m":
      return { start: monthsBack(6), end: endOfToday };
    case "12m":
      return { start: monthsBack(12), end: endOfToday };
    case "year":
      return { start: new Date(now.getFullYear(), 0, 1), end: endOfToday };
    case "all":
      return { start: null, end: endOfToday };
    case "custom": {
      const start = filters.from ? parseLocalDate(filters.from) : null;
      const lastDay = filters.to ? parseLocalDate(filters.to) : null;
      const end = lastDay
        ? new Date(
            lastDay.getFullYear(),
            lastDay.getMonth(),
            lastDay.getDate(),
            23,
            59,
            59,
            999,
          )
        : endOfToday;
      return { start, end };
    }
  }
}

export function inRange(timestamp: string | null, range: DateRange) {
  if (!timestamp) return false;
  const time = new Date(timestamp).getTime();
  return (
    (range.start === null || time >= range.start.getTime()) &&
    time <= range.end.getTime()
  );
}

export function startOfPeriod(date: Date, period: Period) {
  if (period === "week") {
    // Weeks start on Monday.
    const offset = (date.getDay() + 6) % 7;
    return new Date(date.getFullYear(), date.getMonth(), date.getDate() - offset);
  }
  if (period === "month") {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }
  return new Date(date.getFullYear(), Math.floor(date.getMonth() / 3) * 3, 1);
}

function nextPeriod(date: Date, period: Period) {
  if (period === "week") {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 7);
  }
  return new Date(
    date.getFullYear(),
    date.getMonth() + (period === "month" ? 1 : 3),
    1,
  );
}

function periodLabel(date: Date, period: Period) {
  if (period === "week") {
    return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  }
  if (period === "month") {
    return date.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
  }
  return `Q${Math.floor(date.getMonth() / 3) + 1} ${date.getFullYear()}`;
}

export interface PeriodBucket {
  key: string;
  label: string;
  start: Date;
  end: Date;
  /** The period hasn't finished yet, so it can't be compared like for like. */
  inProgress: boolean;
}

/** Every week, month or quarter from `start` to `end`, oldest first. */
export function periodBuckets(
  start: Date,
  end: Date,
  period: Period,
  now: Date,
): PeriodBucket[] {
  const buckets: PeriodBucket[] = [];
  for (
    let cursor = startOfPeriod(start, period);
    cursor.getTime() <= end.getTime();
    cursor = nextPeriod(cursor, period)
  ) {
    const next = nextPeriod(cursor, period);
    buckets.push({
      key: toIsoDate(cursor),
      label: periodLabel(cursor, period),
      start: cursor,
      end: next,
      inProgress: now.getTime() < next.getTime() && now.getTime() >= cursor.getTime(),
    });
  }
  return buckets;
}

/** "1 Jan 2026 to 20 Nov 2026", for saying what a tab counts. */
export function describeRange(range: DateRange) {
  const format = (date: Date) =>
    date.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  return range.start
    ? `${format(range.start)} to ${format(range.end)}`
    : `up to ${format(range.end)}`;
}
