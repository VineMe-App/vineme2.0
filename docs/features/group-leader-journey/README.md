# Group leader journey

> **Summary.** How a group leader handles requests to join their group: getting notified, logging each stage (reached out, spoken to, attended), adding the person, and being reminded about requests that stall.

- **Status:** Live, with a redesign in progress
- **Apps:** mobile
- **Owner:** Esther (design), Tom (development)
- **Last verified against code:** 2026-11-22

## Where things stand

- **Designs:** Esther's redesign of the leader journey is done. _TODO: link the designs._ Who picks up building them into the app is still open.
- **Grouped reminders:** Tom is building grouped reminder notifications (for example a weekly "you have 5 outstanding").

## Where the code is

| Layer | Path |
| --- | --- |
| Leader screens | `apps/mobile/src/app/group-management/[groupId]/` |
| Components | `apps/mobile/src/components/groups/` (`JoinRequestsPanel`, `JoinRequestCard`, `GroupLeaderPanel`, `MembershipNotesSection`, `ArchiveRequestModal`) |
| Services | `apps/mobile/src/services/joinRequests.ts` |
| Reminders | `supabase/functions/group-leader-reminder-notifications` (run by `pg_cron`) |

## Reminders today

`group-leader-reminder-notifications` reminds leaders about pending requests that have sat at one stage too long:

| Stage | Reminder after | Counted from |
| --- | --- | --- |
| Not contacted | 3 days | the request |
| Reached out | 7 days | moving into that stage (`group_membership_notes`) |
| Spoken to | 14 days | moving into that stage |
| Attended | No reminder yet | |

The function already sends one notification per group with a count ("3 pending join requests for your group"). It runs daily at 09:00 UTC by default (`group_leader_reminder_notifications_schedule` in Vault), but production can be changed by hand. It also needs the `app.settings.sb_secret_key` database setting, which no migration sets. See [environment setup](../../guides/environment-setup.md#database-vault-secrets-and-settings).

> **Watch out:** these limits differ from the Clergy Dashboard's (6, 10, 14 and 30 days, in [the dashboard glossary](../../../apps/web/docs/dashboard/glossary.md#follow-up-states-and-time-limits)). Grouped reminders should state which limits they use, so there aren't three different sets.

## Related

- [Groups & join requests](../groups-and-join-requests/README.md)
- [Join request lifecycle](../../architecture/backend.md#join-request-lifecycle)
