"use client";

import { useEffect, useState } from "react";
import { FollowUpSheet } from "@/components/dashboard/FollowUpSheet";
import { useAdmin } from "@/lib/dashboard/admin-context";
import {
  addFollowUpNote,
  toggleFollowUpStep,
} from "@/lib/dashboard/follow-up-utils";
import { fetchContactPhone, fetchFollowUps } from "@/lib/dashboard/queries";
import type { FollowUp } from "@/lib/dashboard/types";

/**
 * Opens the follow-up drawer for one pending request, from anywhere (for
 * example the member drawer). Loads it the same way the Follow-ups page does.
 */
export function FollowUpReview({
  requestId,
  onClose,
}: {
  /** The pending request to show, or null when closed. */
  requestId: string | null;
  onClose: () => void;
}) {
  const admin = useAdmin();
  const [person, setPerson] = useState<FollowUp | null>(null);

  useEffect(() => {
    if (!requestId) return;
    let isMounted = true;

    fetchFollowUps(admin)
      .then(async (followUps) => {
        const found = followUps.find((followUp) => followUp.id === requestId);
        if (!found) return null;
        // Phone numbers are private, so look one up only when the drawer opens.
        const phone = await fetchContactPhone(admin, found.userId).catch(
          () => "",
        );
        return { ...found, phone, phoneLookedUp: true };
      })
      .catch(() => null)
      .then((found) => {
        if (!isMounted) return;
        if (found) setPerson(found);
        else onClose();
      });

    return () => {
      isMounted = false;
      setPerson(null);
    };
  }, [admin, requestId, onClose]);

  const update = (change: (current: FollowUp) => FollowUp) =>
    setPerson((current) => (current ? change(current) : current));

  return (
    <FollowUpSheet
      person={person}
      open={Boolean(requestId && person)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      onToggleStep={(_, step) =>
        update((current) => toggleFollowUpStep(current, step))
      }
      onAddNote={(_, note) =>
        update((current) => addFollowUpNote(current, note))
      }
      onAddToGroup={onClose}
      onArchive={onClose}
      // Opened from a member drawer: the name goes back to it.
      onOpenPerson={onClose}
    />
  );
}
