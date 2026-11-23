# ADR-0008: ChurchSuite sync is contacts only; group membership lives in VineMe

- **Status:** Proposed (agreed at the 21 Nov 2026 kickoff)
- **Date:** 2026-11-21
- **Deciders:** Olly, Jacob, Aonghas, Dan (kickoff session)
- **Scope:** integrations, db
- **Related:** [ADR-0005](./0005-churchsuite-source-of-truth-for-vulnerable-flag.md), [ADR-0007](./0007-keep-own-database.md), [features/churchsuite](../features/churchsuite/README.md)

## Context

VineMe already matches or creates a ChurchSuite contact for each user (`create-churchsuite-contact`, triggered when `users.church_id` is set). It tags the contact "VineMe (created)" or "VineMe (matched)" and never overwrites an existing contact's details. The question was whether to sync group membership as well.

ChurchSuite's API can't create groups (reported by the team; _TODO: link the API docs_), so VineMe groups can't be mirrored there automatically.

## Decision

- The ChurchSuite sync covers **contacts and tags only**: matching or creating contacts, the VineMe tags, and the Vulnerable Person flag (ADR-0005).
- **Group membership lives in VineMe.** VineMe doesn't try to write groups or memberships to ChurchSuite.
- Churches that want group records in ChurchSuite can use the existing CSV export (`export-groups-csv`), which produces ChurchSuite import files.

## Options considered

| Option | Pros | Cons |
| --- | --- | --- |
| Contacts only (chosen) | Fits what the API allows. Small surface to keep correct | Church office has to import CSVs if it wants groups in ChurchSuite |
| Full group and membership sync | ChurchSuite stays complete | Not possible through the API today |

## Consequences

- **Good:** a clear boundary: ChurchSuite owns the person record, VineMe owns groups and the journey.
- **Trade-off:** ChurchSuite's group pages won't show VineMe groups. This is one reason for the church website embed ([ADR-0009](./0009-church-website-embed-for-group-discovery.md)).
- **Note:** the contact sync is still behind a temporary rollout gate (internal `@vineme.app` accounts only). It isn't live for churches yet.
- **Open question:** whether the CSV export needs extending for church office records. See [features/churchsuite](../features/churchsuite/README.md#open-questions).
