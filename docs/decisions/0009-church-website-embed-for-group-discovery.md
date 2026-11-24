# ADR-0009: Offer a VineMe embed for church websites, rather than relying on ChurchSuite's groups page

- **Status:** Proposed (agreed at the 21 Nov 2026 kickoff as the preferred route; not built)
- **Date:** 2026-11-21
- **Deciders:** Olly, Jacob, Aonghas, Dan (kickoff session)
- **Scope:** web, product
- **Related:** [ADR-0008](./0008-churchsuite-contacts-only.md), [features/church-website-embed](../features/church-website-embed/README.md)

## Context

Churches want their website to show groups and let people ask to join. ChurchSuite has its own public groups page, but VineMe groups aren't in ChurchSuite (ADR-0008), and requests made there wouldn't enter VineMe's follow-up journey.

## Decision

VineMe will provide an embeddable groups finder for church websites: themeable, with request to join, feeding into the normal join request flow. This is preferred over sending people to ChurchSuite's groups page.

## Options considered

| Option | Pros | Cons |
| --- | --- | --- |
| VineMe embed (chosen) | Requests enter the VineMe journey. One source of group data | Has to be built, themed and secured |
| ChurchSuite's groups page | Already exists | Groups would have to be kept in two places. Requests bypass VineMe follow-up |

## Consequences

- **Follow-ups:** theming (logo, accent colour), "copy embed code" in admin, and deciding which data is public. These are tracked as open questions in the feature doc.
- **Privacy:** the embed is a new public surface, so it needs a privacy notice. See [security/data-protection.md](../security/data-protection.md).
