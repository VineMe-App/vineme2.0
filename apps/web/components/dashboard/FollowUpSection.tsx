"use client";

import { PersonAvatar } from "@/components/dashboard/PersonAvatar";
import {
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  compareByUrgency,
  getFollowUpStage,
  type FollowUpStage,
} from "@/lib/dashboard/follow-up-utils";
import type { FollowUp } from "@/lib/dashboard/types";
import { cn } from "@/lib/utils";
import { followUpStates, needsAttentionAfter } from "@/lib/dashboard/terms";

export type StageVariant = "followUp" | "attended";

export interface StageMeta {
  id: FollowUpStage;
  title: string;
  variant: StageVariant;
}

interface Actions {
  onSelect: (id: string) => void;
  onAddToGroup: (id: string) => void;
}

function formatRequested(person: FollowUp) {
  return new Date(person.requestedAt).toLocaleDateString("en-GB");
}

const accordionBar =
  "items-center rounded-none bg-brand-dark px-5 py-4 text-base text-white hover:bg-brand-dark/95 focus-visible:ring-offset-2 [&_svg]:size-5 [&_svg]:opacity-100";

function CountPill({ count }: { count: number }) {
  return (
    <span
      aria-hidden
      className="flex size-7 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground text-sm"
    >
      {count}
    </span>
  );
}

/**
 * One stacked bar of overdue vs on track, for a dark accordion header. The
 * caption carries the numbers so colour is never the only signal.
 */
function SlaBar({ overdue, onTrack }: { overdue: number; onTrack: number }) {
  const segments = [
    {
      label: needsAttentionAfter(overdue),
      count: overdue,
      color: "var(--destructive)",
    },
    {
      label: followUpStates.onTrack.label.toLowerCase(),
      count: onTrack,
      color: "var(--success)",
    },
  ].filter((segment) => segment.count > 0);
  const summary = segments
    .map((segment) => `${segment.count} ${segment.label}`)
    .join(", ");

  return (
    <span className="hidden shrink-0 flex-col items-end gap-1.5 sm:flex">
      <span
        role="img"
        aria-label={summary}
        className="flex h-2.5 w-36 gap-0.5"
      >
        {segments.map((segment, index) => (
          <span
            key={segment.label}
            className={cn(
              index === 0 && "rounded-l-full",
              index === segments.length - 1 && "rounded-r-full",
            )}
            style={{
              flexGrow: segment.count,
              flexBasis: 0,
              background: segment.color,
            }}
          />
        ))}
      </span>
      <span aria-hidden className="font-normal text-white/70 text-xs">
        {segments.length === 0
          ? "Nobody waiting"
          : segments.map((segment) => `${segment.count} ${segment.label}`).join(" · ")}
      </span>
    </span>
  );
}

/** The person cards for one set of people, as in the mobile requests tab. */
export function FollowUpCards({
  people,
  variant,
  groupLabel = "group",
  onSelect,
  onAddToGroup,
}: Actions & {
  people: FollowUp[];
  variant: StageVariant;
  /** Which line sits under "Requested at": the group, or nothing. */
  groupLabel?: "group" | "none";
}) {
  if (people.length === 0) {
    return (
      <p className="rounded-xl bg-card px-4 py-6 text-center text-muted-foreground">
        Nobody is at this stage right now.
      </p>
    );
  }

  return (
    <ul className="grid gap-3 md:grid-cols-2">
      {people.map((person) => (
        <li
          key={person.id}
          className="flex cursor-pointer items-center gap-4 rounded-2xl bg-card p-3 shadow-xs/5 transition-shadow hover:shadow-md"
          onClick={() => onSelect(person.id)}
        >
          <PersonAvatar
            name={person.name}
            src={person.avatarUrl}
            className="size-14 ring-2 ring-border"
            fallbackClassName="text-base"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate font-bold text-foreground">{person.name}</p>
            <p className="text-muted-foreground text-sm">
              Requested at {formatRequested(person)}
            </p>
            {groupLabel === "group" ? (
              <p className="truncate text-muted-foreground text-xs">
                {person.group}
              </p>
            ) : null}
            <div className="mt-1.5">
              {variant === "attended" ? (
                <Badge variant="success">Ready to add</Badge>
              ) : person.overdueDays ? (
                <Badge variant="error" title={person.dueReason}>
                  Overdue {person.overdueDays}{" "}
                  {person.overdueDays === 1 ? "day" : "days"}
                </Badge>
              ) : (
                <Badge variant="outline" title={person.dueReason}>
                  Due in {person.dueInDays}{" "}
                  {person.dueInDays === 1 ? "day" : "days"}
                </Badge>
              )}
            </div>
          </div>
          <div className="flex shrink-0 flex-col gap-2">
            <Button
              size="sm"
              aria-label={`Review ${person.name}`}
              aria-haspopup="dialog"
            >
              View
            </Button>
            {variant === "attended" ? (
              <Button
                size="sm"
                variant="outline"
                onClick={(event) => {
                  event.stopPropagation();
                  onAddToGroup(person.id);
                }}
              >
                Add to group
              </Button>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}

/** One stage of the follow-up journey, as a dark accordion bar of person cards. */
export function FollowUpSection({
  value,
  title,
  people,
  variant,
  onSelect,
  onAddToGroup,
}: Actions & {
  /** Accordion value, one per stage. */
  value: string;
  title: string;
  people: FollowUp[];
  variant: StageVariant;
}) {
  return (
    <AccordionItem
      value={value}
      className="overflow-hidden rounded-2xl border-0 bg-muted"
    >
      <AccordionTrigger
        className={accordionBar}
        aria-label={`${title}, ${people.length} ${
          people.length === 1 ? "person" : "people"
        }`}
      >
        <span className="flex-1 font-heading text-lg font-bold">{title}</span>
        <CountPill count={people.length} />
      </AccordionTrigger>

      <AccordionPanel className="p-4 text-foreground">
        <FollowUpCards
          people={people}
          variant={variant}
          onSelect={onSelect}
          onAddToGroup={onAddToGroup}
        />
      </AccordionPanel>
    </AccordionItem>
  );
}

/** One group leader, with their people split by stage underneath. */
export function FollowUpLeaderSection({
  value,
  leader,
  people,
  stages,
  onSelect,
  onAddToGroup,
}: Actions & {
  value: string;
  leader: string;
  people: FollowUp[];
  stages: StageMeta[];
}) {
  const overdue = people.filter((person) => person.overdueDays).length;
  const groups = [...new Set(people.map((person) => person.group))].sort();

  return (
    <AccordionItem
      value={value}
      className="overflow-hidden rounded-2xl border-0 bg-muted"
    >
      <AccordionTrigger
        className={accordionBar}
        aria-label={`${leader}, ${people.length} ${
          people.length === 1 ? "person" : "people"
        }${overdue ? `, ${overdue} ${needsAttentionAfter(overdue)}` : ""}`}
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate font-heading text-lg font-bold">
            {leader}
          </span>
          <span className="block truncate font-normal text-sm text-white/70">
            {groups.join(" · ")}
          </span>
        </span>
        <SlaBar overdue={overdue} onTrack={people.length - overdue} />
        <CountPill count={people.length} />
      </AccordionTrigger>

      <AccordionPanel className="space-y-5 p-4 text-foreground">
        {stages.map((stage) => {
          const stagePeople = people
            .filter((person) => getFollowUpStage(person) === stage.id)
            .sort(compareByUrgency);
          if (stagePeople.length === 0) return null;

          return (
            <section key={stage.id} aria-label={stage.title}>
              <h3 className="mb-2 flex items-center gap-2 font-heading font-bold text-foreground">
                {stage.title}
                <span className="rounded-full bg-primary/10 px-2 py-0.5 font-bold text-[color-mix(in_srgb,var(--primary)_70%,black)] text-xs">
                  {stagePeople.length}
                </span>
              </h3>
              <FollowUpCards
                people={stagePeople}
                variant={stage.variant}
                onSelect={onSelect}
                onAddToGroup={onAddToGroup}
              />
            </section>
          );
        })}
      </AccordionPanel>
    </AccordionItem>
  );
}
