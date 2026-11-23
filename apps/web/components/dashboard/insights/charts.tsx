"use client";

import type { ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Rectangle,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type BarShapeProps,
} from "recharts";
import {
  Card,
  CardDescription,
  CardHeader,
  CardPanel,
  CardTitle,
} from "@/components/ui/card";
import type { Period } from "@/lib/dashboard/insights-filters";
import type { PeriodRow } from "@/lib/dashboard/insights-measures";

export const chartFont = { fontFamily: "inherit" } as const;
export const axisTick = { fill: "var(--muted-foreground)", fontSize: 12 };
/** The current week, month or quarter is drawn paler, because it isn't over. */
export const inProgressOpacity = 0.45;

/** Archived, in every chart. */
export const archivedColor = "var(--brand-dark)";
/** No requests: a pale neutral, so it reads as "not started". */
export const noRequestsColor = "color-mix(in srgb, var(--brand-dark) 22%, transparent)";

export interface Series<K extends string = string> {
  key: K;
  label: string;
  color: string;
}

export function ChartCard({
  title,
  description,
  action,
  children,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="text-xl">{title}</CardTitle>
          {action}
        </div>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardPanel className="flex flex-1 flex-col">{children}</CardPanel>
    </Card>
  );
}

/** An empty panel's message, centred in whatever space the card has. */
export function EmptyChart({ children }: { children: ReactNode }) {
  return (
    <p className="flex min-h-32 flex-1 items-center justify-center text-center font-heading font-semibold text-muted-foreground/60 text-xl">
      {children}
    </p>
  );
}

export function ChartTip({
  title,
  rows,
}: {
  title: string;
  rows: { label: string; value: ReactNode; color?: string }[];
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

/** Says who and when a tab counts, so every number says what it counts. */
export function Scope({ children }: { children: ReactNode }) {
  return <p className="mt-2 max-w-2xl text-muted-foreground text-sm">{children}</p>;
}

export function TabHeading({ children }: { children: ReactNode }) {
  return <h2 className="font-heading text-2xl font-bold">{children}</h2>;
}

export function Legend({ series }: { series: Series[] }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1" aria-label="Legend">
      {series.map((item) => (
        <li key={item.key} className="flex items-center gap-2 text-sm">
          <span
            aria-hidden
            className="size-2.5 shrink-0 rounded-full"
            style={{ background: item.color }}
          />
          <span className="text-muted-foreground">{item.label}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * One segment of a stacked bar. Only the highest segment with anything in it
 * gets the rounded top and the total, so every bar looks the same whichever
 * series is on top.
 */
function StackSegment<K extends string>({
  seriesKey,
  stackOrder,
  ...props
}: BarShapeProps & { seriesKey: K; stackOrder: readonly K[] }) {
  const row = props.payload as PeriodRow<K>;
  const top = [...stackOrder].reverse().find((key) => row[key] > 0);
  const isTop = top === seriesKey;
  const x = Number(props.x ?? 0);
  const y = Number(props.y ?? 0);
  const width = Number(props.width ?? 0);

  return (
    <g>
      <Rectangle
        {...props}
        radius={isTop ? [4, 4, 0, 0] : 0}
        fillOpacity={row.inProgress ? inProgressOpacity : 1}
      />
      {isTop ? (
        <text
          x={x + width / 2}
          y={y - 8}
          textAnchor="middle"
          fill="var(--foreground)"
          fontSize={12}
        >
          {row.total}
        </text>
      ) : null}
    </g>
  );
}

/** A count per week, month or quarter, stacked by series, with the total on top. */
export function StackedPeriodChart<K extends string>({
  rows,
  series,
  period,
  unit,
}: {
  rows: PeriodRow<K>[];
  series: Series<K>[];
  period: Period;
  /** What a bar counts, for the tooltip total: "People" or "Requests". */
  unit: string;
}) {
  const order = series.map((item) => item.key);
  const hasInProgress = rows.some((row) => row.inProgress);

  return (
    <>
      <Legend series={series} />
      <div className="mt-4 h-72">
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
              cursor={{ fill: "var(--accent)", opacity: 0.4 }}
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const row = payload[0]?.payload as PeriodRow<K> | undefined;
                return (
                  <ChartTip
                    title={
                      row?.inProgress
                        ? `${String(label)}, in progress`
                        : String(label)
                    }
                    rows={[
                      ...[...payload].reverse().map((item) => ({
                        label: String(item.name),
                        value: Number(item.value),
                        color: item.color,
                      })),
                      { label: unit, value: row?.total ?? 0 },
                    ]}
                  />
                );
              }}
            />
            {series.map((item) => (
              <Bar
                key={item.key}
                dataKey={item.key}
                name={item.label}
                stackId="total"
                fill={item.color}
                maxBarSize={40}
                shape={(props: BarShapeProps) => (
                  <StackSegment {...props} seriesKey={item.key} stackOrder={order} />
                )}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      {hasInProgress ? (
        <p className="mt-2 text-center text-muted-foreground text-xs">
          The paler bar is this {period}, which is still in progress.
        </p>
      ) : null}
    </>
  );
}
