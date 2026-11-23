# Groups & join requests

> **Summary.** Members find groups, ask to join, and are followed up by the group's leaders until they're added or the request is archived. Groups are created by members and approved by a church admin. The rules are in [business-rules.md](../../business-rules.md), and the states are in [architecture/backend.md](../../architecture/backend.md#join-request-lifecycle).

- **Status:** Live
- **Apps:** mobile, web (Clergy Dashboard)
- **Owner:** _TODO: confirm_
- **Last verified against code:** _TODO: trace the full flow and set this date_

## Where the code is

| Layer | Path |
| --- | --- |
| Group screens | `apps/mobile/src/app/group/[id].tsx`, `apps/mobile/src/app/group/create.tsx` |
| Components | `apps/mobile/src/components/groups/` |
| Services | `apps/mobile/src/services/groups.ts`, `services/groupCreation.ts`, `services/joinRequests.ts` |
| Admin | `apps/mobile/src/app/admin/join-requests.tsx`, `admin/manage-groups.tsx` |
| Tables | `groups`, `group_memberships`, `group_membership_notes` |

## Not built yet

| Capability | Today | Open question |
| --- | --- | --- |
| **Re-referral** | A stuck request can only be archived | Add a new `group_memberships` row for the new group, so the new leader is notified and owns it? Needs a link back to the old request. See [ADR-0010](../../decisions/0010-separate-group-members-from-user-accounts.md) |
| **Central approval of requests** | Requests go straight to the group's leaders. (Group *creation* is already approved centrally: new groups start `pending`.) | Some churches, especially smaller ones, want requests vetted centrally first. A per-church toggle? |
| **Group types** (teams, hobby groups, courses) | `groups` has no type column | Teams could be phase 1. Can some types be open to join while connect groups need vetting? |
| **Multi-church users** | Each user has one `users.church_id` | Not urgent with one church. Eventually a church memberships table ([ADR-0010](../../decisions/0010-separate-group-members-from-user-accounts.md)) |
