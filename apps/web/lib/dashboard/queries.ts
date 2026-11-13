import type { AdminContextValue } from "@/lib/dashboard/admin-context";
import type {
  FollowUp,
  Group,
  Member,
  OverviewData,
  ReportGroup,
  ReportPerson,
  ReportStage,
  ReportsData,
  SignupOutcome,
} from "@/lib/dashboard/types";
import { people } from "@/lib/dashboard/terms";

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

type MembershipRow = {
  id: string;
  role: string;
  status: string;
  journey_status: number | null;
  created_at: string;
  groups: Maybe<{ title: string; status: string }>;
};

type MemberRow = {
  id: string;
  name: string | null;
  avatar_url: string | null;
  roles: string[] | null;
  bio: string | null;
  newcomer: boolean | null;
  created_at: string;
  group_memberships: MembershipRow[];
};

function toMember(user: MemberRow): Member {
  const memberships = user.group_memberships ?? [];
  const active = memberships.find((m) => m.status === "active");
  const pending = memberships.find((m) => m.status === "pending");
  const current = active ?? pending;

  const role = user.roles?.includes("church_admin")
    ? people.admin.label
    : active && ["leader", "admin"].includes(active.role)
      ? people.leader.label
      : "Congregation";

  const status = active
    ? "Connected"
    : pending
      ? "Pending follow-up"
      : "Looking for a group";

  return {
    id: user.id,
    name: user.name || "Unnamed",
    avatarUrl: user.avatar_url || null,
    role,
    status,
    group: one(current?.groups)?.title ?? "Unassigned",
    joined: formatMonthYear(user.created_at),
    joinedAt: user.created_at,
    joinedOn: new Date(user.created_at).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }),
    bio: user.bio?.trim() ?? "",
    isNewcomer: Boolean(user.newcomer),
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

const memberColumns =
  "id, name, avatar_url, roles, bio, newcomer, created_at, group_memberships(id, role, status, journey_status, created_at, groups(title, status))";

/** Rows per request when loading every member. */
const MEMBER_BATCH = 500;

/**
 * Every member, newest first: everyone at this church and service, test
 * accounts excluded (see Member and Test account in docs/dashboard/glossary.md).
 * Loads them all in batches, so search and counts on the page cover everyone.
 */
export async function fetchMembers({
  supabase,
  churchId,
  serviceId,
}: AdminContextValue): Promise<Member[]> {
  const batch = (from: number) => {
    let query = supabase
      .from("users")
      .select(memberColumns, { count: "exact" })
      .eq("church_id", churchId);
    if (serviceId) query = query.eq("service_id", serviceId);
    return query
      .or("first_name.is.null,first_name.not.ilike.*test*")
      .or("last_name.is.null,last_name.not.ilike.*test*")
      .order("created_at", { ascending: false })
      .order("id", { ascending: true })
      .range(from, from + MEMBER_BATCH - 1);
  };

  const rows: MemberRow[] = [];
  let total = Infinity;
  while (rows.length < total) {
    const result = await batch(rows.length);
    check(result);
    const data = (result.data ?? []) as unknown as MemberRow[];
    if (data.length === 0) break;
    rows.push(...data);
    // Without a count, keep going while batches come back full.
    total =
      result.count ??
      (data.length === MEMBER_BATCH ? Infinity : rows.length);
  }
  return rows.map(toMember);
}

/** One person, by user ID, shaped like a row on the Members page. */
export async function fetchMember(
  { supabase, churchId }: AdminContextValue,
  userId: string,
): Promise<Member | null> {
  const result = await supabase
    .from("users")
    .select(memberColumns)
    .eq("church_id", churchId)
    .eq("id", userId)
    .maybeSingle();
  check(result);
  return result.data ? toMember(result.data as unknown as MemberRow) : null;
}

export async function fetchOverview({
  supabase,
  churchId,
}: AdminContextValue): Promise<OverviewData> {
  const count = { count: "exact", head: true } as const;

  const [totalPeople, pendingFollowUps, groupsAtCapacity, recent] =
    await Promise.all([
      supabase.from("users").select("id", count).eq("church_id", churchId),
      supabase
        .from("group_memberships")
        .select("id, groups!inner(church_id)", count)
        .eq("groups.church_id", churchId)
        .eq("status", "pending"),
      supabase
        .from("groups")
        .select("id", count)
        .eq("church_id", churchId)
        .eq("status", "approved")
        .eq("at_capacity", true),
      supabase
        .from("users")
        .select(memberColumns)
        .eq("church_id", churchId)
        .order("created_at", { ascending: false })
        .limit(5),
    ]);
  check(totalPeople, pendingFollowUps, groupsAtCapacity, recent);

  return {
    totalPeople: totalPeople.count ?? 0,
    pendingFollowUps: pendingFollowUps.count ?? 0,
    groupsAtCapacity: groupsAtCapacity.count ?? 0,
    members: ((recent.data ?? []) as unknown as MemberRow[]).map(toMember),
  };
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
      avatar_url: string | null;
    }>;
  }[];
};

export async function fetchGroups({
  supabase,
  churchId,
}: AdminContextValue): Promise<Group[]> {
  const result = await supabase
    .from("groups")
    .select(
      "id, title, description, image_url, whatsapp_link, meeting_day, meeting_time, at_capacity, status, location, group_memberships(role, status, member:users!group_memberships_user_id_fkey(name, first_name, avatar_url))",
    )
    .eq("church_id", churchId)
    .in("status", ["approved", "closed"])
    .order("title", { ascending: true });
  check(result);

  return ((result.data ?? []) as unknown as GroupRow[])
    .map((group) => {
      const memberships = group.group_memberships ?? [];
      const leaders = memberships
        .filter((m) => m.status === "active" && m.role === "leader")
        .map((m) => {
          const name = one(m.member)?.name || "Unnamed";
          return { name, firstName: one(m.member)?.first_name?.trim() || name };
        })
        .sort((a, b) => a.name.localeCompare(b.name));
      const time = group.meeting_time?.slice(0, 5);

      return {
        id: group.id,
        name: group.title,
        description: group.description?.trim() ?? "",
        imageUrl: group.image_url || null,
        whatsappLink: group.whatsapp_link || null,
        address: group.location?.address ?? "",
        people: memberships
          .filter((m) => m.status === "active" || m.status === "pending")
          .map((m) => ({
            name: one(m.member)?.name || "Unnamed",
            avatarUrl: one(m.member)?.avatar_url || null,
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
        members: memberships.filter((m) => m.status === "active").length,
        atCapacity: group.at_capacity,
        status: group.status,
        pendingFollowUps: memberships.filter((m) => m.status === "pending")
          .length,
        latitude: mapCoordinate(group.location?.coordinates?.latitude),
        longitude: mapCoordinate(group.location?.coordinates?.longitude),
      };
    })
    .sort((a, b) => b.pendingFollowUps - a.pendingFollowUps);
}

type FollowUpRow = {
  id: string;
  user_id: string;
  group_id: string;
  created_at: string;
  journey_status: number | null;
  member: Maybe<{ name: string | null; avatar_url: string | null }>;
  groups: Maybe<{ title: string }>;
};

type NoteRow = {
  membership_id: string;
  note_type: string;
  note_text: string | null;
  new_journey_status: number | null;
  created_at: string;
};

export async function fetchFollowUps({
  supabase,
  churchId,
}: AdminContextValue): Promise<FollowUp[]> {
  // Every pending request and every note, however many there are.
  const [requests, notes, leaders] = await Promise.all([
    fetchAllRows<FollowUpRow>((from, to) =>
      supabase
        .from("group_memberships")
        .select(
          "id, user_id, group_id, created_at, journey_status, member:users!group_memberships_user_id_fkey(name, avatar_url), groups!inner(title, church_id)",
          { count: "exact" },
        )
        .eq("groups.church_id", churchId)
        .eq("status", "pending")
        .order("created_at", { ascending: true })
        .order("id", { ascending: true })
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
    supabase
      .from("group_memberships")
      .select(
        "group_id, member:users!group_memberships_user_id_fkey(name), groups!inner(church_id)",
      )
      .eq("groups.church_id", churchId)
      .eq("role", "leader")
      .eq("status", "active"),
  ]);
  check(leaders);

  const leadersByGroup = new Map<string, string[]>();
  for (const row of (leaders.data ?? []) as unknown as {
    group_id: string;
    member: Maybe<{ name: string | null }>;
  }[]) {
    const name = one(row.member)?.name;
    if (!name) continue;
    leadersByGroup.set(row.group_id, [
      ...(leadersByGroup.get(row.group_id) ?? []),
      name,
    ]);
  }

  const notesByMembership = new Map<string, NoteRow[]>();
  for (const note of notes) {
    const list = notesByMembership.get(note.membership_id) ?? [];
    list.push(note);
    notesByMembership.set(note.membership_id, list);
  }

  const now = Date.now();

  return requests.map((row) => {
    const history = notesByMembership.get(row.id) ?? [];
    const journey = row.journey_status ?? 0;

    // Journey status: 1 reached out, 2 spoken to (invited), 3 attended group.
    const stepDate = (status: number) => {
      const reached = history
        .filter((note) => note.new_journey_status === status)
        .at(-1);
      return reached ? formatDay(reached.created_at) : "earlier";
    };

    const lastJourneyNote = history
      .filter((note) => note.note_type === "journey_status_change")
      .at(-1);
    const lastActivity = lastJourneyNote?.created_at;

    // When the person reached their current stage. If that was never logged
    // we can only count from the request, so the window may look longer gone.
    const enteredStageAt = (status: number) =>
      history.filter((note) => note.new_journey_status === status).at(-1)
        ?.created_at ?? lastActivity ?? row.created_at;

    const requestedMs = new Date(row.created_at).getTime();
    const attendDeadline = requestedMs + FOLLOW_UP_SLA.attendGroup * DAY_MS;
    let dueAt: number | null = null;
    let dueReason = "";

    if (journey <= 0) {
      dueAt = requestedMs + FOLLOW_UP_SLA.reachOut * DAY_MS;
      dueReason = `Reach out within ${FOLLOW_UP_SLA.reachOut} days of the request`;
    } else if (journey === 1) {
      dueAt =
        new Date(enteredStageAt(1)).getTime() +
        FOLLOW_UP_SLA.afterReachOut * DAY_MS;
      dueReason = `Follow up within ${FOLLOW_UP_SLA.afterReachOut} days of reaching out`;
    } else if (journey === 2) {
      dueAt =
        new Date(enteredStageAt(2)).getTime() +
        FOLLOW_UP_SLA.afterSpokenTo * DAY_MS;
      dueReason = `Follow up within ${FOLLOW_UP_SLA.afterSpokenTo} days of speaking to them`;
    }

    // Whatever the stage, 30 days after the request is the final deadline.
    if (dueAt !== null && attendDeadline < dueAt) {
      dueAt = attendDeadline;
      dueReason = `Attend a group within ${FOLLOW_UP_SLA.attendGroup} days of the request`;
    }
    const isOverdue = dueAt !== null && now > dueAt;

    return {
      id: row.id,
      userId: row.user_id,
      name: one(row.member)?.name || "Unnamed",
      avatarUrl: one(row.member)?.avatar_url || null,
      group: one(row.groups)?.title ?? "Group",
      groupId: row.group_id,
      leader: leadersByGroup.get(row.group_id)?.sort().join(" & ") || "No leader yet",
      requestedOn: formatDay(row.created_at),
      requestedAt: row.created_at,
      requestedDaysAgo: daysSince(row.created_at, now),
      overdueDays:
        isOverdue && dueAt !== null
          ? Math.max(1, Math.floor((now - dueAt) / DAY_MS))
          : undefined,
      dueInDays:
        !isOverdue && dueAt !== null
          ? Math.max(0, Math.ceil((dueAt - now) / DAY_MS))
          : undefined,
      dueReason: dueAt !== null ? dueReason : undefined,
      phone: "",
      progress: {
        reachedOut: journey >= 1 ? stepDate(1) : null,
        invited: journey >= 2 ? stepDate(2) : null,
        attended: journey >= 3 ? stepDate(3) : null,
      },
      lastUpdatedOn: lastActivity ? formatDay(lastActivity) : undefined,
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

const stageRank: Record<ReportStage, number> = {
  "not-reached": 0,
  "reached-out": 1,
  invited: 2,
  attended: 3,
};

function stageFromJourney(status: number | null): ReportStage {
  if (status === 3) return "attended";
  if (status === 2) return "invited";
  if (status === 1) return "reached-out";
  return "not-reached";
}

type ReportUserRow = {
  id: string;
  created_at: string;
  newcomer: boolean | null;
  cannot_find_group: boolean | null;
};

type ReportMembershipRow = {
  user_id: string;
  status: string;
  journey_status: number | null;
  created_at: string;
};

type ReportGroupRow = {
  id: string;
  title: string;
  at_capacity: boolean;
  group_memberships: { status: string }[] | null;
};

/** People, follow-ups and groups behind the Reports charts. No names. */
export async function fetchReports({
  supabase,
  churchId,
}: AdminContextValue): Promise<ReportsData> {
  const [usersResult, membershipsResult, groupsResult] = await Promise.all([
    supabase
      .from("users")
      .select("id, created_at, newcomer, cannot_find_group")
      .eq("church_id", churchId)
      .limit(2000),
    supabase
      .from("group_memberships")
      .select(
        "user_id, status, journey_status, created_at, groups!inner(church_id)",
      )
      .eq("groups.church_id", churchId)
      .limit(2000),
    supabase
      .from("groups")
      .select("id, title, at_capacity, group_memberships(status)")
      .eq("church_id", churchId)
      .eq("status", "approved")
      .order("title", { ascending: true }),
  ]);
  check(usersResult, membershipsResult, groupsResult);

  const memberships = (membershipsResult.data ?? []) as unknown as ReportMembershipRow[];
  const byUser = new Map<string, ReportMembershipRow[]>();
  for (const membership of memberships) {
    const list = byUser.get(membership.user_id) ?? [];
    list.push(membership);
    byUser.set(membership.user_id, list);
  }

  const people = ((usersResult.data ?? []) as unknown as ReportUserRow[]).map(
    (user): ReportPerson => {
      const rows = byUser.get(user.id) ?? [];
      const live = rows.filter(
        (row) => row.status === "active" || row.status === "pending",
      );
      const pending = rows.filter((row) => row.status === "pending");
      const attended = live.some(
        (row) => row.status === "active" || row.journey_status === 3,
      );
      const outcome: SignupOutcome = attended
        ? "attended"
        : pending.length > 0
          ? "requested"
          : "downloaded";

      const furthest = pending.reduce<ReportStage | null>((best, row) => {
        const stage = stageFromJourney(row.journey_status);
        if (!best || stageRank[stage] > stageRank[best]) return stage;
        return best;
      }, null);

      return {
        createdAt: user.created_at,
        isNewcomer: Boolean(user.newcomer),
        askedForHelp: user.cannot_find_group === true,
        outcome,
        pendingStage: furthest,
        pendingSince: pending.reduce<string | null>(
          (earliest, row) =>
            !earliest || row.created_at < earliest ? row.created_at : earliest,
          null,
        ),
      };
    },
  );

  const groups = ((groupsResult.data ?? []) as unknown as ReportGroupRow[])
    .map(
      (group): ReportGroup => ({
        id: group.id,
        name: group.title,
        members: (group.group_memberships ?? []).filter(
          (row) => row.status === "active",
        ).length,
        pending: (group.group_memberships ?? []).filter(
          (row) => row.status === "pending",
        ).length,
        atCapacity: group.at_capacity,
      }),
    )
    .sort((a, b) => b.members - a.members || a.name.localeCompare(b.name));

  return { people, groups };
}
