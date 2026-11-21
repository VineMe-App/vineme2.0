---
name: church-data-protection
description: "Use when designing, building or reviewing software for churches that collects, shows, shares or keeps personal data: sign-up, invites, groups, leaders, children, integrations, AI features, admin access."
---

# Data protection and safeguarding for church software (UK)

Principles for any app, website, dashboard or integration that churches use to manage people. Apply them to every feature that touches personal data. This is engineering guidance, not legal advice: flag anything uncertain for the team, the church's data protection lead or a solicitor.

If the project has its own docs (e.g. `docs/security/`, `docs/decisions/`), read them first; project decisions override the defaults here. Record new privacy or safeguarding decisions there.

## How to use this skill

This file holds the core rules and the checklist. The topic files hold the detail. Read only the topic files the change touches; most changes need one or two.

| Topic file | Read it when the change involves |
|---|---|
| [LAWS-AND-ROLES.md](LAWS-AND-ROLES.md) | Which laws apply, why church data is special category, controller and processor roles |
| [DPIA.md](DPIA.md) | A new feature or system that processes belief, children's or vulnerable people's data at scale, or a big change to one |
| [PEOPLE-AND-CONSENT.md](PEOPLE-AND-CONSENT.md) | Sign-up, invites, referrals, imports, people who haven't signed up, consent, emails, texts, push |
| [ACCESS-AND-VISIBILITY.md](ACCESS-AND-VISIBILITY.md) | Roles, who sees what, leaders, staff views, multi-church data, public embeds, reports |
| [CHILDREN-AND-AGE.md](CHILDREN-AND-AGE.md) | Anyone under 18, age checks, parental consent, messaging or posting between users |
| [ADMIN-SECURITY.md](ADMIN-SECURITY.md) | Staff and leader sign-in, two-factor, sessions, encryption in transit and at rest, devices, backups |
| [AI-TOOLS.md](AI-TOOLS.md) | Any AI or LLM feature, AI vendor, or AI tool used by the team on real data |
| [VENDORS-AND-INTEGRATIONS.md](VENDORS-AND-INTEGRATIONS.md) | Where data is hosted, new vendors or subprocessors, church management system syncs, exports |
| [RIGHTS-RETENTION-AND-BREACHES.md](RIGHTS-RETENTION-AND-BREACHES.md) | Retention and deletion, access or erasure requests, export, breaches |
| [DEVELOPMENT-AND-OPERATIONS.md](DEVELOPMENT-AND-OPERATIONS.md) | Environments, seed data, secrets, migrations, logging, reporting security issues |

Sources: Church of England, "Understanding data protection" (churchofengland.org, PCC responsibilities); ICO guidance (including DPIA, Children's Code and AI guidance); ChurchSuite GDPR and privacy notice pages as an industry baseline.

## Core rules

1. **Church data reveals religious belief.** Memberships, join requests, attendance, prayer requests and pastoral notes are special category data. Treat them that way everywhere (see [LAWS-AND-ROLES.md](LAWS-AND-ROLES.md)).
2. **Safeguarding, vulnerability and health notes are the most sensitive data you hold.** Named roles only; never reachable with public or client keys; never sent to analytics, AI features or third parties without the church's decision.
3. **The seven principles are build checks:**
   - *Lawful, fair, transparent*: users see why each field is asked and who will see it; privacy notice at every point of collection.
   - *Purpose limitation*: data collected for one purpose isn't reused for another (fundraising, marketing, exports, AI) without a new basis.
   - *Minimisation*: only ask what the feature needs; optional means optional in UI and schema.
   - *Accuracy*: people can view and correct their own details.
   - *Storage limitation*: every table with personal data has a retention rule and a deletion or anonymisation job.
   - *Security*: access enforced in the backend, least privilege per role, two-factor for staff, encryption in transit and at rest, no personal data in logs, URLs or analytics.
   - *Accountability*: you can show what you hold, why, where it came from, and who accessed or changed it.
4. **Enforce access in the backend, not the UI.** Every church sees only its own people.
5. **Assess before you build.** Large-scale belief data needs a DPIA; check whether the change alters it (see [DPIA.md](DPIA.md)).
6. **People who haven't signed up haven't agreed to anything.** Keep the minimum and delete it if they don't accept.

## Admin to flag, not build
ICO registration (data protection fee), DPAs with every supplier, the church's DPIA sign-off, the church's own safeguarding lead's checklist, and legal review for anything uncertain.

## Checklist for every change touching personal data
- [ ] Each new field needed, with purpose and lawful basis noted
- [ ] DPIA checked: does this change add a new purpose, data type, audience, vendor or risk?
- [ ] Access rules enforced in the backend and tested per role and per church
- [ ] Special category and safeguarding data restricted; kept out of analytics, logs, exports and AI features
- [ ] Notice at point of collection; consent and data origin recorded; member visibility choices respected
- [ ] No account for people who haven't signed up; contact details shown only to the right person at the right time
- [ ] Viewing or changing sensitive records is logged
- [ ] Staff and leader access needs two-factor; data encrypted in transit and at rest
- [ ] Retention defined; covered by export and erasure
- [ ] Age rules applied: under-13 consent, Children's Code defaults, Online Safety Act duties
- [ ] Comms follow PECR
- [ ] New tool, region, vendor or AI service checked for location, DPA, training use and transfers
- [ ] Only seed data in dev; no secrets committed; security issues kept private
- [ ] Anything uncertain flagged

## Anti-patterns
1. Hiding data in the UI while the API or database still returns it.
2. Creating full accounts or member records for people who were only invited or imported.
3. Treating group membership as ordinary contact data.
4. Sending notes or free-text fields to analytics, error tracking or an AI service "just to try it".
5. Accepting a vendor's default non-UK/EEA region.
6. Copying production data into dev or a test, or pasting it into an AI chat.
7. Writing the DPIA after launch, or never updating it.
