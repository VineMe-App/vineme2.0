# Safeguarding

> **Summary.** Who can see whom in VineMe, and the safeguarding questions still open. Churches will ask these as adoption grows, so answers here should point to the code that enforces them.

Last verified against code: 2026-11-22

## What the system does today

| Question | Today | Where |
| --- | --- | --- |
| Who sees a requester's contact details? | The group's leaders, as soon as the request is sent. The app warns first. | [ADR-0006](../decisions/0006-join-requests-share-contact-details-by-notice.md), `GroupDetail.tsx` |
| Who sees members' contact details otherwise? | Church admins, through `get_user_contact_admin` | [backend.md](../architecture/backend.md#access-control) |
| Are requests vetted before reaching leaders? | No. Requests go straight to leaders. | [groups & join requests](../features/groups-and-join-requests/README.md#not-built-yet) |
| Vulnerable people | `users.is_vulnerable`, from the ChurchSuite tag, synced daily | [ADR-0005](../decisions/0005-churchsuite-source-of-truth-for-vulnerable-flag.md) |
| Under-18s | No age or date of birth is stored, so the app can't check age. | `users` table |
| Log of who viewed or changed records | Stage changes and notes are recorded in `group_membership_notes`. Views are not logged, and notes don't yet record the author's role (dashboard issue DEV-7). | |
| In-app messaging | None. Groups link out to WhatsApp (`groups.whatsapp_link`), where the church has no oversight. | [product/vineme-vs-jovo.md](../product/vineme-vs-jovo.md#safeguarding-compared) |

## Checks to do

- [ ] Decide who may see a requester's contact details, and when: only the leader? Only after accepting?
- [ ] Optional central vetting before requests reach leaders (some churches, especially smaller ones, have asked for this).
- [ ] Decide how under-18s are handled: an age check, or not allowed.
- [ ] A log of who viewed or changed personal records.
- [ ] Ask the IT and safeguarding leads at the large churches we work with for their checklists.
