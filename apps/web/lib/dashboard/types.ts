export type FollowUpStep = "reachedOut" | "invited" | "attended";

/** A pending request's follow-up state, from `dashboard_requests.follow_up`. */
export type FollowUpState =
  | "needs_first_contact"
  | "on_track"
  | "needs_attention";

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
  followUp: FollowUpState;
  /** Days past the stage's limit, when it needs attention. */
  overdueDays?: number;
  dueInDays?: number;
  /** Which time limit applies, e.g. "Reach out within 6 days of the request". */
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
  /** ISO timestamp, for sorting. */
  joinedAt: string;
  /** Signed up in the last 30 days (New), from `dashboard_people.is_new`. */
  isNew: boolean;
}

export interface OverviewData {
  totalPeople: number;
  pendingFollowUps: number;
  groupsAtCapacity: number;
  members: Member[];
}

/** A person's outcome, from `dashboard_people.outcome`. */
export type PersonOutcome =
  | "connected"
  | "not_yet_connected"
  | "archived"
  | "no_requests"
  | "check_data";

/** A person's furthest stage, from `dashboard_people.furthest_stage`. */
export type FurthestStage =
  | "connected"
  | "spoken_to"
  | "reached_out"
  | "not_contacted"
  | "archived"
  | "no_requests"
  | "check_data";

/** One member, for Insights. No names. */
export interface InsightsPerson {
  signedUpAt: string;
  isNewcomer: boolean;
  outcome: PersonOutcome;
  furthestStage: FurthestStage;
  /** Connected, then added to the group, even if they've since left. */
  pluggedIn: boolean;
}

/** A followed up in time result: null while it isn't known yet (DEC-3). */
export type InTimeResult = "hit" | "miss" | null;

export type InTimeMeasure = "reachedOut" | "spokenTo" | "attended";

/** One request, for Insights. No names. */
export interface InsightsRequest {
  groupId: string;
  isNewcomer: boolean;
  /** pending, active (Added), inactive (Left) or archived. */
  status: string;
  requestedAt: string;
  archivedAt: string | null;
  archiveReason: string | null;
  followUp: FollowUpState | null;
  /** The day each stage was first reached (YYYY-MM-DD), when the view has it. */
  reachedOn: Record<InTimeMeasure, string | null>;
  inTime: Record<InTimeMeasure, InTimeResult>;
}

export interface InsightsGroup {
  id: string;
  name: string;
  atCapacity: boolean;
}

export interface InsightsData {
  people: InsightsPerson[];
  requests: InsightsRequest[];
  /** Active (approved) groups, A to Z. */
  groups: InsightsGroup[];
  /**
   * False until the database has the followed up in time columns on
   * `dashboard_requests`, so the Team and Groups measures can't be shown yet.
   */
  measuresAvailable: boolean;
}
