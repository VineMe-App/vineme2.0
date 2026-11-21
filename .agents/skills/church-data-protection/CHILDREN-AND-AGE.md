# Children, age rules and user-to-user features

#### When to use this file

Read this when under-18s could use the service, when you collect age or date of birth, or when users can message, post or see each other's profiles.

## Rules (UK)
- **Age of digital consent is 13** (UK GDPR Article 8). Under 13, consent-based processing for online services needs consent given or authorised by a parent or guardian, with reasonable efforts to verify it.
- **ICO Children's Code** applies to any service likely used by under-18s (church apps are): DPIA, best interests of the child, high-privacy defaults, no geolocation or profiling by default, minimal data, no nudges to share more, child-friendly privacy information, parental controls transparent to the child.
- **Online Safety Act (Ofcom)**: messaging, posting or visible profiles likely make it a user-to-user service: illegal content and children's access risk assessments, children's protections, reporting and complaints tools, and highly effective age assurance where required (self-declared age isn't enough for that).
- Policy is moving: the government announced a ban on social media for under-16s in June 2026, with details due by the end of 2026 and Ofcom expecting it to start in 2027. Check the current position before shipping social features to young people.

## If the service bars children
- A stated age limit doesn't take a service out of the Children's Code on its own: it still applies if under-18s are likely to use it in practice. Church apps are a likely target for teenagers, so back the limit up.
- Ask for date of birth or an age confirmation at sign-up, and refuse under-age sign-ups without keeping their data.
- Stop invites, referrals, imports and syncs from creating records for children (e.g. skip contacts under 18 when syncing from a church management system).
- Keep children out of what adults upload too: photos of groups or events can still show children (see [ACCESS-AND-VISIBILITY.md](ACCESS-AND-VISIBILITY.md)).
- Record the age limit and how it's enforced in the DPIA.

## Build (if children can use the service)
- Collect date of birth or age band; decide a minimum age or a parental flow.
- Under-18 accounts private by default.
- Adults can't message minors outside safeguarded, leader-approved channels.
- Invites to minors go via a parent.
- Report and block tools that escalate to the church safeguarding officer.

## Checks
- [ ] Minimum age or parental flow decided and enforced
- [ ] Under-18 defaults are private; no geolocation or profiling
- [ ] No unsupervised adult-to-minor messaging
- [ ] Online Safety Act duties checked for any user-to-user feature
- [ ] The DPIA covers children (see [DPIA.md](DPIA.md))
