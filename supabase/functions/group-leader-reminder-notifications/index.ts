// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

console.log("Hello from Functions!");

// This endpoint uses 'publishable' | 'secret' access, apiKey is required.
// Use publishable for Client-facing, key-validated endpoints
// Use secret for Server-to-server, internal calls
export default {
  fetch: withSupabase({ auth: ["publishable", "secret"] }, async (req, ctx) => {
    // Called by another service with a secret key
    // ctx.supabaseAdmin bypasses RLS — use for privileged operations

    // How long a request has to have been sitting at a given journey_status
    // before we remind its leader about it — a leader who has already
    // reached out/spoken to someone gets more grace before the next nudge.
    // Hardcoded for now — TODO: make this configurable (e.g. per church or
    // per leader) instead of fixed constants.
    // journey_status 3 ("Attended CG") is deliberately left out for now —
    // no reminder delay has been decided for that stage yet.
    const DAY_MS = 24 * 60 * 60 * 1000;
    const REMINDER_DELAY_MS_BY_JOURNEY_STATUS: Record<number, number> = {
      0: 3 * DAY_MS, // no contact yet (journey_status is null)
      1: 7 * DAY_MS, // reached out to
      2: 14 * DAY_MS, // spoken to
    };

    // group_memberships has no church_id of its own — it lives on the parent
    // group, so pull it through the groups relationship.
    const { data: allPendingMemberships, error: pendingMembershipsError } =
      await ctx.supabaseAdmin
        .from("group_memberships")
        .select("id, user_id, group_id, journey_status, created_at")
        .eq("status", "pending");

    if (pendingMembershipsError) {
      return Response.json(
        { error: pendingMembershipsError.message },
        { status: 500 },
      );
    }

    // created_at on group_memberships is when the request was first
    // submitted — fine as the reference point for journey_status 0/null
    // (never contacted), but for 1/2 we need when it actually transitioned
    // into that status, which only group_membership_notes records.
    const membershipIdsNeedingNoteLookup = (allPendingMemberships ?? [])
      .filter((m) => m.journey_status === 1 || m.journey_status === 2)
      .map((m) => m.id);

    // Newest-first, so the first note seen for a given (membership_id,
    // new_journey_status) pair is the most recent transition into it.
    const latestJourneyChangeAtByKey = new Map<string, string>();
    if (membershipIdsNeedingNoteLookup.length > 0) {
      const { data: journeyNotes, error: journeyNotesError } =
        await ctx.supabaseAdmin
          .from("group_membership_notes")
          .select("membership_id, new_journey_status, created_at")
          .eq("note_type", "journey_status_change")
          .in("membership_id", membershipIdsNeedingNoteLookup)
          .order("created_at", { ascending: false });

      if (journeyNotesError) {
        return Response.json(
          { error: journeyNotesError.message },
          { status: 500 },
        );
      }

      for (const note of journeyNotes ?? []) {
        const key = `${note.membership_id}:${note.new_journey_status}`;
        if (!latestJourneyChangeAtByKey.has(key)) {
          latestJourneyChangeAtByKey.set(key, note.created_at);
        }
      }
    }

    const now = Date.now();
    const pendingMemberships = (allPendingMemberships ?? []).filter((m) => {
      if (m.journey_status === 3) return false;

      const delayMs =
        REMINDER_DELAY_MS_BY_JOURNEY_STATUS[m.journey_status ?? 0];

      // Fall back to created_at if there's no note (journey_status is
      // null/0, or the note write failed — see createJourneyChangeNote,
      // which is best-effort).
      const referenceTimestamp =
        latestJourneyChangeAtByKey.get(`${m.id}:${m.journey_status}`) ??
        m.created_at;

      return now - new Date(referenceTimestamp).getTime() >= delayMs;
    });

    // Look up the active leader(s) for every group that has a pending
    // membership, so we know who to send the reminder to.
    const groupIds = [
      ...new Set((pendingMemberships ?? []).map((m) => m.group_id)),
    ];

    const leadersByGroupId = new Map<string, string[]>();
    if (groupIds.length > 0) {
      const { data: leaderMemberships, error: leaderMembershipsError } =
        await ctx.supabaseAdmin
          .from("group_memberships")
          .select("group_id, user_id")
          .eq("role", "leader")
          .eq("status", "active")
          .in("group_id", groupIds);

      if (leaderMembershipsError) {
        return Response.json(
          { error: leaderMembershipsError.message },
          { status: 500 },
        );
      }

      for (const leader of leaderMemberships ?? []) {
        const leaderIds = leadersByGroupId.get(leader.group_id) ?? [];
        leaderIds.push(leader.user_id);
        leadersByGroupId.set(leader.group_id, leaderIds);
      }
    }

    // Fetch push tokens for every leader in one batched query rather than
    // one request per leader.
    const allLeaderIds = [
      ...new Set([...leadersByGroupId.values()].flatMap((ids) => ids)),
    ];

    const pushTokensByLeaderId = new Map<string, string[]>();
    if (allLeaderIds.length > 0) {
      const { data: pushTokens, error: pushTokensError } =
        await ctx.supabaseAdmin
          .from("user_push_tokens")
          .select("user_id, push_token")
          .in("user_id", allLeaderIds);

      if (pushTokensError) {
        return Response.json(
          { error: pushTokensError.message },
          { status: 500 },
        );
      }

      for (const token of pushTokens ?? []) {
        const tokens = pushTokensByLeaderId.get(token.user_id) ?? [];
        tokens.push(token.push_token);
        pushTokensByLeaderId.set(token.user_id, tokens);
      }
    }

    // Fetch the requester's name for every pending membership in one batched
    // query.
    const pendingUserIds = [
      ...new Set((pendingMemberships ?? []).map((m) => m.user_id)),
    ];

    const namesByUserId = new Map<
      string,
      { first_name: string | null; last_name: string | null }
    >();
    if (pendingUserIds.length > 0) {
      const { data: users, error: usersError } = await ctx.supabaseAdmin
        .from("users")
        .select("id, first_name, last_name")
        .in("id", pendingUserIds);

      if (usersError) {
        return Response.json({ error: usersError.message }, { status: 500 });
      }

      for (const user of users ?? []) {
        namesByUserId.set(user.id, {
          first_name: user.first_name,
          last_name: user.last_name,
        });
      }
    }

    // One entry per group (not per request), so a leader with several
    // pending requests on the same group gets a single reminder.
    const requestsByGroupId = new Map<
      string,
      { user_id: string; first_name: string | null; last_name: string | null }[]
    >();
    for (const membership of pendingMemberships ?? []) {
      const requests = requestsByGroupId.get(membership.group_id) ?? [];
      const name = namesByUserId.get(membership.user_id);
      requests.push({
        user_id: membership.user_id,
        first_name: name?.first_name ?? null,
        last_name: name?.last_name ?? null,
      });
      requestsByGroupId.set(membership.group_id, requests);
    }

    const pending = groupIds.map((groupId) => {
      const leaderIds = leadersByGroupId.get(groupId) ?? [];
      return {
        group_id: groupId,
        leader_ids: leaderIds,
        leader_push_tokens: leaderIds.flatMap(
          (leaderId) => pushTokensByLeaderId.get(leaderId) ?? [],
        ),
        requests: requestsByGroupId.get(groupId) ?? [],
      };
    });

    // One notification row per leader per group — inserting into
    // `notifications` (rather than calling push-notify-2 directly) triggers
    // the existing "push_notifications" webhook, so leaders get both the
    // in-app record and the push.
    const notificationRows = pending.flatMap(({ group_id, leader_ids, requests }) => {
      const count = requests.length;
      const body = `${count} pending join request${count === 1 ? "" : "s"} for your group`;

      return leader_ids.map((leaderId) => ({
        user_id: leaderId,
        type: "join_request_received",
        title: "Pending Join Requests",
        body,
        data: {
          group_id,
          request_user_ids: requests.map((r) => r.user_id),
        },
        action_url: `/group-management/${group_id}?tab=requests`,
      }));
    });

    if (notificationRows.length > 0) {
      const { error: notificationsError } = await ctx.supabaseAdmin
        .from("notifications")
        .insert(notificationRows);

      if (notificationsError) {
        return Response.json(
          { error: notificationsError.message },
          { status: 500 },
        );
      }
    }

    return Response.json({ pending, notifications_sent: notificationRows.length });
  }),
};

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/group-leader-reminder-notifications' \
    --header 'apiKey: sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH' \
    --data '{"name":"Functions"}'

*/
