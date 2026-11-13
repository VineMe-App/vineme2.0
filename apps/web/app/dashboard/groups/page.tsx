"use client";

import {
  ChevronRightIcon,
  LayoutGridIcon,
  MapIcon,
  SearchIcon,
  XIcon,
} from "lucide-react";
import dynamic from "next/dynamic";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { GroupImage } from "@/components/dashboard/GroupImage";
import { GroupSheet } from "@/components/dashboard/GroupSheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardPanel,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTab } from "@/components/ui/tabs";
import { fetchGroups } from "@/lib/dashboard/queries";
import type { Group } from "@/lib/dashboard/types";
import { ledByLabel } from "@/lib/dashboard/utils";
import { useDashboardQuery } from "@/lib/dashboard/use-dashboard-query";
import { cn } from "@/lib/utils";
import { DashboardPage } from "@/components/dashboard/DashboardPage";
import { groupTerms } from "@/lib/dashboard/terms";

const GroupsMap = dynamic(
  () =>
    import("@/components/dashboard/GroupsMap").then((mod) => mod.GroupsMap),
  {
    ssr: false,
    loading: () => (
      <div
        className="size-full rounded-2xl border bg-muted"
        aria-hidden="true"
      />
    ),
  },
);

type GroupView = "cards" | "map";
type GroupStatus = Group["status"];
type CapacityFilter = "taking" | "at-capacity";

const CAPACITY_FILTERS: { value: CapacityFilter; label: string }[] = [
  { value: "taking", label: groupTerms.takingNewMembers.label },
  { value: "at-capacity", label: groupTerms.atCapacity.label },
];

function matchesCapacity(group: Group, filter: CapacityFilter | null) {
  if (filter === "taking") return !group.atCapacity;
  if (filter === "at-capacity") return group.atCapacity;
  return true;
}

/**
 * Why a group matches the search: `""` when its name or area matches, a
 * short note when a person in it does, `null` when nothing does.
 */
function searchMatch(group: Group, search: string): string | null {
  if (!search) return "";
  if (
    group.name.toLowerCase().includes(search) ||
    group.area.toLowerCase().includes(search)
  ) {
    return "";
  }
  const person = group.people.find((p) =>
    p.name.toLowerCase().includes(search),
  );
  if (!person) return null;
  if (person.status === "pending") return `${person.name} has asked to join`;
  if (person.role === "leader") return `${person.name} leads this group`;
  return `${person.name} is a member`;
}

export default function GroupsPage() {
  // useSearchParams needs a Suspense boundary on prerendered pages.
  return (
    <Suspense
      fallback={
        <DashboardPage wide>
          <p className="text-muted-foreground">Loading your groups...</p>
        </DashboardPage>
      }
    >
      <GroupsView />
    </Suspense>
  );
}

function GroupsView() {
  const query = useDashboardQuery(fetchGroups);
  const groups = useMemo(() => query.data ?? [], [query.data]);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // `?status=closed` and `?filter=at-capacity` (or `taking`) are linkable,
  // e.g. from Overview's groups at capacity card.
  const status: GroupStatus =
    searchParams.get("status") === "closed" ? "closed" : "approved";
  const filterParam = searchParams.get("filter");
  const filter: CapacityFilter | null =
    status === "approved" &&
    (filterParam === "taking" || filterParam === "at-capacity")
      ? filterParam
      : null;
  const [searchText, setSearchText] = useState("");
  const search = searchText.trim().toLowerCase();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [view, setView] = useState<GroupView>("map");
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const showMap = view === "map";

  const statusCounts = useMemo(
    () => ({
      approved: groups.filter((group) => group.status === "approved").length,
      closed: groups.filter((group) => group.status === "closed").length,
    }),
    [groups],
  );
  // Groups in this status that match the search, with why they match.
  const searched = useMemo(
    () =>
      groups.flatMap((group) => {
        if (group.status !== status) return [];
        const match = searchMatch(group, search);
        return match === null ? [] : [{ group, match }];
      }),
    [groups, status, search],
  );
  const visible = useMemo(
    () => searched.filter(({ group }) => matchesCapacity(group, filter)),
    [searched, filter],
  );
  // Memoised: the map reframes whenever this array changes.
  const mappedGroups = useMemo(
    () =>
      visible.flatMap(({ group }) =>
        group.latitude != null && group.longitude != null
          ? [
              {
                id: group.id,
                name: group.name,
                latitude: group.latitude,
                longitude: group.longitude,
              },
            ]
          : [],
      ),
    [visible],
  );
  const selectedGroup = groups.find((group) => group.id === selectedId) ?? null;

  const setParams = (changes: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value === null) params.delete(key);
      else params.set(key, value);
    }
    const next = params.toString();
    router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
  };

  const handleOpenGroup = (id: string) => {
    setSelectedId(id);
    setIsSheetOpen(true);
  };

  const countLabel = [
    visible.length,
    status === "closed" ? "closed" : null,
    visible.length === 1 ? "group" : "groups",
    filter === "taking" ? "taking new members" : null,
    filter === "at-capacity" ? "at capacity" : null,
    search ? `matching “${searchText.trim()}”` : null,
  ]
    .filter(Boolean)
    .join(" ");
  const isFiltered = Boolean(search || filter);

  return (
    <DashboardPage
      wide
      className={cn(
        showMap &&
          "lg:h-[calc(100dvh-var(--dashboard-nav-height,3.75rem))] lg:overflow-hidden",
      )}
      innerClassName="flex flex-col lg:h-full"
    >
      <div className="shrink-0">
        <h1 className="font-heading text-3xl font-bold sm:text-4xl">
          Groups
        </h1>
        <p className="mt-2 text-muted-foreground">
          {status === "closed"
            ? "Groups at your church that have closed."
            : "Every active group at your church, busiest first."}
        </p>
      </div>

      <div
        role="search"
        aria-label="Search and filter groups"
        className="mt-5 flex shrink-0 flex-col gap-3 rounded-2xl border bg-card p-3 shadow-xs/5"
      >
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-0 flex-[999_1_20rem]">
            <SearchIcon
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3 z-10 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              type="search"
              size="lg"
              aria-label="Search groups"
              placeholder="Search by group, leader, member or someone who asked to join"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              className="rounded-full [&_input]:ps-9 [&_input]:pe-10"
            />
            {searchText ? (
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label="Clear search"
                onClick={() => setSearchText("")}
                className="absolute top-1/2 right-2 -translate-y-1/2 rounded-full"
              >
                <XIcon aria-hidden="true" />
              </Button>
            ) : null}
          </div>

          <Tabs
            value={status}
            onValueChange={(value) => {
              if (value === "approved" || value === "closed") {
                setParams({
                  status: value === "closed" ? "closed" : null,
                  filter: null,
                });
              }
            }}
          >
            <TabsList aria-label="Group status">
              <TabsTab value="approved">
                {groupTerms.active.label}
                <Badge variant="outline" size="sm">
                  {statusCounts.approved}
                </Badge>
              </TabsTab>
              <TabsTab value="closed">
                {groupTerms.closed.label}
                <Badge variant="outline" size="sm">
                  {statusCounts.closed}
                </Badge>
              </TabsTab>
            </TabsList>
          </Tabs>

          <Tabs
            value={view}
            onValueChange={(value) => {
              if (value === "cards" || value === "map") setView(value);
            }}
          >
            <TabsList aria-label="Group view">
              <TabsTab value="map" aria-label="Cards and map" title="Cards and map">
                <MapIcon aria-hidden="true" />
              </TabsTab>
              <TabsTab value="cards" aria-label="Cards only" title="Cards only">
                <LayoutGridIcon aria-hidden="true" />
              </TabsTab>
            </TabsList>
          </Tabs>
        </div>

        {status === "approved" ? (
          <div
            role="group"
            aria-label="Filter groups"
            className="flex flex-wrap items-center gap-2"
          >
            {CAPACITY_FILTERS.map((option) => {
              const isOn = filter === option.value;
              const count = searched.filter(({ group }) =>
                matchesCapacity(group, option.value),
              ).length;
              return (
                <Button
                  key={option.value}
                  size="sm"
                  variant={isOn ? "default" : "outline"}
                  aria-pressed={isOn}
                  onClick={() =>
                    setParams({ filter: isOn ? null : option.value })
                  }
                  className="rounded-full"
                >
                  {option.label}
                  <Badge
                    variant={isOn ? "secondary" : "outline"}
                    size="sm"
                    className={cn(isOn && "bg-white/20 text-current")}
                  >
                    {count}
                  </Badge>
                </Button>
              );
            })}
          </div>
        ) : null}
      </div>

      {query.status === "loading" ? (
        <p className="mt-8 text-muted-foreground">Loading your groups...</p>
      ) : null}
      {query.status === "error" ? (
        <p className="mt-8 text-muted-foreground">
          We could not load your groups. Refresh to try again.
        </p>
      ) : null}
      {query.status === "ready" && statusCounts[status] === 0 ? (
        <p className="mt-8 text-muted-foreground">
          {status === "closed" ? "No closed groups." : "No active groups yet."}
        </p>
      ) : null}

      {query.status === "ready" && statusCounts[status] > 0 ? (
        <>
          <div className="mt-5 mb-3 flex shrink-0 flex-wrap items-center justify-between gap-2">
            <p aria-live="polite" className="font-heading font-bold text-lg">
              {countLabel}
            </p>
            {isFiltered ? (
              <Button
                variant="link"
                size="sm"
                onClick={() => {
                  setSearchText("");
                  setParams({ filter: null });
                }}
              >
                Clear search and filters
              </Button>
            ) : null}
          </div>

          <div
            className={cn(
              "flex flex-col",
              showMap &&
                "lg:grid lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,1.15fr)_minmax(300px,0.85fr)] lg:gap-x-6",
            )}
          >
            <div
              className={cn(
                showMap &&
                  "order-2 mt-4 lg:mt-0 lg:min-h-0 lg:overflow-y-auto lg:overscroll-contain lg:pr-1",
              )}
            >
              {visible.length === 0 ? (
                <div className="rounded-2xl border border-dashed px-6 py-12 text-center">
                  <p className="font-medium">No groups match</p>
                  <p className="mt-1 text-muted-foreground text-sm">
                    Try another name, or clear the filters.
                  </p>
                </div>
              ) : null}
              <div
                className={cn(
                  "grid grid-cols-2 gap-3",
                  showMap
                    ? "pb-4 lg:grid-cols-2"
                    : "lg:grid-cols-3 xl:grid-cols-4",
                )}
              >
                {visible.map(({ group, match }) => (
                  <Card
                    key={group.id}
                    render={
                      <button
                        type="button"
                        aria-haspopup="dialog"
                        aria-label={`View ${group.name}`}
                        onClick={() => handleOpenGroup(group.id)}
                      />
                    }
                    onMouseEnter={() => setHoveredId(group.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    className={cn(
                      "cursor-pointer text-left transition-colors hover:border-foreground/25 hover:bg-accent/30 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40",
                      (hoveredId === group.id || selectedId === group.id) &&
                        "border-foreground/40",
                    )}
                  >
                    <div className="relative">
                      <GroupImage
                        src={group.imageUrl}
                        alt={group.name}
                        flush
                        className="aspect-[2/1]"
                        sizes={
                          showMap
                            ? "(min-width: 1280px) 25vw, 50vw"
                            : "(min-width: 1280px) 20vw, (min-width: 1024px) 30vw, 50vw"
                        }
                      />
                      {group.pendingFollowUps > 0 ? (
                        <Badge
                          variant="warning"
                          size="sm"
                          className="absolute top-2.5 left-2.5 bg-background shadow-sm"
                        >
                          {group.pendingFollowUps} to follow up
                        </Badge>
                      ) : null}
                    </div>
                    <CardHeader className="gap-1 px-3 py-3">
                      <CardTitle className="text-base">{group.name}</CardTitle>
                      <CardDescription className="line-clamp-1">
                        {group.area} · {group.meets}
                      </CardDescription>
                    </CardHeader>
                    <CardPanel className="space-y-2 px-3 pb-3">
                      {match ? (
                        <p className="rounded-md bg-info/8 px-2 py-1 font-medium text-info-foreground text-xs">
                          {match}
                        </p>
                      ) : null}
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary" size="sm" className="h-auto min-w-0 shrink whitespace-normal py-0.5 text-left sm:h-auto">
                          {ledByLabel(group.leaders.map((leader) => leader.firstName))}
                        </Badge>
                        {group.status === "closed" ? (
                          <Badge variant="secondary" size="sm">
                            {groupTerms.closed.label}
                          </Badge>
                        ) : group.atCapacity ? (
                          <Badge variant="error" size="sm">
                            {groupTerms.atCapacity.label}
                          </Badge>
                        ) : (
                          <Badge variant="success" size="sm">
                            {groupTerms.takingNewMembers.label}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-muted-foreground text-sm">
                          {group.members}{" "}
                          {group.members === 1 ? "member" : "members"}
                        </p>
                        <span className="inline-flex items-center gap-1 font-medium text-sm">
                          <span className="sr-only">View details</span>
                          <ChevronRightIcon
                            aria-hidden="true"
                            className="size-4"
                          />
                        </span>
                      </div>
                    </CardPanel>
                  </Card>
                ))}
              </div>
            </div>
            {showMap ? (
              <div className="relative order-1 h-[calc(100dvh-var(--dashboard-nav-height,3.75rem)-8rem)] shrink-0 lg:h-full lg:min-h-0">
                <div className="h-full lg:absolute lg:inset-0">
                  {mappedGroups.length === 0 ? (
                    <div className="flex size-full items-center justify-center rounded-2xl border bg-muted px-6 text-center text-muted-foreground text-sm">
                      {visible.length === 0
                        ? "No groups to show on the map."
                        : "No group locations to show yet."}
                    </div>
                  ) : (
                    <GroupsMap
                      groups={mappedGroups}
                      activeId={hoveredId ?? selectedId}
                      onSelect={handleOpenGroup}
                      onHover={setHoveredId}
                    />
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </>
      ) : null}

      <GroupSheet
        group={selectedGroup}
        open={isSheetOpen}
        onOpenChange={setIsSheetOpen}
      />
    </DashboardPage>
  );
}
