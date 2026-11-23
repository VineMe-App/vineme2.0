# Church website embed

> **Summary.** A themeable VineMe groups finder that churches put on their own website, with request to join. Agreed as the preferred route over ChurchSuite's groups page ([ADR-0009](../../decisions/0009-church-website-embed-for-group-discovery.md)). **Not built.**

- **Status:** Not built (idea agreed at the 21 Nov 2026 kickoff)
- **Apps:** web
- **Owner:** _TODO: confirm_
- **Last verified against code:** 2026-11-22

## Starting points in the code

| What | Where | Notes |
| --- | --- | --- |
| Public find-a-church / find-a-group pages with a map | `apps/web/app/find/page.tsx`, `apps/web/app/church/page.tsx` | Already public, so probably the closest base |
| Dashboard groups page with map | `apps/web/app/dashboard/groups/page.tsx`, `apps/web/components/dashboard/GroupsMap.tsx` | Described at the kickoff as close to what's needed, but it runs as a signed-in admin |
| Join request flow | `apps/mobile/src/services/joinRequests.ts` | Mobile only today. An embed needs a web path into the same flow |

## Open questions

- **Theming:** logo and accent colour per church. Where are they stored?
- **Admin:** a "copy embed code" button in admin.
- **Public data:** which group fields can be shown to anonymous visitors (meeting place, leader names?), and how this works with RLS.
- **Request to join without the app:** does the visitor need an account, and how is consent captured? See [security/data-protection.md](../../security/data-protection.md).
- **Web experience for searchers:** today searchers can only use the native app. Options: the embed on church sites, a web build of the React Native app, or both.
- **Privacy notice** on the embed itself.
