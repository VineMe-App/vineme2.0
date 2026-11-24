"use client";

import { useState } from "react";
import { ActivityTab } from "@/components/dashboard/insights/ActivityTab";
import { GroupsTab } from "@/components/dashboard/insights/GroupsTab";
import { ResultsTab } from "@/components/dashboard/insights/ResultsTab";
import { TeamTab } from "@/components/dashboard/insights/TeamTab";
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
  periodOptions,
  rangeOptions,
  resolveRange,
  tabOptions,
  toIsoDate,
  type DateRange,
  type InsightsFilters,
  type InsightsTab,
} from "@/lib/dashboard/insights-filters";
import type { InsightsData } from "@/lib/dashboard/types";

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
const tabsOverTime: InsightsTab[] = ["activity", "team"];

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
        {/* Only shown on tabs with a chart over time; the choice stays in the URL. */}
        {periodApplies ? (
          <FilterSelect
            label="Group charts over time by"
            options={periodOptions}
            value={filters.by}
            onChange={(value) => onChange({ by: value })}
            className="w-36"
          />
        ) : null}
      </div>
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
          <ActivityTab data={data} filters={filters} range={range} now={now} />
        </TabsPanel>
        <TabsPanel value="results">
          <ResultsTab data={data} filters={filters} range={range} />
        </TabsPanel>
        <TabsPanel value="groups">
          <GroupsTab data={data} filters={filters} range={range} onChange={onChange} />
        </TabsPanel>
        <TabsPanel value="team">
          <TeamTab data={data} filters={filters} range={range} now={now} />
        </TabsPanel>
      </Tabs>
    </>
  );
}
