"use client";

import { PersonAvatar } from "@/components/dashboard/PersonAvatar";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetPanel,
  SheetPopup,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  getFirstOpenStep,
  getRequestedLabel,
} from "@/lib/dashboard/follow-up-utils";
import type { FollowUp, FollowUpStep } from "@/lib/dashboard/types";
import { cn } from "@/lib/utils";
import { stages } from "@/lib/dashboard/terms";

const steps: { id: FollowUpStep; label: string; historyLabel: string }[] = [
  { id: "reachedOut", label: stages.reachedOut.label, historyLabel: stages.reachedOut.label },
  { id: "invited", label: stages.spokenTo.label, historyLabel: stages.spokenTo.label },
  { id: "attended", label: stages.attended.label, historyLabel: stages.attended.label },
];

const archiveReasons = [
  { label: "Not contactable", value: "not-contactable" },
  { label: "Not interested", value: "not-interested" },
  { label: "Moved away", value: "moved-away" },
  { label: "Joined another group", value: "joined-elsewhere" },
  { label: "Other", value: "other" },
];

interface FollowUpSheetProps {
  person: FollowUp | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onToggleStep: (id: string, step: FollowUpStep) => void;
  onAddNote: (id: string, note: string) => void;
  onAddToGroup: (id: string) => void;
  onArchive: (id: string, reason: string) => void;
  /** When set, the person's name opens their member drawer. */
  onOpenPerson?: (userId: string) => void;
}

export function FollowUpSheet({
  person,
  open,
  onOpenChange,
  ...handlers
}: FollowUpSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetPopup className="sm:max-w-lg">
        {person ? (
          <FollowUpEditor key={person.id} person={person} {...handlers} />
        ) : null}
      </SheetPopup>
    </Sheet>
  );
}

function FollowUpEditor({
  person,
  onToggleStep,
  onAddNote,
  onAddToGroup,
  onArchive,
  onOpenPerson,
}: Omit<FollowUpSheetProps, "person" | "open" | "onOpenChange"> & {
  person: FollowUp;
}) {
  const [note, setNote] = useState("");
  const [archiveReason, setArchiveReason] = useState(archiveReasons[0]);
  const nextStep = getFirstOpenStep(person);
  const canAddToGroup = Boolean(person.progress.attended);
  const phoneDigits = person.phone.replace(/\D/g, "");

  const handleAddNote = () => {
    const trimmed = note.trim();
    if (!trimmed) return;
    onAddNote(person.id, trimmed);
    setNote("");
  };

  return (
    <>
      <SheetHeader>
        <div className="flex items-center gap-3">
          <PersonAvatar
            name={person.name}
            src={person.avatarUrl}
            className="size-12"
            fallbackClassName="text-sm"
          />
          <div>
            <SheetTitle>
              {onOpenPerson ? (
                <button
                  type="button"
                  onClick={() => onOpenPerson(person.userId)}
                  aria-label={`${person.name}: open their member details`}
                  className="cursor-pointer rounded-sm text-left underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  {person.name}
                </button>
              ) : (
                person.name
              )}
            </SheetTitle>
            <SheetDescription>{getRequestedLabel(person)}</SheetDescription>
          </div>
        </div>
      </SheetHeader>

      <SheetPanel>
        <div className="space-y-6">
          <section aria-labelledby="sheet-contact">
            <h3
              id="sheet-contact"
              className="font-medium text-muted-foreground text-sm"
            >
              Contact
            </h3>
            {person.phone ? (
              <>
                <p className="mt-1 font-medium">{person.phone}</p>
                <div className="mt-3 flex gap-2">
                  <Button
                    variant="outline"
                    render={<a href={`tel:${person.phone}`} />}
                  >
                    Call
                  </Button>
                  <Button
                    variant="outline"
                    render={
                      <a
                        href={`https://wa.me/${phoneDigits}`}
                        target="_blank"
                        rel="noreferrer"
                      />
                    }
                  >
                    WhatsApp
                  </Button>
                </div>
              </>
            ) : (
              <p className="mt-1 text-muted-foreground">
                {person.phoneLookedUp
                  ? "No phone number on file."
                  : "Looking up their number..."}
              </p>
            )}
          </section>

          <section aria-labelledby="sheet-progress">
            <h3
              id="sheet-progress"
              className="font-medium text-muted-foreground text-sm"
            >
              Where are they?
            </h3>
            <ul className="mt-2 space-y-2">
              {steps.map((step) => {
                const date = person.progress[step.id];
                const isNext = nextStep === step.id;

                return (
                  <li key={step.id}>
                    <label
                      className={cn(
                        "flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-sm",
                        isNext && "border-primary/40 bg-primary/5",
                      )}
                    >
                      <Checkbox
                        checked={Boolean(date)}
                        onCheckedChange={() =>
                          onToggleStep(person.id, step.id)
                        }
                      />
                      <span className="flex-1 font-medium">{step.label}</span>
                      {date ? (
                        <span className="text-muted-foreground text-xs">
                          {date}
                        </span>
                      ) : isNext ? (
                        <Badge variant="warning">Next step</Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">–</span>
                      )}
                    </label>
                  </li>
                );
              })}
            </ul>
            <p className="mt-2 text-muted-foreground text-xs">
              Ticking a box saves straight away.
            </p>
          </section>

          <section aria-labelledby="sheet-history">
            <h3
              id="sheet-history"
              className="font-medium text-muted-foreground text-sm"
            >
              History
            </h3>
            <ul className="mt-2 space-y-1.5 text-sm">
              {person.referredBy ? (
                <li>
                  Referred by {person.referredBy}
                  {person.referralNote ? ` · “${person.referralNote}”` : ""}
                </li>
              ) : null}
              <li>{person.requestedOn} · Requested to join</li>
              {steps.map((step) =>
                person.progress[step.id] ? (
                  <li key={step.id}>
                    {person.progress[step.id]} · {step.historyLabel}
                  </li>
                ) : null,
              )}
              {person.notes.map((entry, index) => (
                <li key={`${entry}-${index}`}>Note · {entry}</li>
              ))}
            </ul>
          </section>

          <Field>
            <FieldLabel>Add a note</FieldLabel>
            <div className="flex w-full gap-2">
              <Input
                name="note"
                value={note}
                placeholder="Send a note to this group's leaders"
                onChange={(event) => setNote(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    handleAddNote();
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleAddNote}
                disabled={!note.trim()}
              >
                Add
              </Button>
            </div>
          </Field>
        </div>
      </SheetPanel>

      <SheetFooter className="flex-col sm:flex-col">
        <Button
          size="xl"
          className="w-full"
          disabled={!canAddToGroup}
          onClick={() => onAddToGroup(person.id)}
        >
          Add to group
        </Button>
        {!canAddToGroup ? (
          <p className="text-muted-foreground text-xs">
            Unlocks once {stages.attended.label} is ticked.
          </p>
        ) : null}
        <Field>
          <FieldLabel>If archiving, why?</FieldLabel>
          <div className="flex w-full gap-2">
            <Select
              items={archiveReasons}
              value={archiveReason}
              onValueChange={(value) => {
                if (value) setArchiveReason(value);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectPopup>
                {archiveReasons.map((reason) => (
                  <SelectItem key={reason.value} value={reason}>
                    {reason.label}
                  </SelectItem>
                ))}
              </SelectPopup>
            </Select>
            <Button
              type="button"
              variant="destructive-outline"
              onClick={() => onArchive(person.id, archiveReason.value)}
            >
              Archive
            </Button>
          </div>
          <FieldDescription className="sr-only">
            Archiving removes this person from your follow-up list.
          </FieldDescription>
        </Field>
      </SheetFooter>
    </>
  );
}
