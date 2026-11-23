# Glossary

> **Summary.** The domain words used across code and docs, with one meaning each. The Clergy Dashboard has stricter definitions (connected, plugged in, newcomer, needs help, follow-up states) in [apps/web/docs/dashboard/glossary.md](../apps/web/docs/dashboard/glossary.md). For dashboard work, that file wins.

| Term | Meaning | In code |
| --- | --- | --- |
| **Church** | A church organisation using VineMe. The tenant boundary: RLS keeps churches apart. | `churches` |
| **Service** | A congregation or meeting within a church (e.g. "10am", "Evening"). Can map to a ChurchSuite *site*. | `services` |
| **Group** | A small group that people join, usually tied to a service. | `groups` (`status`: pending / approved / denied / closed) |
| **Connect group** | What churches and the app call a group ("The connect group leaders will be able to see your contact details…"). Today every group is a connect group. | `groups` |
| **Group type** | Not built. Planned kinds of group besides connect groups: teams, hobby groups, courses, events. | none yet ([ADR-0010](./decisions/0010-separate-group-members-from-user-accounts.md)) |
| **Member** | A person with a VineMe account. | `users` |
| **Membership** | A person's link to a group. | `group_memberships` |
| **Join request** | A membership with `status = 'pending'`, waiting for the leader. | `group_memberships.status` |
| **Journey status** | How far a leader has got with a pending request: no contact, reached out, spoken to, attended. | `group_memberships.journey_status` (null/0–3) |
| **Membership note** | Free-text note or recorded stage change on a membership. | `group_membership_notes` |
| **Group leader** | A member who manages a group and its requests. | role on `group_memberships` |
| **Church admin / clergy** | Staff who use the admin tools and Clergy Dashboard. | `users.roles` contains `church_admin`; `get_auth_context` |
| **Plugged in**, **connected**, **needs help** | Dashboard measures. Defined only in the [dashboard glossary](../apps/web/docs/dashboard/glossary.md). | |
| **Searcher** | Someone using VineMe to find a group. Close to the dashboard's *Newcomer*. | `users.newcomer` |
| **Re-referral** | Not built. Passing a stuck request on to a different group, so the new leader owns it. | none yet |
| **Central approval** | Not built. A church vetting join requests centrally before they reach leaders. (New *groups* are already approved centrally.) | none yet |
| **Proxy member** | Proposed, not built. Someone added by a referrer or leader who hasn't signed up themselves. | [ADR-0010](./decisions/0010-separate-group-members-from-user-accounts.md) |
| **Phase 2** | Work deliberately deferred: events and a cross-church network. | [product/roadmap.md](./product/roadmap.md) |
| **Referral** | One member putting someone else forward, either generally or to a specific group. Creates the referred person's account. | `referrals`, `create-referred-user` |
| **Vulnerable person** | Safeguarding flag, owned by ChurchSuite. See ADR-0005. | `users.is_vulnerable` |
| **ChurchSuite** | Third-party church management system that VineMe syncs contacts and tags with. | `churchsuite_connections`, `users.churchsuite_id` |
| **Feature flag** | Runtime toggle from supaflag. | `feature_flag`, `useFeatureFlag` |

Adding a term: one line, one meaning, plus where it lives in code. If a word means different things in two places, fix the code or docs rather than adding a second meaning.
