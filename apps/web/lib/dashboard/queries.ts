import type { AdminContextValue } from "@/lib/dashboard/admin-context";
import type {
  FollowUp,
  FollowUpState,
  Group,
  Member,
  OverviewData,
  InsightsGroup,
  InsightsPerson,
  InsightsRequest,
  InsightsData,
  InTimeResult,
} from "@/lib/dashboard/types";
import { outcomes, people } from "@/lib/dashboard/terms";

/**
 * The team's follow-up expectations (SLA), in days. Someone is overdue
 * ("Attention") once they pass the window for their current stage, or 30 days
 * after asking to join without having attended a group.
 */
export const FOLLOW_UP_SLA = {
  /** Reach out within 6 days of the request. */
  reachOut: 6,
  /** Follow up on a reach out within 10 days. */
  afterReachOut: 10,
  /** Follow up on a "spoken to" within 14 days. */
  afterSpokenTo: 14,
  /** Attend a group within 30 days of the request. */
  attendGroup: 30,
} as const;

const DAY_MS = 864e5;

type Maybe<T> = T | T[] | null | undefined;

const one = <T,>(value: Maybe<T>): T | null =>
  (Array.isArray(value) ? value[0] : value) ?? null;

function formatDay(timestamp: string) {
  return new Date(timestamp).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

function formatMonthYear(timestamp: string) {
  return new Date(timestamp).toLocaleDateString("en-GB", {
    month: "short",
    year: "numeric",
  });
}

function daysSince(timestamp: string, now: number) {
  return Math.max(0, Math.floor((now - new Date(timestamp).getTime()) / DAY_MS));
}

function mapCoordinate(value: number | string | null | undefined) {
  if (value == null || value === "") return null;
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : null;
}

function check(...results: { error: unknown }[]) {
  const failed = results.find((result) => result.error);
  if (failed) throw failed.error;
}

/** Rows per request when a query loads everything. */
const BATCH = 500;

/**
 * Every row a query matches, fetched in batches, so nothing is cut off by a
 * row limit (Supabase's own cap included). `page` must ask for an exact count
 * and keep a stable order.
 */
async function fetchAllRows<T>(
  page: (
    from: number,
    to: number,
  ) => PromiseLike<{ data: unknown[] | null; error: unknown; count: number | null }>,
): Promise<T[]> {
  const rows: T[] = [];
  let total = Infinity;
  while (rows.length < total) {
    const result = await page(rows.length, rows.length + BATCH - 1);
    check(result);
    const data = (result.data ?? []) as T[];
    if (data.length === 0) break;
    rows.push(...data);
    // Without a count, keep going while batches come back full.
    total = result.count ?? (data.length === BATCH ? Infinity : rows.length);
  }
  return rows;
}

/**
 * Limits a query on `dashboard_people` or `dashboard_requests` to the church
 * and service the dashboard is showing. Both views already limit a church
 * admin to their own church and service; this keeps the page's own scope
 * explicit, so a switched-to church never shows another church's numbers.
 */
function inScope<Q>(
  query: Q,
  { churchId, serviceId }: Pick<AdminContextValue, "churchId" | "serviceId">,
): Q {
  // Typed loosely: a structural constraint on Supabase's builder is too deep for tsc.
  type Filterable = { eq(column: string, value: string): Filterable };
  const church = (query as unknown as Filterable).eq("church_id", churchId);
  return (serviceId ? church.eq("service_id", serviceId) : church) as unknown as Q;
}

/** A `dashboard_people` row (DATA-2): one per member. */
type PersonRow = {
  person_id: string;
  person_name: string | null;
  person_avatar_url: string | null;
  signed_up_at: string;
  is_new: boolean;
  newcomer: boolean;
  is_admin: boolean;
  is_leader: boolean;
  outcome:
    | "connected"
    | "not_yet_connected"
    | "archived"
    | "no_requests"
    | "check_data";
  needs_help: boolean;
};

const personColumns =
  "person_id, person_name, person_avatar_url, signed_up_at, is_new, newcomer, is_admin, is_leader, outcome, needs_help";

/** A `dashboard_requests` row (DATA-1): one per request. */
type RequestRow = {
  request_id: string;
  person_id: string;
  person_name: string | null;
  person_avatar_url: string | null;
  group_id: string;
  group_title: string;
  leaders: { id: string; name: string | null; avatar_url: string | null }[];
  role: string;
  status: string;
  stage: number | null;
  requested_at: string;
  reached_out_at: string | null;
  spoken_to_at: string | null;
  attended_at: string | null;
  last_action_at: string | null;
  limit_days: number | null;
  days_until_due: number | null;
  follow_up: FollowUpState | null;
};

type MembershipRow = {
  id: string;
  role: string;
  status: string;
  journey_status: number | null;
  created_at: string;
  groups: Maybe<{ title: string; status: string }>;
};

/** What the person view doesn't hold: the bio, and requests for the drawer. */
type MemberDetailRow = {
  id: string;
  bio: string | null;
  group_memberships: MembershipRow[];
};

const memberDetailColumns =
  "id, bio, group_memberships(id, role, status, journey_status, created_at, groups(title, status))";

/**
 * The status shown on Members and Overview, from the person's outcome in
 * `dashboard_people`. Archived and No requests share one status until MEM-1
 * gives each its own card.
 */
function memberStatus(outcome: PersonRow["outcome"]): string {
  if (outcome === "connected") return outcomes.connected.label;
  if (outcome === "not_yet_connected") return outcomes.notYetConnected.label;
  return "Looking for a group";
}

function toMember(person: PersonRow, detail: MemberDetailRow | undefined): Member {
  const memberships = detail?.group_memberships ?? [];
  const active = memberships.find((m) => m.status === "active");
  const pending = memberships.find((m) => m.status === "pending");
  const current = active ?? pending;

  return {
    id: person.person_id,
    name: person.person_name || "Unnamed",
    avatarUrl: person.person_avatar_url || null,
    role: person.is_admin
      ? people.admin.label
      : person.is_leader
        ? people.leader.label
        : "Congregation",
    status: memberStatus(person.outcome),
    group: one(current?.groups)?.title ?? "Unassigned",
    joined: formatMonthYear(person.signed_up_at),
    joinedAt: person.signed_up_at,
    joinedOn: new Date(person.signed_up_at).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }),
    isNew: person.is_new,
    bio: detail?.bio?.trim() ?? "",
    isNewcomer: person.newcomer,
    memberships: [...memberships]
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .map((m) => ({
        id: m.id,
        group: one(m.groups)?.title ?? "Unknown group",
        groupClosed: one(m.groups)?.status === "closed",
        role: m.role,
        status: m.status,
        stage: m.journey_status,
      })),
  };
}

/**
 * Bios and requests, keyed by user ID: for these people, or with no IDs, for
 * everyone at the church and service (the same people as `dashboard_people`).
 */
async function fetchMemberDetails(
  { supabase, churchId, serviceId }: AdminContextValue,
  ids?: string[],
): Promise<Map<string, MemberDetailRow>> {
  const rows = ids
    ? ids.length === 0
      ? []
      : await supabase
          .from("users")
          .select(memberDetailColumns)
          .in("id", ids)
          .then((result) => {
            check(result);
            return (result.data ?? []) as unknown as MemberDetailRow[];
          })
    : await fetchAllRows<MemberDetailRow>((from, to) => {
        let query = supabase
          .from("users")
          .select(memberDetailColumns, { count: "exact" })
          .eq("church_id", churchId);
        if (serviceId) query = query.eq("service_id", serviceId);
        return query.order("id", { ascending: true }).range(from, to);
      });
  return new Map(rows.map((row) => [row.id, row]));
}

/**
 * Every member, newest first, from `dashboard_people`: everyone at this church
 * and service, test accounts excluded (see Member and Test account in
 * docs/dashboard/glossary.md). Loads them all, so search and counts on the
 * page cover everyone.
 */
export async function fetchMembers(admin: AdminContextValue): Promise<Member[]> {
  const [rows, details] = await Promise.all([
    fetchAllRows<PersonRow>((from, to) =>
      inScope(
        admin.supabase
          .from("dashboard_people")
          .select(personColumns, { count: "exact" }),
        admin,
      )
        .order("signed_up_at", { ascending: false })
        .order("person_id", { ascending: true })
        .range(from, to),
    ),
    fetchMemberDetails(admin),
  ]);
  return rows.map((row) => toMember(row, details.get(row.person_id)));
}

/** One person, by user ID, shaped like a row on the Members page. */
export async function fetchMember(
  admin: AdminContextValue,
  userId: string,
): Promise<Member | null> {
  const result = await inScope(
    admin.supabase.from("dashboard_people").select(personColumns),
    admin,
  )
    .eq("person_id", userId)
    .maybeSingle();
  check(result);
  if (!result.data) return null;
  const details = await fetchMemberDetails(admin, [userId]);
  return toMember(result.data as unknown as PersonRow, details.get(userId));
}

export async function fetchOverview(
  admin: AdminContextValue,
): Promise<OverviewData> {
  const { supabase, churchId } = admin;
  const count = { count: "exact", head: true } as const;

  const [totalPeople, pendingFollowUps, groupsAtCapacity, recent] =
    await Promise.all([
      inScope(supabase.from("dashboard_people").select("person_id", count), admin),
      inScope(
        supabase.from("dashboard_requests").select("request_id", count),
        admin,
      ).eq("status", "pending"),
      supabase
        .from("groups")
        .select("id", count)
        .eq("church_id", churchId)
        .eq("status", "approved")
        .eq("at_capacity", true),
      inScope(supabase.from("dashboard_people").select(personColumns), admin)
        .order("signed_up_at", { ascending: false })
        .order("person_id", { ascending: true })
        .limit(5),
    ]);
  check(totalPeople, pendingFollowUps, groupsAtCapacity, recent);

  const newest = (recent.data ?? []) as unknown as PersonRow[];
  const details = await fetchMemberDetails(
    admin,
    newest.map((row) => row.person_id),
  );

  return {
    totalPeople: totalPeople.count ?? 0,
    pendingFollowUps: pendingFollowUps.count ?? 0,
    groupsAtCapacity: groupsAtCapacity.count ?? 0,
    members: newest.map((row) => toMember(row, details.get(row.person_id))),
  };
}

type GroupRequestRow = Pick<
  RequestRow,
  "group_id" | "person_name" | "person_avatar_url" | "role" | "status"
>;

/**
 * Pending and added requests by group, from `dashboard_requests`. Group
 * member counts and pending counts come from here on every page.
 */
async function fetchGroupRequests(
  admin: AdminContextValue,
): Promise<Map<string, GroupRequestRow[]>> {
  const rows = await fetchAllRows<GroupRequestRow & { request_id: string }>(
    (from, to) =>
      inScope(
        admin.supabase
          .from("dashboard_requests")
          .select(
            "request_id, group_id, person_name, person_avatar_url, role, status",
            { count: "exact" },
          ),
        admin,
      )
        .in("status", ["active", "pending"])
        .order("request_id", { ascending: true })
        .range(from, to),
  );
  const byGroup = new Map<string, GroupRequestRow[]>();
  for (const row of rows) {
    byGroup.set(row.group_id, [...(byGroup.get(row.group_id) ?? []), row]);
  }
  return byGroup;
}

type GroupRow = {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  whatsapp_link: string | null;
  meeting_day: string | null;
  meeting_time: string | null;
  at_capacity: boolean;
  status: "approved" | "closed";
  location: {
    name?: string;
    address?: string;
    coordinates?: {
      latitude?: number | string | null;
      longitude?: number | string | null;
    };
  } | null;
  group_memberships: {
    role: string;
    status: string;
    member: Maybe<{
      name: string | null;
      first_name: string | null;
    }>;
  }[];
};

export async function fetchGroups(admin: AdminContextValue): Promise<Group[]> {
  const [result, requestsByGroup] = await Promise.all([
    admin.supabase
      .from("groups")
      .select(
        "id, title, description, image_url, whatsapp_link, meeting_day, meeting_time, at_capacity, status, location, group_memberships(role, status, member:users!group_memberships_user_id_fkey(name, first_name))",
      )
      .eq("church_id", admin.churchId)
      .in("status", ["approved", "closed"])
      .order("title", { ascending: true }),
    fetchGroupRequests(admin),
  ]);
  check(result);

  return ((result.data ?? []) as unknown as GroupRow[])
    .map((group) => {
      const leaders = (group.group_memberships ?? [])
        .filter((m) => m.status === "active" && m.role === "leader")
        .map((m) => {
          const name = one(m.member)?.name || "Unnamed";
          return { name, firstName: one(m.member)?.first_name?.trim() || name };
        })
        .sort((a, b) => a.name.localeCompare(b.name));
      const requests = requestsByGroup.get(group.id) ?? [];
      const time = group.meeting_time?.slice(0, 5);

      return {
        id: group.id,
        name: group.title,
        description: group.description?.trim() ?? "",
        imageUrl: group.image_url || null,
        whatsappLink: group.whatsapp_link || null,
        address: group.location?.address ?? "",
        people: requests
          .map((m) => ({
            name: m.person_name || "Unnamed",
            avatarUrl: m.person_avatar_url || null,
            role: m.role,
            status: m.status,
          }))
          .sort(
            (a, b) =>
              Number(b.role === "leader") - Number(a.role === "leader") ||
              Number(a.status === "pending") - Number(b.status === "pending") ||
              a.name.localeCompare(b.name),
          ),
        area: group.location?.name ?? group.location?.address ?? "No location",
        meets:
          [group.meeting_day ? `${group.meeting_day}s` : null, time]
            .filter(Boolean)
            .join(", ") || "Meeting time not set",
        leaders,
        members: requests.filter((m) => m.status === "active").length,
        atCapacity: group.at_capacity,
        status: group.status,
        pendingFollowUps: requests.filter((m) => m.status === "pending").length,
        latitude: mapCoordinate(group.location?.coordinates?.latitude),
        longitude: mapCoordinate(group.location?.coordinates?.longitude),
      };
    })
    .sort((a, b) => b.pendingFollowUps - a.pendingFollowUps);
}

type NoteRow = {
  membership_id: string;
  note_type: string;
  note_text: string | null;
  new_journey_status: number | null;
  created_at: string;
};

/** Which time limit a pending request is measured against, in words. */
function dueReason(stage: number, limitDays: number | null): string | undefined {
  if (limitDays == null) return undefined;
  if (stage <= 0) return `Reach out within ${limitDays} days of the request`;
  if (stage === 3) {
    return `Add them to the group within ${limitDays} days of the last action`;
  }
  return `Follow up within ${limitDays} days of the last action`;
}

/**
 * Every pending request, from `dashboard_requests`, with its stage dates and
 * follow-up state. Notes are only loaded for their text.
 */
export async function fetchFollowUps(
  admin: AdminContextValue,
): Promise<FollowUp[]> {
  const { supabase, churchId } = admin;
  const [requests, notes] = await Promise.all([
    fetchAllRows<RequestRow>((from, to) =>
      inScope(
        supabase
          .from("dashboard_requests")
          .select(
            "request_id, person_id, person_name, person_avatar_url, group_id, group_title, leaders, role, status, stage, requested_at, reached_out_at, spoken_to_at, attended_at, last_action_at, limit_days, days_until_due, follow_up",
            { count: "exact" },
          ),
        admin,
      )
        .eq("status", "pending")
        .order("requested_at", { ascending: true })
        .order("request_id", { ascending: true })
        .range(from, to),
    ),
    fetchAllRows<NoteRow>((from, to) =>
      supabase
        .from("group_membership_notes")
        .select(
          "membership_id, note_type, note_text, new_journey_status, created_at, groups!inner(church_id)",
          { count: "exact" },
        )
        .eq("groups.church_id", churchId)
        .in("note_type", ["manual", "journey_status_change"])
        .order("created_at", { ascending: true })
        .order("id", { ascending: true })
        .range(from, to),
    ),
  ]);

  const notesByMembership = new Map<string, NoteRow[]>();
  for (const note of notes) {
    const list = notesByMembership.get(note.membership_id) ?? [];
    list.push(note);
    notesByMembership.set(note.membership_id, list);
  }

  const now = Date.now();

  return requests.map((row) => {
    // Only notes from this request, not an earlier one on the same row.
    const history = (notesByMembership.get(row.request_id) ?? []).filter(
      (note) => note.created_at >= row.requested_at,
    );
    const stage = row.stage ?? 0;
    const stageDate = (at: string | null) => (at ? formatDay(at) : "earlier");
    const lastJourneyNote = history
      .filter((note) => note.note_type === "journey_status_change")
      .at(-1);
    const needsAttention = row.follow_up === "needs_attention";
    const leaderNames = (row.leaders ?? [])
      .map((leader) => leader.name)
      .filter((name): name is string => Boolean(name));

    return {
      id: row.request_id,
      userId: row.person_id,
      name: row.person_name || "Unnamed",
      avatarUrl: row.person_avatar_url || null,
      group: row.group_title,
      groupId: row.group_id,
      leader: leaderNames.join(" & ") || "No leader yet",
      requestedOn: formatDay(row.requested_at),
      requestedAt: row.requested_at,
      requestedDaysAgo: daysSince(row.requested_at, now),
      followUp: row.follow_up ?? "needs_first_contact",
      overdueDays:
        needsAttention && row.days_until_due != null
          ? Math.max(1, -row.days_until_due)
          : undefined,
      dueInDays:
        !needsAttention && row.days_until_due != null
          ? Math.max(0, row.days_until_due)
          : undefined,
      dueReason: dueReason(stage, row.limit_days),
      phone: "",
      progress: {
        reachedOut: stage >= 1 ? stageDate(row.reached_out_at) : null,
        invited: stage >= 2 ? stageDate(row.spoken_to_at) : null,
        attended: stage >= 3 ? stageDate(row.attended_at) : null,
      },
      lastUpdatedOn: lastJourneyNote
        ? formatDay(lastJourneyNote.created_at)
        : undefined,
      lastUpdateNote: lastJourneyNote?.note_text ?? undefined,
      notes: history
        .filter((note) => note.note_type === "manual" && note.note_text)
        .map((note) => note.note_text as string),
      outcome: "active" as const,
    };
  });
}

/**
 * Churches this admin may switch between. A church admin belongs to one
 * church (`users.church_id`); only a superadmin can see them all. Extend this
 * one function if admins are ever linked to several churches.
 */
export async function fetchAccessibleChurches(
  { supabase }: Pick<AdminContextValue, "supabase">,
  home: { id: string; name: string },
  roles: string[],
): Promise<{ id: string; name: string }[]> {
  if (!roles.includes("superadmin")) return [home];

  const { data, error } = await supabase
    .from("churches")
    .select("id, name")
    .order("name", { ascending: true });
  if (error || !data?.some((church) => church.id === home.id)) return [home];
  return data as { id: string; name: string }[];
}

/** Phone number for a person, via the admin-only contact function. */
export async function fetchContactPhone(
  { supabase }: AdminContextValue,
  userId: string,
): Promise<string> {
  const { data, error } = await supabase.rpc("get_user_contact_admin", {
    target_user_id: userId,
  });
  if (error) throw error;
  return (data as { phone?: string | null } | null)?.phone ?? "";
}

type InsightsPersonRow = Pick<
  PersonRow,
  "person_id" | "signed_up_at" | "newcomer" | "outcome"
> & {
  furthest_stage: InsightsPerson["furthestStage"];
  plugged_in: boolean;
};

type InsightsRequestRow = {
  request_id: string;
  group_id: string;
  newcomer: boolean | null;
  status: string;
  requested_at: string;
  archived_at: string | null;
  archive_reason: string | null;
  follow_up: FollowUpState | null;
};

/** The followed up in time columns on `dashboard_requests` (INS-4). */
type InTimeRow = {
  request_id: string;
  reached_out_on: string | null;
  spoken_to_on: string | null;
  attended_on: string | null;
  reached_out_in_time: InTimeResult;
  spoken_to_in_time: InTimeResult;
  attended_in_time: InTimeResult;
};

type InsightsGroupRow = {
  id: string;
  title: string;
  at_capacity: boolean;
};

/** Postgres "column does not exist": the view hasn't been updated yet. */
function isMissingColumn(error: unknown) {
  return (error as { code?: string } | null)?.code === "42703";
}

/**
 * The followed up in time results for every request, or null while the
 * database doesn't have them yet, so the rest of Insights still loads.
 */
async function fetchInTime(admin: AdminContextValue): Promise<InTimeRow[] | null> {
  try {
    return await fetchAllRows<InTimeRow>((from, to) =>
      inScope(
        admin.supabase
          .from("dashboard_requests")
          .select(
            "request_id, reached_out_on, spoken_to_on, attended_on, reached_out_in_time, spoken_to_in_time, attended_in_time",
            { count: "exact" },
          ),
        admin,
      )
        .order("request_id", { ascending: true })
        .range(from, to),
    );
  } catch (error) {
    if (isMissingColumn(error)) return null;
    throw error;
  }
}

/**
 * People, requests and groups behind the Insights charts. No names. People
 * come from `dashboard_people` and requests from `dashboard_requests`, so the
 * counts match every other page.
 */
export async function fetchInsights(
  admin: AdminContextValue,
): Promise<InsightsData> {
  const { supabase, churchId } = admin;
  const [peopleRows, requestRows, inTimeRows, groupsResult] = await Promise.all([
    fetchAllRows<InsightsPersonRow>((from, to) =>
      inScope(
        supabase
          .from("dashboard_people")
          .select("person_id, signed_up_at, newcomer, outcome, furthest_stage, plugged_in", {
            count: "exact",
          }),
        admin,
      )
        .order("person_id", { ascending: true })
        .range(from, to),
    ),
    fetchAllRows<InsightsRequestRow>((from, to) =>
      inScope(
        supabase
          .from("dashboard_requests")
          .select(
            "request_id, group_id, newcomer, status, requested_at, archived_at, archive_reason, follow_up",
            { count: "exact" },
          ),
        admin,
      )
        .order("request_id", { ascending: true })
        .range(from, to),
    ),
    fetchInTime(admin),
    supabase
      .from("groups")
      .select("id, title, at_capacity")
      .eq("church_id", churchId)
      .eq("status", "approved")
      .order("title", { ascending: true }),
  ]);
  check(groupsResult);

  const inTime = new Map((inTimeRows ?? []).map((row) => [row.request_id, row]));

  const people = peopleRows.map(
    (person): InsightsPerson => ({
      signedUpAt: person.signed_up_at,
      isNewcomer: person.newcomer,
      outcome: person.outcome,
      furthestStage: person.furthest_stage,
      pluggedIn: person.plugged_in,
    }),
  );

  const requests = requestRows.map((row): InsightsRequest => {
    const measures = inTime.get(row.request_id);
    return {
      groupId: row.group_id,
      isNewcomer: row.newcomer ?? false,
      status: row.status,
      requestedAt: row.requested_at,
      archivedAt: row.archived_at,
      archiveReason: row.archive_reason,
      followUp: row.follow_up,
      reachedOn: {
        reachedOut: measures?.reached_out_on ?? null,
        spokenTo: measures?.spoken_to_on ?? null,
        attended: measures?.attended_on ?? null,
      },
      inTime: {
        reachedOut: measures?.reached_out_in_time ?? null,
        spokenTo: measures?.spoken_to_in_time ?? null,
        attended: measures?.attended_in_time ?? null,
      },
    };
  });

  const groups = ((groupsResult.data ?? []) as unknown as InsightsGroupRow[]).map(
    (group): InsightsGroup => ({
      id: group.id,
      name: group.title,
      atCapacity: group.at_capacity,
    }),
  );

  return { people, requests, groups, measuresAvailable: inTimeRows !== null };
}
