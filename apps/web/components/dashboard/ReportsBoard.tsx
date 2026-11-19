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
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsPanel, TabsTab } from "@/components/ui/tabs";
import { FOLLOW_UP_SLA } from "@/lib/dashboard/queries";
import type {
  ReportGroup,
  ReportPerson,
  ReportsData,
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

const stages: { key: ReportPerson["pendingStage"] & string; label: string; color: string }[] = [
  { key: "not-reached", label: stageTerms.notContacted.label, color: "var(--chart-stage-1)" },
  { key: "reached-out", label: stageTerms.reachedOut.label, color: "var(--chart-stage-2)" },
  { key: "invited", label: stageTerms.spokenTo.label, color: "var(--chart-stage-3)" },
  { key: "attended", label: stageTerms.attended.label, color: "var(--chart-stage-4)" },
];

const audiences = [
  { label: "Everyone", value: "all" },
  { label: "Newcomers", value: "newcomers" },
];

const chartFont = { fontFamily: "inherit" } as const;
const axisTick = { fill: "var(--muted-foreground)", fontSize: 12 };

interface Slice {
  key: string;
  label: string;
  value: number;
  color: string;
}

interface MonthRow {
  month: string;
  total: number;
  attended: number;
  requested: number;
  downloaded: number;
}

function monthKey(timestamp: string) {
  return timestamp.slice(0, 7);
}

function lastSixMonths(now: Date) {
  return Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const label = date.toLocaleDateString("en-GB", {
      month: "short",
      year: "numeric",
    });
    return { key, label };
  });
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

function signupMonths(people: ReportPerson[], now: Date): MonthRow[] {
  return lastSixMonths(now).map(({ key, label }) => {
    const counts = { attended: 0, requested: 0, downloaded: 0 };
    for (const person of people) {
      if (monthKey(person.createdAt) === key) counts[person.outcome] += 1;
    }
    return {
      month: label,
      ...counts,
      total: counts.attended + counts.requested + counts.downloaded,
    };
  });
}

function DownloadsReport({ people }: { people: ReportPerson[] }) {
  const [audience, setAudience] = useState(audiences[0]);
  const visible =
    audience.value === "newcomers"
      ? people.filter((person) => person.isNewcomer)
      : people;
  const slices: Slice[] = outcomes.map((outcome) => ({
    key: outcome.key,
    label: outcome.label,
    color: outcome.color,
    value: visible.filter((person) => person.outcome === outcome.key).length,
  }));
  const months = signupMonths(visible, new Date());

  return (
    <div className="mt-6">
      <Select
        items={audiences}
        value={audience}
        onValueChange={(value) => {
          if (value) setAudience(value);
        }}
      >
        <SelectTrigger className="w-44" aria-label="Who to include">
          <SelectValue />
        </SelectTrigger>
        <SelectPopup>
          {audiences.map((item) => (
            <SelectItem key={item.value} value={item}>
              {item.label}
            </SelectItem>
          ))}
        </SelectPopup>
      </Select>

      <h2 className="mt-6 font-heading text-2xl font-bold">
        How many new downloads?
      </h2>
      <p className="mt-2 max-w-2xl text-muted-foreground text-sm">
        Attended means they are in a group or have been to one. Requested
        means they asked to join and are still waiting. Downloaded means they
        signed up and are not connected to a group yet.
      </p>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <ChartCard title="Total people">
          <Donut slices={slices} centreLabel="Total" />
        </ChartCard>
        <ChartCard
          title="People by the month they signed up"
          description="Last 6 months, split by where they are now."
        >
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={months} style={chartFont} margin={{ top: 28 }}>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis dataKey="month" tick={axisTick} axisLine={false} tickLine={false} />
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
                    return (
                      <ChartTip
                        title={String(label)}
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
                    <LabelList
                      dataKey="total"
                      content={renderStackTotal(months, outcome.key, (row) =>
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
          </p>
        </ChartCard>
      </div>
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

function PipelineReport({ people }: { people: ReportPerson[] }) {
  const rows = stages.map((stage) => ({
    stage: stage.label,
    color: stage.color,
    people: people.filter((person) => person.pendingStage === stage.key).length,
  }));
  const total = rows.reduce((sum, row) => sum + row.people, 0);

  return (
    <div className="mt-6">
      <h2 className="font-heading text-2xl font-bold">
        How is the pipeline looking?
      </h2>
      <p className="mt-2 max-w-2xl text-muted-foreground text-sm">
        Open follow-ups, by the furthest stage recorded on the request.
      </p>
      <div className="mt-6">
        <ChartCard title="Pending requests by stage">
          {total === 0 ? (
            <p className="text-muted-foreground text-sm">
              No open follow-ups.
            </p>
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

function GroupsReport({ groups }: { groups: ReportGroup[] }) {
  return (
    <div className="mt-6">
      <h2 className="font-heading text-2xl font-bold">How are my groups doing?</h2>
      <p className="mt-2 max-w-2xl text-muted-foreground text-sm">
        Active members in each approved group. Darker bars are at capacity.
      </p>
      <div className="mt-6">
        <ChartCard title="Members by group">
          {groups.length === 0 ? (
            <p className="text-muted-foreground text-sm">No approved groups yet.</p>
          ) : (
            <div style={{ height: Math.max(280, groups.length * 36) }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={groups}
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
                      const group = item.payload as ReportGroup;
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
                    {groups.map((group) => (
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

function teamSlice(people: ReportPerson[], now: number): Slice[] {
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

function TeamReport({ people }: { people: ReportPerson[] }) {
  const [now] = useState(() => Date.now());

  return (
    <div className="mt-6">
      <h2 className="font-heading text-2xl font-bold">How are we doing as a team?</h2>
      <p className="mt-2 max-w-2xl text-muted-foreground text-sm">
        Open follow-ups. A request needs attention once it passes the follow-up
        window, counted from the day they asked.
      </p>
      <div className="mt-6">
        <ChartCard title="Open follow-ups">
          <Donut slices={teamSlice(people, now)} centreLabel="Open" />
        </ChartCard>
      </div>
    </div>
  );
}

function NewcomersReport({ people }: { people: ReportPerson[] }) {
  const slices: Slice[] = [
    {
      key: "newcomer",
      label: personTerms.newcomer.label,
      color: "var(--brand-pink)",
      value: people.filter((person) => person.isNewcomer).length,
    },
    {
      key: "returning",
      label: personTerms.existingMember.label,
      color: "var(--brand-dark)",
      value: people.filter((person) => !person.isNewcomer).length,
    },
  ];
  const months = lastSixMonths(new Date()).map(({ key, label }) => {
    const joined = people.filter((person) => monthKey(person.createdAt) === key);
    const newcomer = joined.filter((person) => person.isNewcomer).length;
    return { month: label, newcomer, returning: joined.length - newcomer, total: joined.length };
  });

  return (
    <div className="mt-6">
      <h2 className="font-heading text-2xl font-bold">Newcomers</h2>
      <p className="mt-2 max-w-2xl text-muted-foreground text-sm">
        The newcomer flag is how someone is marked today, not the month they
        arrived.
      </p>
      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <ChartCard title="Newcomers at your church">
          <Donut slices={slices} centreLabel="People" />
        </ChartCard>
        <ChartCard
          title="Who signed up, last 6 months"
          description="Split by whether they are marked as a newcomer now."
        >
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={months} style={chartFont} margin={{ top: 28 }}>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis dataKey="month" tick={axisTick} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={axisTick} axisLine={false} tickLine={false} width={28} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    return (
                      <ChartTip
                        title={String(label)}
                        rows={payload.map((item) => ({
                          label: String(item.name),
                          value: Number(item.value),
                          color: item.color,
                        }))}
                      />
                    );
                  }}
                />
                <Bar dataKey="returning" name={personTerms.existingMember.label} stackId="joined" fill="var(--brand-dark)" maxBarSize={40}>
                  <LabelList
                    dataKey="total"
                    content={renderStackTotal(months, "returning", (row) =>
                      row.newcomer ? "newcomer" : "returning",
                    )}
                  />
                </Bar>
                <Bar dataKey="newcomer" name={personTerms.newcomer.label} stackId="joined" fill="var(--brand-pink)" maxBarSize={40} radius={[4, 4, 0, 0]}>
                  <LabelList
                    dataKey="total"
                    content={renderStackTotal(months, "newcomer", (row) =>
                      row.newcomer ? "newcomer" : "returning",
                    )}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>
    </div>
  );
}

function connectionSlices(people: ReportPerson[]): Slice[] {
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

function ConnectionReport({ people }: { people: ReportPerson[] }) {
  return (
    <div className="mt-6">
      <h2 className="font-heading text-2xl font-bold">Connection</h2>
      <p className="mt-2 max-w-2xl text-muted-foreground text-sm">
        Asked for help means they told us they cannot find a group and they
        are not in one yet.
      </p>
      <div className="mt-6">
        <ChartCard title="How people are connected">
          <Donut slices={connectionSlices(people)} centreLabel="People" />
        </ChartCard>
      </div>
    </div>
  );
}

const tabs = [
  { value: "downloads", label: "Downloads" },
  { value: "pipeline", label: "Pipeline" },
  { value: "groups", label: "Groups" },
  { value: "team", label: "Team" },
  { value: "newcomers", label: "Newcomers" },
  { value: "connection", label: "Connection" },
];

export function ReportsBoard({ data }: { data: ReportsData }) {
  return (
    <Tabs defaultValue="downloads" className="mt-8 gap-0">
      <div className="overflow-x-auto overflow-y-hidden border-b pb-px">
        <TabsList variant="underline" className="w-max justify-start">
          {tabs.map((tab) => (
            <TabsTab key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTab>
          ))}
        </TabsList>
      </div>
      <TabsPanel value="downloads">
        <DownloadsReport people={data.people} />
      </TabsPanel>
      <TabsPanel value="pipeline">
        <PipelineReport people={data.people} />
      </TabsPanel>
      <TabsPanel value="groups">
        <GroupsReport groups={data.groups} />
      </TabsPanel>
      <TabsPanel value="team">
        <TeamReport people={data.people} />
      </TabsPanel>
      <TabsPanel value="newcomers">
        <NewcomersReport people={data.people} />
      </TabsPanel>
      <TabsPanel value="connection">
        <ConnectionReport people={data.people} />
      </TabsPanel>
    </Tabs>
  );
}
