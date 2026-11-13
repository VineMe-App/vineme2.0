"use client";

import { Search } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { MemberSheet } from "@/components/dashboard/MemberSheet";
import { MemberTableRow } from "@/components/dashboard/MemberTableRow";
import { Button } from "@/components/ui/button";
import {
  CardFrame,
  CardFrameDescription,
  CardFrameHeader,
  CardFrameTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fetchMembers } from "@/lib/dashboard/queries";
import type { Member } from "@/lib/dashboard/types";
import { useDashboardQuery } from "@/lib/dashboard/use-dashboard-query";
import { memberStatusVariants } from "@/lib/dashboard/utils";
import { cn } from "@/lib/utils";
import { DashboardPage } from "@/components/dashboard/DashboardPage";
import { people } from "@/lib/dashboard/terms";

const PAGE_SIZE = 25;
const NEW_WINDOW_DAYS = 30;

type StatusFilter = "all" | keyof typeof memberStatusVariants;
type Option = { label: string; value: string };

const roles = [people.admin.label, people.leader.label, "Congregation"];

const sortOptions: Option[] = [
  { label: "Newest first", value: "newest" },
  { label: "Oldest first", value: "oldest" },
  { label: "Name A to Z", value: "name" },
  { label: "Group A to Z", value: "group" },
];

const sorters: Record<string, (a: Member, b: Member) => number> = {
  newest: (a, b) => b.joinedAt.localeCompare(a.joinedAt),
  oldest: (a, b) => a.joinedAt.localeCompare(b.joinedAt),
  name: (a, b) => a.name.localeCompare(b.name),
  group: (a, b) => a.group.localeCompare(b.group) || a.name.localeCompare(b.name),
};

export default function MembersPage() {
  const result = useDashboardQuery(fetchMembers);
  const members = useMemo(() => result.data ?? [], [result.data]);

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [onlyNew, setOnlyNew] = useState(false);
  const [role, setRole] = useState<string>("all");
  const [groupFilter, setGroupFilter] = useState<Option>({
    label: "All groups",
    value: "all",
  });
  const [sort, setSort] = useState<Option>(sortOptions[0]);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [now] = useState(() => Date.now());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const selectedMember =
    members.find((member) => member.id === selectedId) ?? null;
  const handleSelect = (id: string) => {
    setSelectedId(id);
    setIsSheetOpen(true);
  };

  const isNew = useCallback(
    (member: Member) =>
      now - new Date(member.joinedAt).getTime() < NEW_WINDOW_DAYS * 864e5,
    [now],
  );

  const counts = useMemo(
    () => ({
      all: members.length,
      Connected: members.filter((m) => m.status === "Connected").length,
      "Pending follow-up": members.filter((m) => m.status === "Pending follow-up")
        .length,
      "Looking for a group": members.filter(
        (m) => m.status === "Looking for a group",
      ).length,
      new: members.filter(isNew).length,
    }),
    [members, isNew],
  );

  const groupOptions: Option[] = useMemo(() => {
    const names = [...new Set(members.map((m) => m.group))].sort((a, b) => {
      if (a === "Unassigned") return 1;
      if (b === "Unassigned") return -1;
      return a.localeCompare(b);
    });
    return [
      { label: "All groups", value: "all" },
      ...names.map((name) => ({ label: name, value: name })),
    ];
  }, [members]);

  const needle = query.trim().toLowerCase();
  const filtered = members
    .filter(
      (member) =>
        (status === "all" || member.status === status) &&
        (!onlyNew || isNew(member)) &&
        (role === "all" || member.role === role) &&
        (groupFilter.value === "all" || member.group === groupFilter.value) &&
        (!needle ||
          [member.name, member.group, member.role, member.status].some((value) =>
            value.toLowerCase().includes(needle),
          )),
    )
    .sort(sorters[sort.value]);
  const visible = filtered.slice(0, visibleCount);

  const hasFilters =
    status !== "all" ||
    onlyNew ||
    role !== "all" ||
    groupFilter.value !== "all" ||
    needle !== "";

  const clearFilters = () => {
    setQuery("");
    setStatus("all");
    setOnlyNew(false);
    setRole("all");
    setGroupFilter({ label: "All groups", value: "all" });
    setVisibleCount(PAGE_SIZE);
  };

  // Any filter change returns to the first page of results.
  const changeFilter = <T,>(setter: (value: T) => void) => (value: T) => {
    setter(value);
    setVisibleCount(PAGE_SIZE);
  };

  const stats: {
    label: string;
    count: number;
    isActive: boolean;
    onClick: () => void;
  }[] = [
    {
      label: "All members",
      count: counts.all,
      isActive: status === "all" && !onlyNew,
      onClick: () => {
        setStatus("all");
        setOnlyNew(false);
        setVisibleCount(PAGE_SIZE);
      },
    },
    ...(["Connected", "Pending follow-up", "Looking for a group"] as const).map(
      (name) => ({
        label: name,
        count: counts[name],
        isActive: status === name,
        onClick: () => {
          setStatus(status === name ? "all" : name);
          setVisibleCount(PAGE_SIZE);
        },
      }),
    ),
    {
      label: `New in ${NEW_WINDOW_DAYS} days`,
      count: counts.new,
      isActive: onlyNew,
      onClick: () => {
        setOnlyNew(!onlyNew);
        setVisibleCount(PAGE_SIZE);
      },
    },
  ];

  const isReady = result.status === "ready";

  return (
    <DashboardPage>
      <h1 className="font-heading text-3xl font-bold sm:text-4xl">Members</h1>
      <p className="mt-2 text-muted-foreground">
        Everyone connected to your church on VineMe. Select a number to filter.
      </p>

      <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-5">
        {stats.map((stat) => (
          <button
            key={stat.label}
            type="button"
            aria-pressed={stat.isActive}
            onClick={stat.onClick}
            className={cn(
              "rounded-2xl border bg-card p-4 text-left shadow-xs/5 outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              stat.isActive && "border-primary bg-accent ring-1 ring-primary",
            )}
          >
            <p className="font-heading text-3xl font-bold text-foreground">
              {isReady ? stat.count : "-"}
            </p>
            <p className="mt-1 text-muted-foreground text-sm">{stat.label}</p>
          </button>
        ))}
      </div>

      <CardFrame className="mt-6">
        <CardFrameHeader>
          <CardFrameTitle>
            {status === "all" ? "All members" : status}
          </CardFrameTitle>
          <CardFrameDescription>
            {result.status === "loading"
              ? "Loading..."
              : result.status === "error"
                ? "We could not load your members. Refresh to try again."
                : `${filtered.length} of ${members.length} people`}
          </CardFrameDescription>
        </CardFrameHeader>

        <div className="space-y-3 px-6 pb-4">
          <div className="flex flex-col gap-3 lg:flex-row">
            <div className="relative flex-1">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute start-3 top-1/2 z-10 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                className="[&_input]:ps-9"
                type="search"
                name="member-search"
                aria-label="Search members"
                placeholder="Search by name, group, role or status"
                value={query}
                onChange={(event) =>
                  changeFilter(setQuery)(event.target.value)
                }
              />
            </div>
            <div className="flex gap-3">
              <Select
                items={groupOptions}
                value={groupFilter}
                onValueChange={(value) => {
                  if (value) changeFilter(setGroupFilter)(value);
                }}
              >
                <SelectTrigger aria-label="Filter by group" className="min-w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectPopup>
                  {groupOptions.map((option) => (
                    <SelectItem key={option.value} value={option}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectPopup>
              </Select>
              <Select
                items={sortOptions}
                value={sort}
                onValueChange={(value) => {
                  if (value) setSort(value);
                }}
              >
                <SelectTrigger aria-label="Sort members" className="min-w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectPopup>
                  {sortOptions.map((option) => (
                    <SelectItem key={option.value} value={option}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectPopup>
              </Select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-muted-foreground text-sm">Role</span>
            {["all", ...roles].map((option) => (
              <Button
                key={option}
                size="sm"
                variant={role === option ? "default" : "outline"}
                aria-pressed={role === option}
                onClick={() => changeFilter(setRole)(option)}
              >
                {option === "all" ? "Any" : option}
              </Button>
            ))}
            {hasFilters ? (
              <Button size="sm" variant="link" onClick={clearFilters}>
                Clear filters
              </Button>
            ) : null}
          </div>
        </div>

        <Table variant="card" className="min-w-[720px]">
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Group</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>{people.signedUp.label}</TableHead>
              <TableHead>
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-8 text-center text-muted-foreground"
                >
                  {!isReady
                    ? result.status === "error"
                      ? "We could not load your members."
                      : "Loading..."
                    : members.length === 0
                      ? "No members yet."
                      : "No members match these filters."}
                  {isReady && members.length > 0 && hasFilters ? (
                    <Button
                      size="sm"
                      variant="link"
                      className="ms-1"
                      onClick={clearFilters}
                    >
                      Clear filters
                    </Button>
                  ) : null}
                </TableCell>
              </TableRow>
            ) : (
              visible.map((member) => (
                <MemberTableRow
                  key={member.id}
                  member={member}
                  onSelect={handleSelect}
                  showJoined
                  isNew={isNew(member)}
                />
              ))
            )}
          </TableBody>
        </Table>

        {filtered.length > visible.length ? (
          <div className="flex items-center justify-center gap-3 px-6 py-4">
            <span className="text-muted-foreground text-sm">
              Showing {visible.length} of {filtered.length}
            </span>
            <Button
              variant="outline"
              onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
            >
              Show {Math.min(PAGE_SIZE, filtered.length - visible.length)} more
            </Button>
          </div>
        ) : null}
      </CardFrame>

      <MemberSheet
        member={selectedMember}
        open={isSheetOpen}
        onOpenChange={setIsSheetOpen}
      />
    </DashboardPage>
  );
}
