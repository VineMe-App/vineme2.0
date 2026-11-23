"use client";

import {
  describeRange,
  inRange,
  type DateRange,
  type InsightsFilters,
} from "@/lib/dashboard/insights-filters";
import {
  countByPeriod,
  matchesAudience,
  plural,
  requestsIn,
} from "@/lib/dashboard/insights-measures";
import type { InsightsData, PersonOutcome } from "@/lib/dashboard/types";
import { outcomes, requestStatuses } from "@/lib/dashboard/terms";
import {
  archivedColor,
  ChartCard,
  EmptyChart,
  noRequestsColor,
  Scope,
  StackedPeriodChart,
  TabHeading,
  type Series,
} from "./charts";

type RequestSeries = "pending" | "active" | "inactive" | "archived";

/** Bottom of the stack first. */
const peopleSeries: Series<PersonOutcome>[] = [
  { key: "connected", label: outcomes.connected.label, color: "var(--chart-stage-4)" },
  { key: "not_yet_connected", label: outcomes.notYetConnected.label, color: "var(--chart-stage-1)" },
  { key: "archived", label: outcomes.archived.label, color: archivedColor },
  { key: "no_requests", label: outcomes.noRequests.label, color: noRequestsColor },
];

/**
 * An added or left request that never reached Attended. It should never
 * happen, so it only gets a series when there is one.
 */
const checkDataSeries: Series<PersonOutcome> = {
  key: "check_data",
  label: "Needs a data check",
  color: "var(--chart-stage-2)",
};

const requestSeries: Series<RequestSeries>[] = [
  { key: "active", label: requestStatuses.added.label, color: "var(--chart-stage-4)" },
  { key: "inactive", label: requestStatuses.left.label, color: "var(--chart-stage-3)" },
  { key: "pending", label: requestStatuses.pending.label, color: "var(--chart-stage-1)" },
  { key: "archived", label: requestStatuses.archived.label, color: archivedColor },
];

const requestKeys = requestSeries.map((item) => item.key);

export function ActivityTab({
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
  const people = data.people.filter(
    (person) =>
      matchesAudience(person.isNewcomer, filters) &&
      inRange(person.signedUpAt, range),
  );
  const requests = requestsIn(data.requests, filters, range);
  const who = filters.who === "newcomers" ? "Newcomers" : "Everyone";

  const shownPeopleSeries = people.some((person) => person.outcome === "check_data")
    ? [...peopleSeries, checkDataSeries]
    : peopleSeries;
  const peopleRows = countByPeriod(
    people,
    (person) => person.signedUpAt,
    (person) => person.outcome,
    shownPeopleSeries.map((item) => item.key),
    range,
    filters.by,
    now,
  );
  const requestRows = countByPeriod(
    requests,
    (request) => request.requestedAt,
    (request) =>
      requestKeys.includes(request.status as RequestSeries)
        ? (request.status as RequestSeries)
        : null,
    requestKeys,
    range,
    filters.by,
    now,
  );

  return (
    <div className="mt-6">
      <TabHeading>How many people are signing up and asking to join?</TabHeading>
      <Scope>
        {who} {describeRange(range)}. People are counted by the day they signed
        up and requests by the day they were made, so one person can sign up in
        one {filters.by} and ask to join a group in another.
      </Scope>

      <div className="mt-6 grid gap-5">
        <ChartCard
          title={`People by the ${filters.by} they signed up`}
          description={`${plural(people.length, "person", "people")}, split by where they are now.`}
        >
          {people.length === 0 ? (
            <EmptyChart>Nobody signed up in these dates.</EmptyChart>
          ) : (
            <StackedPeriodChart
              rows={peopleRows}
              series={shownPeopleSeries}
              period={filters.by}
              unit="People"
            />
          )}
        </ChartCard>
        <ChartCard
          title={`Requests by the ${filters.by} they were made`}
          description={`${plural(requests.length, "request")}, split by what has happened to them since.`}
        >
          {requests.length === 0 ? (
            <EmptyChart>No requests in these dates.</EmptyChart>
          ) : (
            <StackedPeriodChart
              rows={requestRows}
              series={requestSeries}
              period={filters.by}
              unit="Requests"
            />
          )}
        </ChartCard>
      </div>
    </div>
  );
}
