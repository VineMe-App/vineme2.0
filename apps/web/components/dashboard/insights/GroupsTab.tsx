"use client";

import {
  ArrowDownIcon,
  ArrowUpIcon,
  ChartBarBigIcon,
  XIcon,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardPanel } from "@/components/ui/card";
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
  type DateRange,
  type InsightsFilters,
} from "@/lib/dashboard/insights-filters";
import {
  fromStageDates,
  inTimeMeasureKeys,
  matchesAudience,
  plural,
  requestsIn,
  SMALL_GROUP_REQUESTS,
  summariseInTime,
  type InTimeSummary,
} from "@/lib/dashboard/insights-measures";
import type { InTimeMeasure, InsightsData } from "@/lib/dashboard/types";
import { cn } from "@/lib/utils";
import {
  followUpStates,
  groupTerms,
  inTimeMeasures,
} from "@/lib/dashboard/terms";
import { ChartCard, EmptyChart, Scope, TabHeading } from "./charts";
import { HowCounted, rateWithCount } from "./TeamTab";

type CountColumn = "requests" | "members" | "needsAttention";
type Column = "name" | CountColumn | InTimeMeasure;

interface GroupRow {
  id: string;
  name: string;
  requests: number;
  members: number;
  needsAttention: number;
  measures: Record<InTimeMeasure, InTimeSummary>;
  /** Too few requests in the period to compare fairly. */
  small: boolean;
}

const countColumns: { key: CountColumn; label: string }[] = [
  { key: "requests", label: "Requests" },
  { key: "members", label: groupTerms.members.label },
  { key: "needsAttention", label: `${followUpStates.needsAttention.label} now` },
];

function valueOf(row: GroupRow, column: Column): number | string | null {
  if (column === "name") return row.name;
  if (column === "requests" || column === "members" || column === "needsAttention") {
    return row[column];
  }
  return row.measures[column].rate;
}

function isMeasure(column: Column): column is InTimeMeasure {
  return (inTimeMeasureKeys as Column[]).includes(column);
}

/**
 * Rank within a column, 1 for the highest. Measures only rank groups with
 * enough requests to compare, so small numbers don't top the table.
 */
function ranks(rows: GroupRow[], column: Column) {
  const eligible = rows.filter(
    (row) => valueOf(row, column) !== null && (!isMeasure(column) || !row.small),
  );
  const sorted = [...eligible].sort(
    (a, b) => Number(valueOf(b, column)) - Number(valueOf(a, column)),
  );
  const result = new Map<string, { rank: number; share: number }>();
  const top = Number(valueOf(sorted[0] ?? rows[0], column) ?? 0);
  sorted.forEach((row, index) => {
    const value = Number(valueOf(row, column));
    // Ties share the better rank.
    const previous = sorted[index - 1];
    const rank =
      previous && Number(valueOf(previous, column)) === value
        ? (result.get(previous.id)?.rank ?? index + 1)
        : index + 1;
    result.set(row.id, { rank, share: top ? value / top : 0 });
  });
  return result;
}

function shade(share: number) {
  return `color-mix(in srgb, var(--brand-pink) ${Math.round(share * 28)}%, transparent)`;
}

function Cell({
  children,
  rank,
  share,
}: {
  children: React.ReactNode;
  rank?: number;
  share?: number;
}) {
  return (
    <TableCell
      className="text-right tabular-nums"
      style={share ? { background: shade(share) } : undefined}
    >
      <span className="inline-flex items-baseline gap-1.5">
        {children}
        {rank ? (
          <sup className="text-[0.65rem] text-muted-foreground" aria-label={`rank ${rank}`}>
            {rank}
          </sup>
        ) : null}
      </span>
    </TableCell>
  );
}

function SortHeading({
  label,
  column,
  sort,
  onSort,
  align = "right",
}: {
  label: string;
  column: Column;
  sort: { column: Column; descending: boolean };
  onSort: (column: Column) => void;
  align?: "left" | "right";
}) {
  const active = sort.column === column;
  const Arrow = sort.descending ? ArrowDownIcon : ArrowUpIcon;
  return (
    <button
      type="button"
      onClick={() => onSort(column)}
      className={cn(
        "inline-flex items-center gap-1 font-medium hover:text-foreground",
        align === "right" && "flex-row-reverse text-right",
        active ? "text-foreground" : "text-muted-foreground",
      )}
      aria-label={`Sort by ${label}`}
    >
      {label}
      <Arrow aria-hidden className={cn("size-3.5 shrink-0", !active && "invisible")} />
    </button>
  );
}

function MeasureChart({ rows, measure }: { rows: GroupRow[]; measure: InTimeMeasure }) {
  const shown = rows
    .filter((row) => row.measures[measure].rate !== null)
    .sort(
      (a, b) =>
        Number(b.measures[measure].rate) - Number(a.measures[measure].rate) ||
        b.measures[measure].judged - a.measures[measure].judged,
    );

  return (
    <ChartCard
      title={inTimeMeasures[measure].label}
      description={`By group, highest first. Paler bars have fewer than ${SMALL_GROUP_REQUESTS} requests in these dates.`}
    >
      {shown.length === 0 ? (
        <EmptyChart>No requests to count yet.</EmptyChart>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {shown.map((row) => {
            const summary = row.measures[measure];
            return (
              <li
                key={row.id}
                className={cn(
                  "grid grid-cols-[minmax(6rem,12rem)_1fr_auto] items-center gap-3 text-sm",
                  row.small && "opacity-50",
                )}
              >
                <span className="truncate">{row.name}</span>
                <span className="h-3 rounded-full bg-muted">
                  <span
                    className="block h-3 rounded-full transition-[width] duration-500"
                    style={{ width: `${summary.rate}%`, background: "var(--brand-pink)" }}
                  />
                </span>
                <span className="text-muted-foreground tabular-nums">
                  {rateWithCount(summary)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </ChartCard>
  );
}

export function GroupsTab({
  data,
  filters,
  range,
  onChange,
}: {
  data: InsightsData;
  filters: InsightsFilters;
  range: DateRange;
  onChange: (changes: Partial<InsightsFilters>) => void;
}) {
  const [sort, setSort] = useState<{ column: Column; descending: boolean }>({
    column: "needsAttention",
    descending: true,
  });
  const [chart, setChart] = useState<InTimeMeasure | null>(null);

  const inRange = requestsIn(data.requests, filters, range);
  const counted = requestsIn(data.requests, filters, fromStageDates(range));
  const audience = data.requests.filter((request) =>
    matchesAudience(request.isNewcomer, filters),
  );

  const allRows: GroupRow[] = data.groups.map((group) => {
    const requests = inRange.filter((request) => request.groupId === group.id).length;
    const measured = counted.filter((request) => request.groupId === group.id);
    const mine = audience.filter((request) => request.groupId === group.id);
    return {
      id: group.id,
      name: group.name,
      requests,
      members: mine.filter((request) => request.status === "active").length,
      needsAttention: mine.filter((request) => request.followUp === "needs_attention").length,
      measures: Object.fromEntries(
        inTimeMeasureKeys.map((key) => [key, summariseInTime(measured, key)]),
      ) as Record<InTimeMeasure, InTimeSummary>,
      small: requests < SMALL_GROUP_REQUESTS,
    };
  });
  const selected = filters.group
    ? data.groups.find((group) => group.id === filters.group)
    : undefined;
  const rows = selected ? allRows.filter((row) => row.id === selected.id) : allRows;

  const columnRanks = Object.fromEntries(
    ([...countColumns.map((column) => column.key), ...inTimeMeasureKeys] as Column[]).map(
      (column) => [column, ranks(allRows, column)],
    ),
  ) as Record<Exclude<Column, "name">, ReturnType<typeof ranks>>;

  const sorted = [...rows].sort((a, b) => {
    const left = valueOf(a, sort.column);
    const right = valueOf(b, sort.column);
    if (left === right) return a.name.localeCompare(b.name);
    // Groups with nothing to count go last whichever way it's sorted.
    if (left === null) return 1;
    if (right === null) return -1;
    const order =
      typeof left === "string"
        ? left.localeCompare(String(right))
        : left - Number(right);
    return sort.descending ? -order : order;
  });

  const onSort = (column: Column) =>
    setSort((current) =>
      current.column === column
        ? { column, descending: !current.descending }
        : { column, descending: column !== "name" },
    );

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <TabHeading>How are our groups doing?</TabHeading>
        <HowCounted />
      </div>
      <Scope>
        Where leaders might welcome some support, not a league table. Requests
        made {describeRange(range)}
        {filters.who === "newcomers" ? " by newcomers" : ""}; members and
        needs attention are as of today. Groups with fewer than{" "}
        {SMALL_GROUP_REQUESTS} requests are greyed out, because small numbers
        swing a long way.
      </Scope>

      {filters.group ? (
        <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
          <span>
            Showing <strong className="font-medium">{selected?.name ?? "a group that isn't active"}</strong>
          </span>
          <Button variant="outline" size="sm" onClick={() => onChange({ group: null })}>
            <XIcon aria-hidden />
            Show all groups
          </Button>
        </div>
      ) : null}

      <Card className="mt-6 overflow-hidden">
        {sorted.length === 0 ? (
          <CardPanel className="flex min-h-48">
            <EmptyChart>No active groups yet.</EmptyChart>
          </CardPanel>
        ) : (
          <div className="overflow-x-auto">
            <Table className="min-w-[56rem]">
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <SortHeading label="Group" column="name" sort={sort} onSort={onSort} align="left" />
                  </TableHead>
                  {countColumns.map((column) => (
                    <TableHead key={column.key} className="text-right">
                      <SortHeading label={column.label} column={column.key} sort={sort} onSort={onSort} />
                    </TableHead>
                  ))}
                  {inTimeMeasureKeys.map((key) => (
                    <TableHead key={key} className="text-right">
                      <span className="inline-flex items-center justify-end gap-1">
                        <SortHeading
                          label={inTimeMeasures[key].label}
                          column={key}
                          sort={sort}
                          onSort={onSort}
                        />
                        {data.measuresAvailable ? (
                          <Button
                            variant={chart === key ? "secondary" : "ghost"}
                            size="icon-xs"
                            aria-pressed={chart === key}
                            aria-label={`${chart === key ? "Hide" : "Show"} a chart of ${inTimeMeasures[key].label.toLowerCase()} by group`}
                            onClick={() => setChart(chart === key ? null : key)}
                          >
                            <ChartBarBigIcon aria-hidden />
                          </Button>
                        ) : null}
                      </span>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((row) => (
                  <TableRow key={row.id} className={cn(row.small && "text-muted-foreground opacity-60")}>
                    <TableCell className="font-medium">{row.name}</TableCell>
                    {countColumns.map((column) => {
                      const rank = row.small ? undefined : columnRanks[column.key].get(row.id);
                      return (
                        <Cell key={column.key} rank={rank?.rank} share={rank?.share}>
                          {row[column.key]}
                        </Cell>
                      );
                    })}
                    {inTimeMeasureKeys.map((key) => {
                      const summary = row.measures[key];
                      const rank = columnRanks[key].get(row.id);
                      return (
                        <Cell key={key} rank={rank?.rank} share={rank?.share}>
                          {!data.measuresAvailable
                            ? "–"
                            : summary.rate === null
                              ? "Not known yet"
                              : (
                                <>
                                  {summary.rate}%
                                  <span className="text-muted-foreground text-xs">
                                    {summary.hits} of {summary.judged}
                                  </span>
                                </>
                              )}
                        </Cell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {chart && data.measuresAvailable ? (
        <div className="mt-5">
          <MeasureChart rows={allRows} measure={chart} />
        </div>
      ) : null}

      <p className="mt-3 text-muted-foreground text-xs">
        {plural(allRows.length, "active group")}. The small number in each cell
        is the group&apos;s rank in that column; darker cells are higher.
      </p>
    </div>
  );
}
