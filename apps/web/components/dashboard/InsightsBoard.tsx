"use client";

import { useState, type ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Card,
  CardDescription,
  CardHeader,
  CardPanel,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsPanel, TabsTab } from "@/components/ui/tabs";
import {
  audienceOptions,
  describeRange,
  inRange,
  periodBuckets,
  periodOptions,
  rangeOptions,
  resolveRange,
  tabOptions,
  toIsoDate,
  type DateRange,
  type InsightsFilters,
  type InsightsTab,
  type Period,
} from "@/lib/dashboard/insights-filters";
import { FOLLOW_UP_SLA } from "@/lib/dashboard/queries";
import type {
  InsightsData,
  InsightsGroup,
  InsightsPerson,
  SignupOutcome,
} from "@/lib/dashboard/types";
import {
  followUpStates,
  people as personTerms,
  requestStatuses,
  stages as stageTerms,
} from "@/lib/dashboard/terms";

const outcomes: { key: SignupOutcome; label: string; color: string }[] = [
  { key: "attended", label: "Attended", color: "var(--brand-pink)" },
  { key: "requested", label: "Requested", color: "var(--chart-stage-1)" },
  { key: "downloaded", label: "Downloaded", color: "var(--brand-dark)" },
];

const stages: { key: InsightsPerson["pendingStage"] & string; label: string; color: string }[] = [
  { key: "not-reached", label: stageTerms.notContacted.label, color: "var(--chart-stage-1)" },
  { key: "reached-out", label: stageTerms.reachedOut.label, color: "var(--chart-stage-2)" },
  { key: "invited", label: stageTerms.spokenTo.label, color: "var(--chart-stage-3)" },
  { key: "attended", label: stageTerms.attended.label, color: "var(--chart-stage-4)" },
];

const chartFont = { fontFamily: "inherit" } as const;
const axisTick = { fill: "var(--muted-foreground)", fontSize: 12 };
/** The current week, month or quarter is drawn paler, because it isn't over. */
const inProgressOpacity = 0.45;

interface Slice {
  key: string;
  label: string;
  value: number;
  color: string;
}

function ChartCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardPanel>{children}</CardPanel>
    </Card>
  );
}

function LegendList({ items }: { items: Slice[] }) {
  const total = items.reduce((sum, item) => sum + item.value, 0);

  return (
    <ul className="flex flex-col gap-2" aria-label="Legend">
      {items.map((item) => {
        const share = total ? Math.round((item.value / total) * 100) : 0;
        return (
          <li key={item.key} className="flex items-center gap-2 text-sm">
            <span
              aria-hidden
              className="size-2.5 shrink-0 rounded-full"
              style={{ background: item.color }}
            />
            <span className="text-foreground">{item.label}</span>
            <span className="text-muted-foreground">
              {item.value} · {share}%
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function renderSliceLabel({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
}: {
  cx?: number;
  cy?: number;
  midAngle?: number;
  innerRadius?: number;
  outerRadius?: number;
  percent?: number;
}) {
  if (!percent || percent < 0.05 || cx == null || cy == null || midAngle == null) {
    return null;
  }
  const radius = (Number(innerRadius) + Number(outerRadius)) / 2;
  const radians = (-midAngle * Math.PI) / 180;
  return (
    <text
      x={cx + radius * Math.cos(radians)}
      y={cy + radius * Math.sin(radians)}
      textAnchor="middle"
      dominantBaseline="central"
      fill="white"
      fontSize={12}
    >
      {`${Math.round(percent * 100)}%`}
    </text>
  );
}

function Donut({
  slices,
  centreLabel,
}: {
  slices: Slice[];
  centreLabel: string;
}) {
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);
  if (total === 0) {
    return <p className="text-muted-foreground text-sm">Nothing to show yet.</p>;
  }

  return (
    <div className="mt-2 flex flex-col items-center gap-6 sm:flex-row sm:justify-center">
      <LegendList items={slices} />
      <div className="relative h-64 w-full max-w-72">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart style={chartFont}>
            <Pie
              data={slices}
              dataKey="value"
              nameKey="label"
              innerRadius="58%"
              outerRadius="78%"
              paddingAngle={2}
              stroke="none"
              labelLine={false}
              label={renderSliceLabel}
            >
              {slices.map((slice) => (
                <Cell key={slice.key} fill={slice.color} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                const item = payload?.[0];
                if (!active || !item) return null;
                return (
                  <ChartTip
                    title={String(item.name)}
                    rows={[{ label: centreLabel, value: Number(item.value) }]}
                  />
                );
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-heading text-3xl font-bold">{total}</span>
          <span className="text-muted-foreground text-xs">{centreLabel}</span>
        </div>
      </div>
    </div>
  );
}

function ChartTip({
  title,
  rows,
}: {
  title: string;
  rows: { label: string; value: number; color?: string }[];
}) {
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="font-medium text-foreground">{title}</p>
      {rows.map((row) => (
        <p key={row.label} className="mt-1 flex items-center gap-2">
          {row.color ? (
            <span
              aria-hidden
              className="size-2 rounded-full"
              style={{ background: row.color }}
            />
          ) : null}
          <span className="text-muted-foreground">{row.label}</span>
          <span className="font-medium text-foreground">{row.value}</span>
        </p>
      ))}
    </div>
  );
}

function renderStackTotal<T extends { total: number }>(
  rows: T[],
  series: string,
  topSeries: (row: T) => string,
) {
  return function StackTotal({
    viewBox,
    index,
  }: {
    viewBox?: { x?: number; y?: number; width?: number; cx?: number };
    index?: number;
  }) {
    const row = index != null ? rows[index] : undefined;
    if (!row?.total || !viewBox || topSeries(row) !== series) return <text />;

    const x = Number(viewBox.x ?? 0);
    const y = Number(viewBox.y ?? 0);
    const width = Number(viewBox.width ?? 0);

    return (
      <text
        x={x + width / 2}
        y={y - 8}
        textAnchor="middle"
        fill="var(--foreground)"
        fontSize={12}
      >
        {row.total}
      </text>
    );
  };
}

/** Says who and when a tab counts, so every number says what it counts. */
function Scope({ children }: { children: ReactNode }) {
  return <p className="mt-2 max-w-2xl text-muted-foreground text-sm">{children}</p>;
}

function who(filters: InsightsFilters) {
  return filters.who === "newcomers"
    ? `${personTerms.newcomer.label}s`
    : "Everyone";
}

function matchesAudience(isNewcomer: boolean, filters: InsightsFilters) {
  return filters.who === "everyone" || isNewcomer;
}

interface SignupRow {
  key: string;
  label: string;
  inProgress: boolean;
  total: number;
  attended: number;
  requested: number;
  downloaded: number;
}

function signupRows(
  people: InsightsPerson[],
  range: DateRange,
  period: Period,
  now: Date,
): SignupRow[] {
  const earliest = people.reduce<Date | null>((first, person) => {
    const created = new Date(person.createdAt);
    return !first || created < first ? created : first;
  }, null);
  const start = range.start ?? earliest;
  if (!start) return [];

  return periodBuckets(start, range.end, period, now).map((bucket) => {
    const counts = { attended: 0, requested: 0, downloaded: 0 };
    for (const person of people) {
      const created = new Date(person.createdAt).getTime();
      if (created >= bucket.start.getTime() && created < bucket.end.getTime()) {
        counts[person.outcome] += 1;
      }
    }
    return {
      key: bucket.key,
      label: bucket.label,
      inProgress: bucket.inProgress,
      ...counts,
      total: counts.attended + counts.requested + counts.downloaded,
    };
  });
}

function ActivityTab({
  people,
  filters,
  range,
  now,
}: {
  people: InsightsPerson[];
  filters: InsightsFilters;
  range: DateRange;
  now: Date;
}) {
  const visible = people.filter(
    (person) =>
      matchesAudience(person.isNewcomer, filters) &&
      inRange(person.createdAt, range),
  );
  const slices: Slice[] = outcomes.map((outcome) => ({
    key: outcome.key,
    label: outcome.label,
    color: outcome.color,
    value: visible.filter((person) => person.outcome === outcome.key).length,
  }));
  const rows = signupRows(visible, range, filters.by, now);
  const hasInProgress = rows.some((row) => row.inProgress);

  return (
    <div className="mt-6">
      <h2 className="font-heading text-2xl font-bold">
        How many people are signing up?
      </h2>
      <Scope>
        {who(filters)} who signed up {describeRange(range)}. Attended means
        they are in a group or have been to one. Requested means they asked to
        join and are still waiting. Downloaded means they signed up and are not
        connected to a group yet.
      </Scope>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <ChartCard title="Who signed up">
          <Donut slices={slices} centreLabel="People" />
        </ChartCard>
        <ChartCard
          title={`People by the ${filters.by} they signed up`}
          description="Split by where they are now."
        >
          {rows.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nothing to show yet.</p>
          ) : (
            <>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={rows} style={chartFont} margin={{ top: 28 }}>
                    <CartesianGrid vertical={false} stroke="var(--border)" />
                    <XAxis
                      dataKey="label"
                      tick={axisTick}
                      axisLine={false}
                      tickLine={false}
                      minTickGap={8}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={axisTick}
                      axisLine={false}
                      tickLine={false}
                      width={28}
                    />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (!active || !payload?.length) return null;
                        const row = payload[0]?.payload as SignupRow | undefined;
                        return (
                          <ChartTip
                            title={
                              row?.inProgress
                                ? `${String(label)}, in progress`
                                : String(label)
                            }
                            rows={payload.map((item) => ({
                              label: String(item.name),
                              value: Number(item.value),
                              color: item.color,
                            }))}
                          />
                        );
                      }}
                    />
                    {outcomes.map((outcome) => (
                      <Bar
                        key={outcome.key}
                        dataKey={outcome.key}
                        name={outcome.label}
                        stackId="people"
                        fill={outcome.color}
                        maxBarSize={40}
                        radius={
                          outcome.key === "downloaded" ? [4, 4, 0, 0] : undefined
                        }
                      >
                        {rows.map((row) => (
                          <Cell
                            key={row.key}
                            fillOpacity={row.inProgress ? inProgressOpacity : 1}
                          />
                        ))}
                        <LabelList
                          dataKey="total"
                          content={renderStackTotal(rows, outcome.key, (row) =>
                            row.downloaded
                              ? "downloaded"
                              : row.requested
                                ? "requested"
                                : "attended",
                          )}
                        />
                      </Bar>
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="mt-2 text-center text-muted-foreground text-xs">
                {personTerms.signedUp.label}
                {hasInProgress
                  ? `. The paler bar is this ${filters.by}, which is still in progress.`
                  : null}
              </p>
            </>
          )}
        </ChartCard>
      </div>
    </div>
  );
}

function connectionSlices(people: InsightsPerson[]): Slice[] {
  const counts = { inGroup: 0, asked: 0, looking: 0 };
  for (const person of people) {
    if (person.outcome === "attended") counts.inGroup += 1;
    else if (person.askedForHelp) counts.asked += 1;
    else counts.looking += 1;
  }
  return [
    { key: "in-group", label: "In a group", value: counts.inGroup, color: "var(--brand-pink)" },
    { key: "asked", label: "Asked for help", value: counts.asked, color: "var(--chart-stage-1)" },
    { key: "looking", label: "Not connected", value: counts.looking, color: "var(--brand-dark)" },
  ];
}

function ResultsTab({
  people,
  filters,
  range,
}: {
  people: InsightsPerson[];
  filters: InsightsFilters;
  range: DateRange;
}) {
  const visible = people.filter(
    (person) =>
      matchesAudience(person.isNewcomer, filters) &&
      inRange(person.createdAt, range),
  );
  const rows = stages.map((stage) => ({
    stage: stage.label,
    color: stage.color,
    people: visible.filter((person) => person.pendingStage === stage.key).length,
  }));
  const total = rows.reduce((sum, row) => sum + row.people, 0);

  return (
    <div className="mt-6">
      <h2 className="font-heading text-2xl font-bold">
        Are people getting connected?
      </h2>
      <Scope>
        {who(filters)} who signed up {describeRange(range)}, and where they are
        now.
      </Scope>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <ChartCard
          title="Are people finding a group?"
          description="Asked for help means they told us they cannot find a group and they are not in one yet."
        >
          <Donut slices={connectionSlices(visible)} centreLabel="People" />
        </ChartCard>
        <ChartCard
          title="Where have open requests got to?"
          description="People with a pending request, by the furthest stage recorded on it."
        >
          {total === 0 ? (
            <p className="text-muted-foreground text-sm">No open follow-ups.</p>
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={rows} style={chartFont} margin={{ top: 20 }}>
                  <CartesianGrid vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="stage" tick={axisTick} axisLine={false} tickLine={false} />
                  <YAxis
                    allowDecimals={false}
                    tick={axisTick}
                    axisLine={false}
                    tickLine={false}
                    width={28}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      const item = payload?.[0];
                      if (!active || !item) return null;
                      return (
                        <ChartTip
                          title={String(label)}
                          rows={[
                            {
                              label: "People",
                              value: Number(item.value),
                              color: String(item.payload.color),
                            },
                          ]}
                        />
                      );
                    }}
                  />
                  <Bar dataKey="people" maxBarSize={48} radius={[4, 4, 0, 0]}>
                    {rows.map((row) => (
                      <Cell key={row.stage} fill={row.color} />
                    ))}
                    <LabelList dataKey="people" position="top" fill="var(--foreground)" fontSize={12} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>
      </div>
    </div>
  );
}

function GroupsTab({
  groups,
  filters,
  range,
}: {
  groups: InsightsGroup[];
  filters: InsightsFilters;
  range: DateRange;
}) {
  const rows = groups
    .map((group) => {
      const requests = group.requests.filter(
        (request) =>
          matchesAudience(request.isNewcomer, filters) &&
          inRange(request.requestedAt, range),
      );
      return {
        id: group.id,
        name: group.name,
        atCapacity: group.atCapacity,
        members: requests.filter((request) => request.status === "active").length,
        pending: requests.filter((request) => request.status === "pending").length,
      };
    })
    .sort((a, b) => b.members - a.members || a.name.localeCompare(b.name));
  type GroupRow = (typeof rows)[number];

  return (
    <div className="mt-6">
      <h2 className="font-heading text-2xl font-bold">How are our groups doing?</h2>
      <Scope>
        Members of each active group who asked to join {describeRange(range)}
        {filters.who === "newcomers"
          ? `, ${personTerms.newcomer.label.toLowerCase()}s only`
          : ""}
        . Darker bars are at capacity.
      </Scope>
      <div className="mt-6">
        <ChartCard title="Members by group">
          {rows.length === 0 ? (
            <p className="text-muted-foreground text-sm">No active groups yet.</p>
          ) : (
            <div style={{ height: Math.max(280, rows.length * 36) }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={rows}
                  layout="vertical"
                  style={chartFont}
                  margin={{ right: 24, left: 8 }}
                >
                  <CartesianGrid horizontal={false} stroke="var(--border)" />
                  <XAxis
                    type="number"
                    allowDecimals={false}
                    tick={axisTick}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={150}
                    tick={axisTick}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      const item = payload?.[0];
                      if (!active || !item) return null;
                      const group = item.payload as GroupRow;
                      return (
                        <ChartTip
                          title={group.name}
                          rows={[
                            { label: "Members", value: group.members },
                            { label: requestStatuses.pending.label, value: group.pending },
                          ]}
                        />
                      );
                    }}
                  />
                  <Bar dataKey="members" maxBarSize={18} radius={[0, 4, 4, 0]}>
                    {rows.map((group) => (
                      <Cell
                        key={group.id}
                        fill={
                          group.atCapacity
                            ? "var(--chart-stage-1)"
                            : "var(--brand-pink)"
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>
      </div>
    </div>
  );
}

function teamSlice(people: InsightsPerson[], now: number): Slice[] {
  const counts = { attention: 0, track: 0, attended: 0 };
  for (const person of people) {
    if (!person.pendingStage || !person.pendingSince) continue;
    if (person.pendingStage === "attended") {
      counts.attended += 1;
      continue;
    }
    const requested = new Date(person.pendingSince).getTime();
    const window =
      person.pendingStage === "not-reached"
        ? FOLLOW_UP_SLA.reachOut
        : person.pendingStage === "reached-out"
          ? FOLLOW_UP_SLA.afterReachOut
          : FOLLOW_UP_SLA.afterSpokenTo;
    const due = Math.min(
      requested + window * 864e5,
      requested + FOLLOW_UP_SLA.attendGroup * 864e5,
    );
    if (now > due) counts.attention += 1;
    else counts.track += 1;
  }
  return [
    { key: "attention", label: followUpStates.needsAttention.label, value: counts.attention, color: "var(--chart-stage-1)" },
    { key: "track", label: followUpStates.onTrack.label, value: counts.track, color: "var(--chart-stage-2)" },
    { key: "attended", label: followUpStates.attendedNotAdded.label, value: counts.attended, color: "var(--brand-pink)" },
  ];
}

function TeamTab({
  people,
  filters,
  range,
  now,
}: {
  people: InsightsPerson[];
  filters: InsightsFilters;
  range: DateRange;
  now: Date;
}) {
  const visible = people.filter(
    (person) =>
      matchesAudience(person.isNewcomer, filters) &&
      inRange(person.pendingSince, range),
  );

  return (
    <div className="mt-6">
      <h2 className="font-heading text-2xl font-bold">How are we doing as a team?</h2>
      <Scope>
        Open follow-ups for {who(filters).toLowerCase()} who asked to join{" "}
        {describeRange(range)}. A request needs attention once it passes the
        follow-up window, counted from the day they asked.
      </Scope>
      <div className="mt-6">
        <ChartCard title="Open follow-ups">
          <Donut slices={teamSlice(visible, now.getTime())} centreLabel="Open" />
        </ChartCard>
      </div>
    </div>
  );
}

function FilterSelect<T extends string>({
  label,
  options,
  value,
  onChange,
  disabled,
  className,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
  className?: string;
}) {
  const selected = options.find((option) => option.value === value) ?? options[0];
  return (
    <Select
      items={options}
      value={selected}
      disabled={disabled}
      onValueChange={(next) => {
        if (next) onChange(next.value);
      }}
    >
      <SelectTrigger className={className ?? "w-44"} aria-label={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectPopup>
        {options.map((option) => (
          <SelectItem key={option.value} value={option}>
            {option.label}
          </SelectItem>
        ))}
      </SelectPopup>
    </Select>
  );
}

/** Tabs with a chart over time, where week, month or quarter applies. */
const tabsOverTime: InsightsTab[] = ["activity"];

function FilterBar({
  filters,
  range,
  onChange,
}: {
  filters: InsightsFilters;
  range: DateRange;
  onChange: (changes: Partial<InsightsFilters>) => void;
}) {
  const periodApplies = tabsOverTime.includes(filters.tab);

  return (
    <div className="mt-6 flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <FilterSelect
          label="Who to include"
          options={audienceOptions}
          value={filters.who}
          onChange={(value) => onChange({ who: value })}
          className="w-36"
        />
        <FilterSelect
          label="Dates"
          options={rangeOptions}
          value={filters.range}
          onChange={(value) =>
            onChange(
              value === "custom"
                ? {
                    range: value,
                    from:
                      filters.from ??
                      (range.start ? toIsoDate(range.start) : null),
                    to: filters.to ?? toIsoDate(range.end),
                  }
                : { range: value, from: null, to: null },
            )
          }
        />
        {filters.range === "custom" ? (
          <div className="flex items-center gap-2">
            <Input
              type="date"
              aria-label="From"
              className="w-40"
              value={filters.from ?? ""}
              max={filters.to ?? undefined}
              onChange={(event) =>
                onChange({ from: event.currentTarget.value || null })
              }
            />
            <span className="text-muted-foreground text-sm">to</span>
            <Input
              type="date"
              aria-label="To"
              className="w-40"
              value={filters.to ?? ""}
              min={filters.from ?? undefined}
              onChange={(event) =>
                onChange({ to: event.currentTarget.value || null })
              }
            />
          </div>
        ) : null}
        <FilterSelect
          label="Group charts over time by"
          options={periodOptions}
          value={filters.by}
          onChange={(value) => onChange({ by: value })}
          disabled={!periodApplies}
          className="w-36"
        />
      </div>
      {!periodApplies ? (
        <p className="text-muted-foreground text-xs">
          Week, month or quarter changes the charts over time, which are on
          Activity for now.
        </p>
      ) : null}
    </div>
  );
}

export function InsightsBoard({
  data,
  filters,
  onChange,
}: {
  data: InsightsData;
  filters: InsightsFilters;
  onChange: (changes: Partial<InsightsFilters>) => void;
}) {
  const [now] = useState(() => new Date());
  const range = resolveRange(filters, now);

  return (
    <>
      <FilterBar filters={filters} range={range} onChange={onChange} />
      <Tabs
        value={filters.tab}
        onValueChange={(tab) => onChange({ tab: tab as InsightsTab })}
        className="mt-6 gap-0"
      >
        <div className="overflow-x-auto overflow-y-hidden border-b pb-px">
          <TabsList variant="underline" className="w-max justify-start">
            {tabOptions.map((tab) => (
              <TabsTab key={tab.value} value={tab.value}>
                {tab.label}
              </TabsTab>
            ))}
          </TabsList>
        </div>
        <TabsPanel value="activity">
          <ActivityTab people={data.people} filters={filters} range={range} now={now} />
        </TabsPanel>
        <TabsPanel value="results">
          <ResultsTab people={data.people} filters={filters} range={range} />
        </TabsPanel>
        <TabsPanel value="groups">
          <GroupsTab groups={data.groups} filters={filters} range={range} />
        </TabsPanel>
        <TabsPanel value="team">
          <TeamTab people={data.people} filters={filters} range={range} now={now} />
        </TabsPanel>
      </Tabs>
    </>
  );
}
