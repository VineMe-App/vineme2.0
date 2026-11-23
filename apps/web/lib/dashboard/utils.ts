import { requestStatusTerm, requestStatuses, stageTerm } from "@/lib/dashboard/terms";

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

/** Keyed by the outcome labels in terms.ts; "Looking for a group" waits for MEM-1. */
export const memberStatusVariants = {
  Connected: "success",
  "Not yet connected": "warning",
  "Looking for a group": "info",
} as const;

/** "Led by Sam", "Led by Sam and Alex", "Led by Sam and Alex +1", or "No leader yet". */
export function ledByLabel(leaders: string[]): string {
  if (leaders.length === 0) return "No leader yet";
  const [first, second, ...rest] = leaders;
  if (!second) return `Led by ${first}`;
  return `Led by ${first} and ${second}${rest.length ? ` +${rest.length}` : ""}`;
}

/** A request's status in glossary words: "Pending · Spoken to", "Added", "Left" or "Archived". */
export function requestStatusLabel(status: string, stage: number | null): string {
  if (status === "pending") {
    return `${requestStatuses.pending.label} · ${stageTerm(stage).label}`;
  }
  return requestStatusTerm(status)?.label ?? status;
}
