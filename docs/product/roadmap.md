# Roadmap

> **Summary.** What's in phase 1 and what's deferred to phase 2, as agreed at the 21 Nov 2026 kickoff. Phase 1 focuses on large churches. Per-feature status and open questions live in each [feature doc](../features/README.md); this page is the overview and the order of work.

- **Last updated:** 2026-11-22
- **Next review:** after the early December meeting with a large partner church, which should show what's blocking wider adoption

## Focus

- **Who for:** large churches.
- **Security and privacy are part of phase 1,** not later, because the app holds personal and safeguarding-sensitive data. See [security/](../security/README.md).
- **Docs first:** decisions are written down in the repo ([decisions/](../decisions/README.md)) so people and AI agents can see what was decided and why.

## Phase 1: feature areas

| Area | Where it stands | Doc |
| --- | --- | --- |
| Group leader journey | Designs done (Esther). Grouped reminder notifications in progress (Tom) | [group-leader-journey](../features/group-leader-journey/README.md) |
| Clergy dashboard | Built by Jacob and Dan, being refined by Olly. Role-level access (service pastor vs whole church) is dashboard issue DEV-9 | [dashboard plan](../../apps/web/docs/dashboard/README.md) |
| ChurchSuite sync | Built but not live (rollout gate). Contacts only | [churchsuite](../features/churchsuite/README.md) |
| Church website embed | Agreed direction, not built | [church-website-embed](../features/church-website-embed/README.md) |
| Referrals and proxy members | Live; data model change proposed | [referrals](../features/referrals/README.md), [ADR-0010](../decisions/0010-separate-group-members-from-user-accounts.md) |
| Re-referral | Not built | [groups & join requests](../features/groups-and-join-requests/README.md#not-built-yet) |
| Central approval of requests | Not built | same |
| Group types | Not built. Teams could be phase 1 | same |
| Web experience for searchers | Native app only | [church-website-embed](../features/church-website-embed/README.md#open-questions) |
| Multi-church users | One church per user. Not urgent | [ADR-0010](../decisions/0010-separate-group-members-from-user-accounts.md) |

## Phase 2

- **Events and a cross-church network.** Events code exists but is hidden. Friend relationships exist but do little yet. See [events](../features/events/README.md).
- **Planning Center integration** may be needed, as some churches are moving to it. See [integrations.md](../architecture/integrations.md#future-integrations).

## Documentation and security work

From the kickoff. Each item should become a GitHub issue; owners are suggestions.

| Step | Owner | State |
| --- | --- | --- |
| Tidy repo access ([checklist](../security/access-and-secrets.md#checks-to-do)) | Jacob, Olly | To do |
| Create the docs structure | Aonghas | Done, pending PR |
| Inventory what exists: fill in the Status column of [features/README.md](../features/README.md) (prompt in [maintaining-docs.md](../maintaining-docs.md#prompts-for-agents)) | Aonghas or anyone | Partly done |
| Draw the real data model against the Supabase schema | Olly | To do |
| Confirm the Proposed ADRs 0007–0010 | Team | To do |
| Start the security audit, from Aonghas's hackathon audit | Dan | To do |
| Review status, data model and decisions before agents rely on them | Tom | To do |
| Prioritise and raise issues (prompt in [maintaining-docs.md](../maintaining-docs.md#prompts-for-agents)) | All, at the next session | To do |
| Finish the [getting-started guide](../getting-started.md) | Whoever joins most recently | Draft |
