"use client";

import { PersonAvatar } from "@/components/dashboard/PersonAvatar";
import { CalendarIcon, MapPinIcon } from "lucide-react";
import Link from "next/link";
import { GroupImage } from "@/components/dashboard/GroupImage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetPanel,
  SheetPopup,
  SheetTitle,
} from "@/components/ui/sheet";
import type { Group } from "@/lib/dashboard/types";
import { ledByLabel } from "@/lib/dashboard/utils";
import { groupTerms, requestStatuses } from "@/lib/dashboard/terms";

interface GroupSheetProps {
  group: Group | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GroupSheet({ group, open, onOpenChange }: GroupSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetPopup className="sm:max-w-lg">
        {group ? <GroupDetails key={group.id} group={group} /> : null}
      </SheetPopup>
    </Sheet>
  );
}

function GroupDetails({ group }: { group: Group }) {
  const activePeople = group.people.filter(
    (person) => person.status === "active",
  );
  const pendingPeople = group.people.filter(
    (person) => person.status === "pending",
  );

  return (
    <>
      <SheetHeader>
        <SheetTitle>{group.name}</SheetTitle>
        <SheetDescription>
          {group.area} · {group.meets}
        </SheetDescription>
      </SheetHeader>

      <SheetPanel>
        <div className="space-y-6">
          <GroupImage
            src={group.imageUrl}
            alt={group.name}
            sizes="(min-width: 640px) 512px, 100vw"
          />

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" size="lg" className="h-auto min-w-0 shrink whitespace-normal py-0.5 text-left sm:h-auto">
              {ledByLabel(group.leaders.map((leader) => leader.name))}
            </Badge>
            {group.atCapacity ? (
              <Badge variant="error" size="lg">
                {groupTerms.atCapacity.label}
              </Badge>
            ) : (
              <Badge variant="success" size="lg">
                {groupTerms.takingNewMembers.label}
              </Badge>
            )}
            {group.pendingFollowUps > 0 ? (
              <Badge variant="warning" size="lg">
                {group.pendingFollowUps} to follow up
              </Badge>
            ) : null}
          </div>

          <section aria-labelledby="group-about">
            <h3
              id="group-about"
              className="font-medium text-muted-foreground text-sm"
            >
              About this group
            </h3>
            <p className="mt-1 whitespace-pre-line text-sm leading-relaxed">
              {group.description || "No description added yet."}
            </p>
          </section>

          <section aria-labelledby="group-meeting">
            <h3
              id="group-meeting"
              className="font-medium text-muted-foreground text-sm"
            >
              When and where
            </h3>
            <ul className="mt-2 space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <CalendarIcon
                  aria-hidden="true"
                  className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                />
                {group.meets}
              </li>
              <li className="flex items-start gap-2">
                <MapPinIcon
                  aria-hidden="true"
                  className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                />
                <span>
                  {group.area}
                  {group.address && group.address !== group.area ? (
                    <span className="block text-muted-foreground">
                      {group.address}
                    </span>
                  ) : null}
                </span>
              </li>
            </ul>
          </section>

          <PeopleSection
            id="group-members"
            title={`Members (${activePeople.length})`}
            people={activePeople}
            emptyText="No active members yet."
          />

          {pendingPeople.length > 0 ? (
            <PeopleSection
              id="group-pending"
              title={`${requestStatuses.pending.label} requests (${pendingPeople.length})`}
              people={pendingPeople}
            />
          ) : null}
        </div>
      </SheetPanel>

      <SheetFooter className="flex-col sm:flex-col">
        {group.pendingFollowUps > 0 ? (
          <Button
            size="xl"
            className="w-full"
            render={
              <Link href={`/dashboard/follow-ups?group=${group.id}`} />
            }
          >
            Review follow-ups
          </Button>
        ) : null}
        {group.whatsappLink ? (
          <Button
            size="xl"
            variant="outline"
            className="w-full"
            render={
              <a href={group.whatsappLink} target="_blank" rel="noreferrer" />
            }
          >
            Open WhatsApp group
          </Button>
        ) : null}
      </SheetFooter>
    </>
  );
}

function PeopleSection({
  id,
  title,
  people,
  emptyText,
}: {
  id: string;
  title: string;
  people: Group["people"];
  emptyText?: string;
}) {
  return (
    <section aria-labelledby={id}>
      <h3 id={id} className="font-medium text-muted-foreground text-sm">
        {title}
      </h3>
      {people.length === 0 ? (
        <p className="mt-2 text-muted-foreground text-sm">{emptyText}</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {people.map((person, index) => (
            <li
              key={`${person.name}-${index}`}
              className="flex items-center gap-3 text-sm"
            >
              <PersonAvatar
                name={person.name}
                src={person.avatarUrl}
                className="size-8"
                fallbackClassName="text-xs"
              />
              <span className="flex-1 font-medium">{person.name}</span>
              {person.role === "leader" ? (
                <Badge variant="secondary">Leader</Badge>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
