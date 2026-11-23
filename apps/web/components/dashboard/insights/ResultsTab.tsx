"use client";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardHeader,
  CardPanel,
  CardTitle,
} from "@/components/ui/card";
import {
  describeRange,
  inRange,
  type DateRange,
  type InsightsFilters,
} from "@/lib/dashboard/insights-filters";
import {
  daysBetween,
  matchesAudience,
  percent,
  plural,
} from "@/lib/dashboard/insights-measures";
import type { FurthestStage, InsightsData } from "@/lib/dashboard/types";
import {
  measures,
  noLongerInterestedReason,
  outcomes,
  reReferralReasons,
  stages,
} from "@/lib/dashboard/terms";
import { archivedColor, ChartCard, EmptyChart, Scope, TabHeading } from "./charts";

/** The connection bar, in order: Connected, Not yet connected by stage, Archived. */
const connectionParts: {
  key: FurthestStage;
  label: string;
  color: string;
  notYet?: boolean;
}[] = [
  { key: "connected", label: outcomes.connected.label, color: "var(--chart-stage-4)" },
  { key: "spoken_to", label: stages.spokenTo.label, color: "var(--chart-stage-3)", notYet: true },
  { key: "reached_out", label: stages.reachedOut.label, color: "var(--chart-stage-2)", notYet: true },
  { key: "not_contacted", label: stages.notContacted.label, color: "var(--chart-stage-1)", notYet: true },
  { key: "archived", label: outcomes.archived.label, color: archivedColor },
];

/** How long they had waited, in the same steps as the follow-up limits. */
const waitBands = [
  { label: "Up to 6 days", max: 6 },
  { label: "7 to 16 days", max: 16 },
  { label: "17 to 30 days", max: 30 },
  { label: "Over 30 days", max: Infinity },
];

const noReason = "No reason given";

function median(values: number[]) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : Math.round((sorted[middle - 1] + sorted[middle]) / 2);
}

function Headline({
  value,
  title,
  children,
}: {
  value: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{title}</CardDescription>
        <CardTitle className="font-heading text-5xl font-bold">{value}</CardTitle>
      </CardHeader>
      <CardPanel className="pt-0 text-muted-foreground text-sm">{children}</CardPanel>
    </Card>
  );
}

export function ResultsTab({
  data,
  filters,
  range,
}: {
  data: InsightsData;
  filters: InsightsFilters;
  range: DateRange;
}) {
  const people = data.people.filter(
    (person) =>
      matchesAudience(person.isNewcomer, filters) &&
      inRange(person.signedUpAt, range),
  );
  const requested = people.filter((person) => person.outcome !== "no_requests");
  const connected = requested.filter((person) => person.outcome === "connected");
  const pluggedIn = connected.filter((person) => person.pluggedIn);
  const connectedRate = percent(connected.length, requested.length);
  const who = filters.who === "newcomers" ? "newcomers" : "people";

  const parts = connectionParts.map((part) => ({
    ...part,
    count: requested.filter((person) => person.furthestStage === part.key).length,
  }));
  const barTotal = parts.reduce((sum, part) => sum + part.count, 0);
  const notYet = parts.filter((part) => part.notYet).reduce((sum, part) => sum + part.count, 0);

  const archived = data.requests.filter(
    (request) =>
      request.status === "archived" &&
      matchesAudience(request.isNewcomer, filters) &&
      inRange(request.archivedAt, range),
  );
  const reasonCounts = new Map<string, number>();
  for (const request of archived) {
    const reason = request.archiveReason?.trim() || noReason;
    reasonCounts.set(reason, (reasonCounts.get(reason) ?? 0) + 1);
  }
  const reasons = [...reasonCounts.entries()]
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count || a.reason.localeCompare(b.reason));
  const mostReasons = reasons[0]?.count ?? 0;

  const waits = archived
    .filter((request) => request.archiveReason?.trim() === noLongerInterestedReason)
    .map((request) => daysBetween(request.requestedAt, request.archivedAt ?? request.requestedAt));
  const waitMedian = median(waits);
  const bands = waitBands.map((band, index) => ({
    ...band,
    count: waits.filter(
      (days) => days <= band.max && (index === 0 || days > waitBands[index - 1].max),
    ).length,
  }));

  return (
    <div className="mt-6">
      <TabHeading>Are people getting connected?</TabHeading>
      <Scope>
        {who === "people" ? "Everyone" : "Newcomers"} who signed up{" "}
        {describeRange(range)} and asked to join a group, counted in people,
        not requests.
      </Scope>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <Headline
          title={measures.connectedRate.label}
          value={requested.length ? `${connectedRate}%` : "No requests"}
        >
          {requested.length
            ? `${connected.length} of ${plural(requested.length, "person", "people")} who asked to join a group are connected: they have been to a group at least once.`
            : "Nobody who signed up in these dates has asked to join a group yet."}
        </Headline>
        <Headline
          title={measures.pluggedInRate.label}
          value={connected.length ? `${percent(pluggedIn.length, connected.length)}%` : "None yet"}
        >
          {connected.length
            ? `${pluggedIn.length} of ${connected.length} connected ${connected.length === 1 ? "person was" : "people were"} then added to the group by its leader. This counts people who have since left, so it isn't how many are in a group today.`
            : "Nobody in these dates is connected yet."}
        </Headline>
      </div>

      <div className="mt-5">
        <ChartCard
          title="Where has everyone who asked got to?"
          description={
            barTotal
              ? `${plural(barTotal, "person", "people")}, by their furthest stage. ${notYet} not yet connected.`
              : undefined
          }
        >
          {barTotal === 0 ? (
            <EmptyChart>Nobody has asked to join a group in these dates.</EmptyChart>
          ) : (
            <>
              <div
                className="flex h-10 w-full overflow-hidden rounded-lg"
                role="img"
                aria-label={parts.map((part) => `${part.label} ${part.count}`).join(", ")}
              >
                {parts
                  .filter((part) => part.count > 0)
                  .map((part) => (
                    <div
                      key={part.key}
                      title={`${part.label}: ${plural(part.count, "person", "people")} (${percent(part.count, barTotal)}%)`}
                      className="h-full transition-[flex-grow] duration-500 hover:opacity-80"
                      style={{ flexGrow: part.count, flexBasis: 0, background: part.color }}
                    />
                  ))}
              </div>
              <ul className="mt-4 grid gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
                {parts.map((part) => (
                  <li key={part.key} className="flex items-center gap-2 text-sm">
                    <span
                      aria-hidden
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ background: part.color }}
                    />
                    <span>
                      {part.notYet ? `${outcomes.notYetConnected.label}: ${part.label}` : part.label}
                    </span>
                    <span className="text-muted-foreground">
                      {part.count} · {percent(part.count, barTotal)}%
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </ChartCard>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <ChartCard
          title="Why were requests closed?"
          description={
            archived.length
              ? `${plural(archived.length, "request")} archived ${describeRange(range)}, by the reason the leader gave.`
              : undefined
          }
        >
          {archived.length === 0 ? (
            <EmptyChart>No requests were archived in these dates.</EmptyChart>
          ) : (
            <>
              <ul className="flex flex-col gap-3">
                {reasons.map(({ reason, count }) => (
                  <li key={reason}>
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="flex items-center gap-2">
                        {reason}
                        {reReferralReasons.includes(reason) ? (
                          <Badge variant="info">Offer another group</Badge>
                        ) : null}
                      </span>
                      <span className="text-muted-foreground">
                        {count} · {percent(count, archived.length)}%
                      </span>
                    </div>
                    <div className="mt-1 h-2 rounded-full bg-muted">
                      <div
                        className="h-2 rounded-full transition-[width] duration-500"
                        style={{
                          width: `${(count / mostReasons) * 100}%`,
                          background: archivedColor,
                        }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-muted-foreground text-sm">
                {reReferralReasons.join(" and ")} mean the person still wants a
                group, so they are worth offering another one.
              </p>
            </>
          )}
        </ChartCard>
        <ChartCard
          title={`How long had people waited before "${noLongerInterestedReason}"?`}
          description={
            waits.length
              ? `${plural(waits.length, "request")}, from the request to being archived. Half had waited ${plural(waitMedian ?? 0, "day")} or less.`
              : undefined
          }
        >
          {waits.length === 0 ? (
            <EmptyChart>No requests were archived for this reason in these dates.</EmptyChart>
          ) : (
            <ul className="flex flex-col gap-3">
              {bands.map((band) => (
                <li key={band.label}>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span>{band.label}</span>
                    <span className="text-muted-foreground">
                      {band.count} · {percent(band.count, waits.length)}%
                    </span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-muted">
                    <div
                      className="h-2 rounded-full transition-[width] duration-500"
                      style={{
                        width: `${percent(band.count, waits.length)}%`,
                        background: "var(--brand-pink)",
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </ChartCard>
      </div>
    </div>
  );
}
