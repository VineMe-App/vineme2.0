export type FollowUpStep = "reachedOut" | "invited" | "attended";

export interface FollowUp {
  id: string;
  userId: string;
  name: string;
  avatarUrl?: string | null;
  group: string;
  groupId: string;
  /** Active leader(s) of the group, or "No leader yet". */
  leader: string;
  requestedOn: string;
  /** ISO timestamp the request was made. */
  requestedAt: string;
  requestedDaysAgo: number;
  overdueDays?: number;
  dueInDays?: number;
  /** Which SLA rule the due date comes from, e.g. "Reach out within 6 days". */
  dueReason?: string;
  fromEmail?: boolean;
  /** Empty until looked up with get_user_contact_admin. */
  phone: string;
  phoneLookedUp?: boolean;
  referredBy?: string;
  referralNote?: string;
  progress: Record<FollowUpStep, string | null>;
  /** Date and text of the latest journey_status_change note, if any. */
  lastUpdatedOn?: string;
  lastUpdateNote?: string;
  notes: string[];
  outcome: "active" | "added" | "archived";
}

export interface GroupPerson {
  name: string;
  avatarUrl: string | null;
  role: string;
  status: string;
}

export interface Group {
  id: string;
  name: string;
  description: string;
  imageUrl: string | null;
  whatsappLink: string | null;
  address: string;
  people: GroupPerson[];
  area: string;
  meets: string;
  /** The group's active leaders, A to Z by full name. */
  leaders: { name: string; firstName: string }[];
  members: number;
  atCapacity: boolean;
  /** Pending approval and denied groups are left out. */
  status: "approved" | "closed";
  pendingFollowUps: number;
  latitude: number | null;
  longitude: number | null;
}

export interface MemberGroup {
  /** The request (group membership) id. */
  id: string;
  group: string;
  /** The group has been closed (`groups.status = 'closed'`). */
  groupClosed: boolean;
  role: string;
  /** pending, active (Added), inactive (Left) or archived. */
  status: string;
  /** `journey_status`: empty, 1, 2 or 3. */
  stage: number | null;
}

export interface Member {
  id: string;
  name: string;
  avatarUrl: string | null;
  role: string;
  status: string;
  group: string;
  joined: string;
  joinedOn: string;
  bio: string;
  isNewcomer: boolean;
  /** Every request the person has made, in any status, newest first. */
  memberships: MemberGroup[];
  /** ISO timestamp, for sorting and "new this month". */
  joinedAt: string;
}

export interface OverviewData {
  totalPeople: number;
  pendingFollowUps: number;
  groupsAtCapacity: number;
  members: Member[];
}

/** Where a signed-up person sits. There is no separate download event. */
export type SignupOutcome = "attended" | "requested" | "downloaded";

export type ReportStage = "not-reached" | "reached-out" | "invited" | "attended";

export interface ReportPerson {
  createdAt: string;
  isNewcomer: boolean;
  /** They said they cannot find a group. */
  askedForHelp: boolean;
  outcome: SignupOutcome;
  /** Furthest stage of an open (pending) follow-up, if they have one. */
  pendingStage: ReportStage | null;
  pendingSince: string | null;
}

export interface ReportGroup {
  id: string;
  name: string;
  members: number;
  pending: number;
  atCapacity: boolean;
}

export interface ReportsData {
  people: ReportPerson[];
  groups: ReportGroup[];
}
