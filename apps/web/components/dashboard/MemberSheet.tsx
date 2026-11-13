"use client";

import { useCallback, useEffect, useState } from "react";
import { FollowUpReview } from "@/components/dashboard/FollowUpReview";
import { PersonAvatar } from "@/components/dashboard/PersonAvatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetDescription,
  SheetHeader,
  SheetPanel,
  SheetPopup,
  SheetTitle,
} from "@/components/ui/sheet";
import { useAdmin } from "@/lib/dashboard/admin-context";
import { fetchContactPhone, fetchMember } from "@/lib/dashboard/queries";
import type { Member } from "@/lib/dashboard/types";
import {
  memberStatusVariants,
  requestStatusLabel,
} from "@/lib/dashboard/utils";
import { people } from "@/lib/dashboard/terms";

interface MemberSheetProps {
  member: Member | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type PhoneState =
  | { status: "loading" }
  | { status: "ready"; phone: string }
  | { status: "error" };

export function MemberSheet({ member, open, onOpenChange }: MemberSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetPopup className="sm:max-w-lg">
        {member ? <MemberDetails key={member.id} member={member} /> : null}
      </SheetPopup>
    </Sheet>
  );
}

/**
 * The member drawer for someone known only by user ID, for example from a
 * follow-up drawer. Loads them the same way the Members page does.
 */
export function MemberSheetById({
  userId,
  onClose,
}: {
  /** The person to show, or null when closed. */
  userId: string | null;
  onClose: () => void;
}) {
  const admin = useAdmin();
  const [member, setMember] = useState<Member | null>(null);

  useEffect(() => {
    if (!userId) return;
    let isMounted = true;
    fetchMember(admin, userId)
      .catch(() => null)
      .then((found) => {
        if (!isMounted) return;
        if (found) setMember(found);
        else onClose();
      });
    return () => {
      isMounted = false;
      setMember(null);
    };
  }, [admin, userId, onClose]);

  return (
    <MemberSheet
      member={member}
      open={Boolean(userId && member)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    />
  );
}

function MemberDetails({ member }: { member: Member }) {
  const admin = useAdmin();
  const [phoneState, setPhoneState] = useState<PhoneState>({
    status: "loading",
  });

  // Phone numbers are private, so look one up only when the sheet opens.
  useEffect(() => {
    let isMounted = true;
    fetchContactPhone(admin, member.id)
      .then((phone) => isMounted && setPhoneState({ status: "ready", phone }))
      .catch(() => isMounted && setPhoneState({ status: "error" }));
    return () => {
      isMounted = false;
    };
  }, [admin, member.id]);

  const phone = phoneState.status === "ready" ? phoneState.phone : "";
  const phoneDigits = phone.replace(/\D/g, "");
  const [reviewId, setReviewId] = useState<string | null>(null);
  const closeReview = useCallback(() => setReviewId(null), []);

  return (
    <>
      <SheetHeader>
        <div className="flex items-center gap-3">
          <PersonAvatar
            name={member.name}
            src={member.avatarUrl}
            className="size-12"
            fallbackClassName="text-sm"
          />
          <div>
            <SheetTitle>{member.name}</SheetTitle>
            <SheetDescription>
              {people.signedUp.label} {member.joinedOn}
            </SheetDescription>
          </div>
        </div>
      </SheetHeader>

      <SheetPanel>
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" size="lg">
              {member.role}
            </Badge>
            <Badge
              variant={
                memberStatusVariants[
                  member.status as keyof typeof memberStatusVariants
                ] ?? "outline"
              }
              size="lg"
            >
              {member.status}
            </Badge>
            {member.isNewcomer ? (
              <Badge variant="info" size="lg">
                {people.newcomer.label}
              </Badge>
            ) : null}
          </div>

          <section aria-labelledby="member-contact">
            <h3
              id="member-contact"
              className="font-medium text-muted-foreground text-sm"
            >
              Contact
            </h3>
            {phoneState.status === "loading" ? (
              <p className="mt-1 text-muted-foreground">
                Looking up their number...
              </p>
            ) : phone ? (
              <>
                <p className="mt-1 font-medium">{phone}</p>
                <div className="mt-3 flex gap-2">
                  <Button
                    variant="outline"
                    render={<a href={`tel:${phone}`} />}
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
                {phoneState.status === "error"
                  ? "We could not look up their number."
                  : "No phone number on file."}
              </p>
            )}
          </section>

          <section aria-labelledby="member-about">
            <h3
              id="member-about"
              className="font-medium text-muted-foreground text-sm"
            >
              About
            </h3>
            <p className="mt-1 whitespace-pre-line text-sm leading-relaxed">
              {member.bio || "They have not added a bio yet."}
            </p>
          </section>

          <section aria-labelledby="member-groups">
            <h3
              id="member-groups"
              className="font-medium text-muted-foreground text-sm"
            >
              Groups
            </h3>
            {member.memberships.length === 0 ? (
              <p className="mt-1 text-muted-foreground text-sm">
                Hasn&apos;t asked to join a group yet.
              </p>
            ) : (
              <ul className="mt-2 space-y-2">
                {member.memberships.map((membership) => (
                  <li
                    key={membership.id}
                    className="flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2.5 text-sm"
                  >
                    <span className="min-w-0 flex-1 font-medium">
                      {membership.group}
                    </span>
                    {membership.groupClosed ? (
                      <Badge variant="outline">Group closed</Badge>
                    ) : null}
                    {membership.role === "leader" ? (
                      <Badge variant="secondary">Leader</Badge>
                    ) : null}
                    <Badge
                      variant={
                        membership.status === "pending"
                          ? "warning"
                          : membership.status === "active"
                            ? "secondary"
                            : "outline"
                      }
                    >
                      {requestStatusLabel(membership.status, membership.stage)}
                    </Badge>
                    {membership.status === "pending" ? (
                      <Badge
                        render={
                          <button
                            type="button"
                            onClick={() => setReviewId(membership.id)}
                            aria-label={`Review the request to ${membership.group}`}
                          />
                        }
                      >
                        Review
                      </Badge>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </SheetPanel>

      <FollowUpReview requestId={reviewId} onClose={closeReview} />
    </>
  );
}
