/**
 * Counting for the Insights tabs. The numbers themselves come from the
 * request and person views; this only filters them to the page's filters and
 * adds them up, so every tab counts the same way.
 */

import {
  inRange,
  periodBuckets,
  type DateRange,
  type InsightsFilters,
  type Period,
} from "@/lib/dashboard/insights-filters";
import type { InTimeMeasure, InsightsRequest } from "@/lib/dashboard/types";

/**
 * Stage dates have only been recorded since 7 January 2026, so the Team
 * measures start from Q1 2026.
 */
export const STAGE_DATES_FROM = new Date(2026, 0, 1);

export const inTimeMeasureKeys: InTimeMeasure[] = ["reachedOut", "spokenTo", "attended"];

/** Groups with fewer requests than this in a period are greyed out in comparisons. */
export const SMALL_GROUP_REQUESTS = 5;

export function matchesAudience(isNewcomer: boolean, filters: InsightsFilters) {
  return filters.who === "everyone" || isNewcomer;
}

/** The range, starting no earlier than Q1 2026. */
export function fromStageDates(range: DateRange): DateRange {
  return {
    start:
      range.start && range.start > STAGE_DATES_FROM ? range.start : STAGE_DATES_FROM,
    end: range.end,
  };
}

/** The same dates a year earlier. */
export function yearBefore(range: DateRange): DateRange {
  const shift = (date: Date) =>
    new Date(date.getFullYear() - 1, date.getMonth(), date.getDate(), date.getHours(), date.getMinutes(), date.getSeconds(), date.getMilliseconds());
  return { start: range.start ? shift(range.start) : null, end: shift(range.end) };
}

export type PeriodRow<K extends string> = {
  key: string;
  label: string;
  inProgress: boolean;
  total: number;
} & Record<K, number>;

/** Items counted into each week, month or quarter of the range, split by series. */
export function countByPeriod<T, K extends string>(
  items: T[],
  dateOf: (item: T) => string,
  seriesOf: (item: T) => K | null,
  seriesKeys: readonly K[],
  range: DateRange,
  period: Period,
  now: Date,
): PeriodRow<K>[] {
  const earliest = items.reduce<Date | null>((first, item) => {
    const date = new Date(dateOf(item));
    return !first || date < first ? date : first;
  }, null);
  const start = range.start ?? earliest;
  if (!start) return [];

  const buckets = periodBuckets(start, range.end, period, now);
  const rows = buckets.map((bucket) => {
    const row = {
      key: bucket.key,
      label: bucket.label,
      inProgress: bucket.inProgress,
      total: 0,
    } as PeriodRow<K>;
    for (const key of seriesKeys) (row as Record<string, unknown>)[key] = 0;
    return row;
  });

  for (const item of items) {
    const time = new Date(dateOf(item)).getTime();
    const index = buckets.findIndex(
      (bucket) => time >= bucket.start.getTime() && time < bucket.end.getTime(),
    );
    const series = seriesOf(item);
    if (index < 0 || !series) continue;
    const row = rows[index] as Record<string, number>;
    row[series] += 1;
    row.total += 1;
  }
  return rows;
}

/** The UTC calendar day of a timestamp, as the views count days. */
function utcDay(timestamp: string) {
  const date = new Date(timestamp);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function dayNumber(isoDate: string) {
  const [year, month, day] = isoDate.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

export interface InTimeSummary {
  hits: number;
  /** Requests whose result is known: the count the rate is based on. */
  judged: number;
  /** Whole-number percentage, or null with nothing judged. */
  rate: number | null;
  /** Average days from the request to reaching the stage, among those that reached it. */
  averageDays: number | null;
  /** Requests that reached the stage, which the average is based on. */
  reached: number;
}

export function summariseInTime(
  requests: InsightsRequest[],
  measure: InTimeMeasure,
): InTimeSummary {
  let hits = 0;
  let judged = 0;
  let reached = 0;
  let totalDays = 0;
  for (const request of requests) {
    const result = request.inTime[measure];
    if (result) {
      judged += 1;
      if (result === "hit") hits += 1;
    }
    const reachedOn = request.reachedOn[measure];
    if (reachedOn) {
      reached += 1;
      totalDays += Math.max(
        0,
        Math.round((dayNumber(reachedOn) - utcDay(request.requestedAt)) / 864e5),
      );
    }
  }
  return {
    hits,
    judged,
    rate: judged ? Math.round((hits / judged) * 100) : null,
    averageDays: reached ? Math.round((totalDays / reached) * 10) / 10 : null,
    reached,
  };
}

/** Requests made in the range by the people the filter includes. */
export function requestsIn(
  requests: InsightsRequest[],
  filters: InsightsFilters,
  range: DateRange,
) {
  return requests.filter(
    (request) =>
      matchesAudience(request.isNewcomer, filters) &&
      inRange(request.requestedAt, range),
  );
}

/** Whole days between two timestamps, by calendar day. */
export function daysBetween(from: string, to: string) {
  return Math.max(0, Math.round((utcDay(to) - utcDay(from)) / 864e5));
}

export function percent(part: number, whole: number) {
  return whole ? Math.round((part / whole) * 100) : 0;
}

/** "1 request", "2 requests". */
export function plural(count: number, one: string, many = `${one}s`) {
  return `${count} ${count === 1 ? one : many}`;
}
