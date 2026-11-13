"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardPanel,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getFollowUpStage,
  type FollowUpStage,
} from "@/lib/dashboard/follow-up-utils";
import type { FollowUp } from "@/lib/dashboard/types";
import { cn } from "@/lib/utils";
import { stages as stageTerms } from "@/lib/dashboard/terms";

/** Stages in journey order. Colours are an ordinal ramp: darkest = most urgent. */
const stages: { id: FollowUpStage; label: string; color: string }[] = [
  { id: "not-reached", label: stageTerms.notContacted.label, color: "var(--chart-stage-1)" },
  { id: "reached-out", label: stageTerms.reachedOut.label, color: "var(--chart-stage-2)" },
  { id: "invited", label: stageTerms.spokenTo.label, color: "var(--chart-stage-3)" },
  { id: "attended", label: stageTerms.attended.label, color: "var(--chart-stage-4)" },
];

type GroupRow = {
  name: string;
  total: number;
  counts: Record<FollowUpStage, number>;
};

function buildRows(people: FollowUp[]): GroupRow[] {
  const rows = new Map<string, GroupRow>();
  for (const person of people) {
    const row = rows.get(person.group) ?? {
      name: person.group,
      total: 0,
      counts: { "not-reached": 0, "reached-out": 0, invited: 0, attended: 0 },
    };
    row.counts[getFollowUpStage(person)] += 1;
    row.total += 1;
    rows.set(person.group, row);
  }
  return [...rows.values()].sort(
    (a, b) => b.total - a.total || a.name.localeCompare(b.name),
  );
}

function niceStep(max: number) {
  if (max <= 6) return 1;
  if (max <= 14) return 2;
  if (max <= 30) return 5;
  return 10;
}

export function PendingRequestsChart({
  people,
  hasError,
}: {
  people: FollowUp[] | null;
  hasError: boolean;
}) {
  const [showTable, setShowTable] = useState(false);
  const rows = people ? buildRows(people) : [];
  const max = Math.max(1, ...rows.map((row) => row.total));
  const step = niceStep(max);
  const axisMax = Math.ceil(max / step) * step;
  const ticks = Array.from({ length: axisMax / step + 1 }, (_, i) => i * step);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Pending requests by group</CardTitle>
        <CardDescription>
          Where each person waiting to join a group has got to.
        </CardDescription>
        {rows.length > 0 ? (
          <CardAction>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowTable((current) => !current)}
            >
              {showTable ? "View as chart" : "View as table"}
            </Button>
          </CardAction>
        ) : null}
      </CardHeader>
      <CardPanel>
        {hasError ? (
          <p className="text-muted-foreground">
            We could not load the requests. Refresh to try again.
          </p>
        ) : !people ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : rows.length === 0 ? (
          <p className="text-muted-foreground">
            No pending requests. Everyone who asked to join a group has been
            placed.
          </p>
        ) : (
          <>
            <ul
              className="mb-4 flex flex-wrap gap-x-5 gap-y-2"
              aria-label="Legend"
            >
              {stages.map((stage) => (
                <li
                  key={stage.id}
                  className="flex items-center gap-2 text-sm text-foreground"
                >
                  <span
                    aria-hidden
                    className="size-3 rounded-[3px]"
                    style={{ background: stage.color }}
                  />
                  {stage.label}
                </li>
              ))}
            </ul>

            {showTable ? (
              <div className="overflow-x-auto rounded-xl border">
                <Table className="min-w-[560px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Group</TableHead>
                      {stages.map((stage) => (
                        <TableHead key={stage.id} className="text-right">
                          {stage.label}
                        </TableHead>
                      ))}
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row) => (
                      <TableRow key={row.name}>
                        <TableCell className="font-medium text-foreground">
                          {row.name}
                        </TableCell>
                        {stages.map((stage) => (
                          <TableCell key={stage.id} className="text-right">
                            {row.counts[stage.id]}
                          </TableCell>
                        ))}
                        <TableCell className="text-right font-medium text-foreground">
                          {row.total}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div role="group" aria-label="Pending requests by group and stage">
                <div className="space-y-0">
                  {rows.map((row) => {
                    const visible = stages.filter(
                      (stage) => row.counts[stage.id] > 0,
                    );
                    return (
                      <div
                        key={row.name}
                        className="grid grid-cols-[minmax(6rem,14rem)_1fr_2rem] items-center gap-3"
                      >
                        <p
                          className="truncate py-2 text-right text-muted-foreground text-sm"
                          title={row.name}
                        >
                          {row.name}
                        </p>
                        <div className="relative flex h-9 items-center">
                          {ticks.map((tick) => (
                            <span
                              key={tick}
                              aria-hidden
                              className="absolute inset-y-0 w-px bg-border"
                              style={{ left: `${(tick / axisMax) * 100}%` }}
                            />
                          ))}
                          <div
                            className="relative flex h-5 gap-0.5"
                            style={{ width: `${(row.total / axisMax) * 100}%` }}
                          >
                            {visible.map((stage, index) => {
                              const count = row.counts[stage.id];
                              const isLast = index === visible.length - 1;
                              return (
                                <div
                                  key={stage.id}
                                  tabIndex={0}
                                  role="img"
                                  aria-label={`${row.name}, ${stage.label}: ${count} ${
                                    count === 1 ? "request" : "requests"
                                  }`}
                                  className={cn(
                                    "group/seg relative h-full outline-none transition-[filter] hover:brightness-110 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                                    isLast && "rounded-r-[4px]",
                                  )}
                                  style={{
                                    flexGrow: count,
                                    flexBasis: 0,
                                    background: stage.color,
                                  }}
                                >
                                  <span
                                    role="tooltip"
                                    className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg border bg-popover px-3 py-2 text-popover-foreground text-xs shadow-md group-hover/seg:block group-focus-visible/seg:block"
                                  >
                                    <span className="block text-muted-foreground">
                                      {row.name}
                                    </span>
                                    <span className="mt-1 flex items-center gap-2">
                                      <span
                                        aria-hidden
                                        className="h-0.5 w-3 rounded-full"
                                        style={{ background: stage.color }}
                                      />
                                      <span className="font-medium text-foreground text-sm">
                                        {count}
                                      </span>
                                      <span>{stage.label}</span>
                                    </span>
                                    <span className="mt-1 block text-muted-foreground">
                                      {row.total} pending in this group
                                    </span>
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                          <span
                            className="absolute text-foreground text-sm"
                            style={{
                              left: `calc(${(row.total / axisMax) * 100}% + 0.5rem)`,
                            }}
                          >
                            {row.total}
                          </span>
                        </div>
                        <span aria-hidden />
                      </div>
                    );
                  })}
                </div>

                <div className="grid grid-cols-[minmax(6rem,14rem)_1fr_2rem] gap-3">
                  <span aria-hidden />
                  <div className="relative mt-1 h-5 border-t">
                    {ticks.map((tick) => (
                      <span
                        key={tick}
                        className="absolute -translate-x-1/2 pt-1 text-muted-foreground text-xs"
                        style={{ left: `${(tick / axisMax) * 100}%` }}
                      >
                        {tick}
                      </span>
                    ))}
                  </div>
                  <span aria-hidden />
                </div>
                <p className="mt-6 text-center text-muted-foreground text-xs">
                  Pending requests
                </p>
              </div>
            )}
          </>
        )}
      </CardPanel>
    </Card>
  );
}
