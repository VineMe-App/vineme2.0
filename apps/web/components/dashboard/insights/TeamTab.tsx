"use client";

import { InfoIcon } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardPanel,
  CardTitle,
} from "@/components/ui/card";
import {
  Popover,
  PopoverPopup,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  describeRange,
  periodBuckets,
  type DateRange,
  type InsightsFilters,
} from "@/lib/dashboard/insights-filters";
import {
  fromStageDates,
  inTimeMeasureKeys,
  plural,
  requestsIn,
  STAGE_DATES_FROM,
  summariseInTime,
  yearBefore,
  type InTimeSummary,
} from "@/lib/dashboard/insights-measures";
import type { InTimeMeasure, InsightsData } from "@/lib/dashboard/types";
import { inTimeCounting, inTimeMeasures } from "@/lib/dashboard/terms";
import {
  axisTick,
  chartFont,
  ChartCard,
  ChartTip,
  EmptyChart,
  Legend,
  Scope,
  TabHeading,
} from "./charts";

const lineColors: Record<InTimeMeasure, string> = {
  reachedOut: "var(--brand-dark)",
  spokenTo: "var(--brand-pink)",
  attended: "var(--chart-stage-4)",
};

/** "58% · 12 of 21", or "Not known yet" with nothing to judge. */
export function rateWithCount(summary: InTimeSummary) {
  return summary.rate === null
    ? "Not known yet"
    : `${summary.rate}% · ${summary.hits} of ${summary.judged}`;
}

export function HowCounted() {
  return (
    <Popover>
      <PopoverTrigger
        render={<Button variant="outline" size="sm" />}
      >
        <InfoIcon aria-hidden />
        How are these counted?
      </PopoverTrigger>
      <PopoverPopup align="end" className="w-[min(28rem,calc(100vw-2rem))]">
        <PopoverTitle className="text-base">How are these counted?</PopoverTitle>
        <p className="mt-1 text-muted-foreground text-sm">
          Each measure counts from the day someone asked to join. A request
          only counts once we know how it turned out.
        </p>
        <table className="mt-3 w-full text-left text-sm">
          <thead className="text-muted-foreground">
            <tr>
              <th className="pb-1 pr-3 font-medium">What happened</th>
              <th className="pb-1 pr-3 font-medium">Counts?</th>
              <th className="pb-1 font-medium">Result</th>
            </tr>
          </thead>
          <tbody>
            {inTimeCounting.map((row) => (
              <tr key={row.happened} className="border-t align-top">
                <td className="py-1.5 pr-3">{row.happened}</td>
                <td className="py-1.5 pr-3">{row.counts}</td>
                <td className="py-1.5">{row.result}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3 text-muted-foreground text-sm">
          Skipping a stage counts as reaching it: going straight to Attended
          counts as reached out and spoken to on that day.
        </p>
      </PopoverPopup>
    </Popover>
  );
}

function MeasureCard({
  measure,
  summary,
  lastYear,
}: {
  measure: InTimeMeasure;
  summary: InTimeSummary;
  lastYear: InTimeSummary | null;
}) {
  const term = inTimeMeasures[measure];
  return (
    <Card>
      <CardHeader>
        <CardDescription>{term.label}</CardDescription>
        <CardTitle className="flex items-baseline gap-2">
          <span className="font-heading text-5xl font-bold">
            {summary.rate === null ? "–" : `${summary.rate}%`}
          </span>
          {lastYear?.rate != null && summary.rate !== null ? (
            <span className="text-muted-foreground text-base font-normal">
              ({lastYear.rate}% last year)
            </span>
          ) : null}
        </CardTitle>
      </CardHeader>
      <CardPanel className="flex flex-col gap-1 pt-0 text-muted-foreground text-sm">
        <span>
          {summary.judged
            ? `${summary.hits} of ${plural(summary.judged, "request")} in time.`
            : "No requests to count yet."}
        </span>
        {summary.averageDays !== null ? (
          <span>
            {summary.averageDays} days on average from the request, across
            the {plural(summary.reached, "request")} that got there.
          </span>
        ) : null}
      </CardPanel>
    </Card>
  );
}

export function TeamTab({
  data,
  filters,
  range,
  now,
}: {
  data: InsightsData;
  filters: InsightsFilters;
  range: DateRange;
  now: Date;
}) {
  const counted = fromStageDates(range);
  const requests = requestsIn(data.requests, filters, counted);
  const previous = yearBefore(counted);
  // Last year only compares like for like once stage dates cover all of it.
  const previousRequests =
    previous.start && previous.start >= STAGE_DATES_FROM
      ? requestsIn(data.requests, filters, previous)
      : null;
  const who = filters.who === "newcomers" ? "Newcomers'" : "All";

  const summaries = Object.fromEntries(
    inTimeMeasureKeys.map((key) => [key, summariseInTime(requests, key)]),
  ) as Record<InTimeMeasure, InTimeSummary>;

  const buckets =
    counted.end >= (counted.start ?? STAGE_DATES_FROM)
      ? periodBuckets(counted.start ?? STAGE_DATES_FROM, counted.end, filters.by, now)
      : [];
  const rows = buckets.map((bucket) => {
    const inBucket = requests.filter((request) => {
      const time = new Date(request.requestedAt).getTime();
      return time >= bucket.start.getTime() && time < bucket.end.getTime();
    });
    const measures = Object.fromEntries(
      inTimeMeasureKeys.map((key) => [key, summariseInTime(inBucket, key)]),
    ) as Record<InTimeMeasure, InTimeSummary>;
    return {
      key: bucket.key,
      label: bucket.label,
      inProgress: bucket.inProgress,
      requests: inBucket.length,
      measures,
      reachedOut: measures.reachedOut.rate,
      spokenTo: measures.spokenTo.rate,
      attended: measures.attended.rate,
    };
  });
  type Row = (typeof rows)[number];
  const inProgressRow = rows.find((row) => row.inProgress);

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <TabHeading>How quickly are we following up?</TabHeading>
        <HowCounted />
      </div>
      <Scope>
        {who} requests made {describeRange(counted)}, each counted from the day
        they asked. Stage dates were first recorded in January 2026, so this
        tab starts there.
      </Scope>

      {!data.measuresAvailable ? (
        <Card className="mt-6">
          <CardPanel className="flex min-h-48">
            <EmptyChart>
              These figures will appear once the latest database update is live.
            </EmptyChart>
          </CardPanel>
        </Card>
      ) : (
        <>
          <div className="mt-6 grid gap-5 lg:grid-cols-3">
            {inTimeMeasureKeys.map((key) => (
              <MeasureCard
                key={key}
                measure={key}
                summary={summaries[key]}
                lastYear={
                  previousRequests ? summariseInTime(previousRequests, key) : null
                }
              />
            ))}
          </div>

          <div className="mt-5">
            <ChartCard
              title={`In time, by the ${filters.by} they asked`}
              description={`${plural(requests.length, "request")}. Each point shows the share of requests whose result is known.`}
            >
              {requests.length === 0 ? (
                <EmptyChart>No requests in these dates.</EmptyChart>
              ) : (
                <>
                  <Legend
                    series={inTimeMeasureKeys.map((key) => ({
                      key,
                      label: inTimeMeasures[key].label,
                      color: lineColors[key],
                    }))}
                  />
                  <div className="mt-4 h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={rows} style={chartFont} margin={{ top: 12, right: 12 }}>
                        <CartesianGrid vertical={false} stroke="var(--border)" />
                        <XAxis
                          dataKey="label"
                          tick={axisTick}
                          axisLine={false}
                          tickLine={false}
                          minTickGap={8}
                        />
                        <YAxis
                          domain={[0, 100]}
                          ticks={[0, 25, 50, 75, 100]}
                          tickFormatter={(value: number) => `${value}%`}
                          tick={axisTick}
                          axisLine={false}
                          tickLine={false}
                          width={40}
                        />
                        <Tooltip
                          content={({ active, payload, label }) => {
                            const row = payload?.[0]?.payload as Row | undefined;
                            if (!active || !row) return null;
                            return (
                              <ChartTip
                                title={row.inProgress ? `${String(label)}, in progress` : String(label)}
                                rows={inTimeMeasureKeys.map((key) => ({
                                  label: inTimeMeasures[key].label,
                                  value: rateWithCount(row.measures[key]),
                                  color: lineColors[key],
                                }))}
                              />
                            );
                          }}
                        />
                        {inTimeMeasureKeys.map((key) => (
                          <Line
                            key={key}
                            type="linear"
                            dataKey={key}
                            name={inTimeMeasures[key].label}
                            stroke={lineColors[key]}
                            strokeWidth={2}
                            dot={(props: { cx?: number; cy?: number; index?: number; payload?: Row }) =>
                              props.cx == null || props.cy == null ? (
                                <g key={`${key}-${props.index}`} />
                              ) : (
                                <circle
                                  key={`${key}-${props.index}`}
                                  cx={props.cx}
                                  cy={props.cy}
                                  r={props.payload?.inProgress ? 4 : 3}
                                  fill={props.payload?.inProgress ? "var(--card)" : lineColors[key]}
                                  stroke={lineColors[key]}
                                  strokeWidth={2}
                                />
                              )
                            }
                            connectNulls
                          />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  {inProgressRow ? (
                    <p className="mt-2 text-center text-muted-foreground text-xs">
                      The hollow points are this {filters.by}, which is still in
                      progress: more of its requests are counted as their limits pass.
                    </p>
                  ) : null}

                  <div className="mt-6 overflow-x-auto">
                    <Table className="min-w-[40rem]">
                      <TableHeader>
                        <TableRow>
                          <TableHead>{filters.by === "week" ? "Week of" : filters.by === "month" ? "Month" : "Quarter"}</TableHead>
                          <TableHead className="text-right">Requests</TableHead>
                          {inTimeMeasureKeys.map((key) => (
                            <TableHead key={key} className="text-right">
                              {inTimeMeasures[key].label}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {[...rows].reverse().map((row) => (
                          <TableRow key={row.key}>
                            <TableCell>
                              <span className="flex items-center gap-2">
                                {row.label}
                                {row.inProgress ? (
                                  <Badge variant="secondary">In progress</Badge>
                                ) : null}
                              </span>
                            </TableCell>
                            <TableCell className="text-right tabular-nums">{row.requests}</TableCell>
                            {inTimeMeasureKeys.map((key) => (
                              <TableCell key={key} className="text-right tabular-nums">
                                {rateWithCount(row.measures[key])}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
            </ChartCard>
          </div>
        </>
      )}
    </div>
  );
}
