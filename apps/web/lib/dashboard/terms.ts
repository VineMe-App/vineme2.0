/**
 * Every status, stage, follow-up state and measure label on the dashboard,
 * each with its one-line meaning. These match docs/dashboard/glossary.md
 * exactly: to rename a term, change it there first, then here, nowhere else.
 */

export interface Term {
  label: string;
  description: string;
}

/** Where a pending request has got to, in journey order (`journey_status` empty, 1, 2, 3). */
export const stages = {
  notContacted: {
    label: "Not contacted",
    description: "Nobody has contacted them yet (`journey_status` empty).",
  },
  reachedOut: {
    label: "Reached out",
    description: "Someone has reached out to them (`journey_status` 1).",
  },
  spokenTo: {
    label: "Spoken to",
    description: "Someone has spoken to them (`journey_status` 2).",
  },
  attended: {
    label: "Attended",
    description: "They've been to the group (`journey_status` 3). Still pending until added.",
  },
} satisfies Record<string, Term>;

/** The stage for a `journey_status` value: empty, 1, 2 or 3. */
export function stageTerm(journeyStatus: number | null | undefined): Term {
  if (journeyStatus === 3) return stages.attended;
  if (journeyStatus === 2) return stages.spokenTo;
  if (journeyStatus === 1) return stages.reachedOut;
  return stages.notContacted;
}

/** What has happened to a request (`group_memberships.status`). */
export const requestStatuses = {
  pending: {
    label: "Pending",
    description: "Not yet resolved (status `pending`). Attended is still pending.",
  },
  added: {
    label: "Added",
    description: "The leader added them to the group (status `active`).",
  },
  left: {
    label: "Left",
    description: "Was added and has since left (status `inactive`).",
  },
  archived: {
    label: "Archived",
    description: "Closed with a reason (status `archived`).",
  },
  resolved: {
    label: "Resolved",
    description: "Added or Archived.",
  },
} satisfies Record<string, Term>;

/** The request status term for a `group_memberships.status` value. */
export function requestStatusTerm(status: string): Term | null {
  if (status === "pending") return requestStatuses.pending;
  if (status === "active") return requestStatuses.added;
  if (status === "inactive") return requestStatuses.left;
  if (status === "archived") return requestStatuses.archived;
  return null;
}

/** Every pending request is in one of three follow-up states. */
export const followUpStates = {
  needsFirstContact: {
    label: "Needs first contact",
    description: "Not contacted, and 6 days or fewer since the request.",
  },
  onTrack: {
    label: "On track",
    description: "Contacted, and within its stage's limit.",
  },
  needsAttention: {
    label: "Needs attention",
    description: "Past its stage's limit, at any stage.",
  },
  attendedNotAdded: {
    label: "Attended, not yet added",
    description: "Attended but not yet added: shown as its own count, because the job is different.",
  },
} satisfies Record<string, Term>;

/** "Needs attention" agreeing with a count: "Needs attention" for 1, "Need attention" otherwise. */
export function needsAttentionLabel(count: number): string {
  const label = followUpStates.needsAttention.label;
  return count === 1 ? label : label.replace(/^Needs\b/, "Need");
}

/** The same, to follow a count in a sentence: "1 needs attention", "2 need attention". */
export function needsAttentionAfter(count: number): string {
  return needsAttentionLabel(count).toLowerCase();
}

/** Where each person who has requested has got to, decided by their best request. */
export const outcomes = {
  connected: {
    label: "Connected",
    description: "At least one membership at Attended, whatever its status now.",
  },
  notYetConnected: {
    label: "Not yet connected",
    description: "Not connected, and at least one request still pending.",
  },
  archived: {
    label: "Archived",
    description: "Not connected, and every request archived.",
  },
  noRequests: {
    label: "No requests",
    description: "Members who have never made a request.",
  },
} satisfies Record<string, Term>;

/** People and their roles. */
export const people = {
  member: {
    label: "Member",
    description: "Everyone in scope, leaders and admins included, test accounts excluded.",
  },
  admin: {
    label: "Admin",
    description: "A member whose `users.roles` includes `church_admin`.",
  },
  leader: {
    label: "Leader",
    description: "A member with an active leader membership.",
  },
  newcomer: {
    label: "Newcomer",
    description: "Said during onboarding that they're looking for a group. It doesn't mean new to church.",
  },
  existingMember: {
    label: "Existing member",
    description: "Anyone who isn't a Newcomer.",
  },
  signedUp: {
    label: "Signed up",
    description: "When the person created their account (`users.created_at`).",
  },
  new: {
    label: "New",
    description: "Signed up in the last 30 days.",
  },
  requested: {
    label: "Requested",
    description: "Has made at least one request.",
  },
  pluggedIn: {
    label: "Plugged in",
    description: "A connected person who was then added to the group, even if they've since left.",
  },
  inAGroupNow: {
    label: "In a group now",
    description: "Has an active membership today, as a member or a leader.",
  },
} satisfies Record<string, Term>;

/** People who pressed "I can't find a group" in the app. */
export const needsHelp = {
  needsHelp: {
    label: "Needs help",
    description: "Pressed \"I can't find a group\" in the app, and it hasn't been resolved.",
  },
  contacted: {
    label: "Contacted",
    description: "Someone has marked them contacted, but it isn't resolved yet.",
  },
  resolved: {
    label: "Resolved",
    description: "Marked resolved. They drop off the list.",
  },
} satisfies Record<string, Term>;

/** Groups. */
export const groupTerms = {
  active: {
    label: "Active",
    description: "An approved group (`groups.status = 'approved'`).",
  },
  closed: {
    label: "Closed",
    description: "A closed group (`groups.status = 'closed'`), left out of every group count and filter.",
  },
  atCapacity: {
    label: "At capacity",
    description: "The leader has marked the group full (`groups.at_capacity`).",
  },
  takingNewMembers: {
    label: "Taking new members",
    description: "The group isn't marked at capacity.",
  },
  members: {
    label: "Members",
    description: "People in the group now: active memberships, leaders included.",
  },
} satisfies Record<string, Term>;

/** Measures on Insights and Overview. */
export const measures = {
  followedUpInTime: {
    label: "Followed up in time",
    description: "How quickly requests reached each stage, counted from the request date.",
  },
  connectedRate: {
    label: "Connected rate",
    description: "Of people who requested, the share who are connected.",
  },
  pluggedInRate: {
    label: "Plugged-in rate",
    description: "Of people who are connected, the share who were added to a group.",
  },
  resolvedThisWeek: {
    label: "Resolved this week",
    description: "Requests that were added or archived this week.",
  },
} satisfies Record<string, Term>;
