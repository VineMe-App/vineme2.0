# Features

> **Summary.** One folder per product feature, each with a `README.md` written from [`../_templates/feature.md`](../_templates/feature.md). Feature docs say what the feature does, where the code is, and what data it touches.

| Feature | Apps | Doc | Status |
| --- | --- | --- | --- |
| Group leader journey | mobile | [group-leader-journey/](./group-leader-journey/README.md) | Live; redesign and grouped reminders in progress |
| Groups & join requests | mobile, web | [groups-and-join-requests/](./groups-and-join-requests/README.md) | Live. Re-referral, central approval and group types not built |
| Referrals | mobile | [referrals/](./referrals/README.md) | Live |
| Clergy Dashboard | web | [apps/web/docs/dashboard/](../../apps/web/docs/dashboard/README.md) | Active rework |
| ChurchSuite integration | mobile admin, db | [churchsuite/](./churchsuite/README.md) | Not live (rollout gate: internal accounts only) |
| Church website embed | web | [church-website-embed/](./church-website-embed/README.md) | Not built (agreed direction) |
| Authentication | mobile, web | _TODO: write. Start from [architecture/backend.md#auth](../architecture/backend.md#auth)_ | Live |
| Notifications & push | mobile | _TODO: write. Start from [integrations.md#push-notifications](../architecture/integrations.md#push-notifications)_ | Live |
| Events and cross-church network | mobile | [events/](./events/README.md) | Phase 2. Code exists, hidden from users |
| Friends | mobile | Covered in [events/](./events/README.md) for now | Built, does little yet |
| Focus Festival | db (`focus_festival` schema) | _TODO: write_ | _TODO: confirm_ |

Status words: **Live** (users have it), **Not live** (built, switched off), **Not built**, **Phase 2** (deliberately deferred; see the [roadmap](../product/roadmap.md)). Use "_Needs check_" rather than guessing.
