---
name: church-data-protection
description: "Use when designing, building or reviewing software for churches that collects, shows, shares or keeps personal data: sign-up, invites, groups, leaders, children, integrations."
---

# Data protection and safeguarding for church software (UK)

Principles for any app, website, dashboard or integration that churches use to manage people. Apply them to every feature that touches personal data. This is engineering guidance, not legal advice: flag anything uncertain for the team, the church's data protection lead or a solicitor.

If the project has its own docs (e.g. `docs/security/`, `docs/decisions/`), read them first; project decisions override the defaults here. Record new privacy or safeguarding decisions there.

Sources: Church of England, "Understanding data protection" (churchofengland.org, PCC responsibilities); ICO guidance; ChurchSuite GDPR and privacy notice pages as an industry baseline.

## Laws that apply
- **UK GDPR**: principles, lawful bases, rights, accountability. Any data about living people, digital or paper.
- **Data Protection Act 2018**: UK additions, special category conditions, safeguarding, age of consent.
- **PECR**: marketing emails/texts, notifications used for promotion, cookies.
- **Data (Use and Access) Act 2025**: amends the above (complaints, some lawful-processing rules).
- **Online Safety Act 2023**: if users can message or post to each other.

## The seven principles, as build checks
1. **Lawful, fair, transparent**: users see why each field is asked and who will see it; privacy notice linked at every point of collection.
2. **Purpose limitation**: data collected for one purpose (e.g. joining a group) isn't reused for another (fundraising, marketing, exports) without a new basis.
3. **Minimisation**: only ask what the feature needs; optional means optional in UI and schema.
4. **Accuracy**: people can view and correct their own details.
5. **Storage limitation**: every table with personal data has a retention rule (stale requests, declined invites, leavers) and a deletion or anonymisation job.
6. **Security**: access control enforced in the database/backend (e.g. row-level security on every table), least privilege per role, secret/admin keys server-side only, no personal data in logs, URLs or analytics.
7. **Accountability**: you can show what you hold, why, where it came from, and who accessed or changed it.

## Why church data is different
- **Church or group membership reveals religious belief**, which is special category data. Treat memberships, join requests, attendance, prayer requests and pastoral notes as special category. Churches usually rely on the not-for-profit religious body condition, which covers members and regular contacts only and does not allow disclosure outside the church without consent.
- **Safeguarding, vulnerability and health notes** are the most sensitive: restrict to named roles, never reachable with public/client keys, never sent to analytics or third parties.
- **Multi-church / multi-tenant**: each church sees only its own people. A person linked to several churches must not have one church's data shown to another.
- **Roles**: the church is the controller for its people's data; the software provider is usually a processor and needs a written controller-processor agreement. The provider is controller only for its own website, marketing and support data.

## People who haven't signed up
- Someone added by a friend, leader or import hasn't consented. Don't create a full user account for them. Keep a minimal record (name, one contact method for the invite), link it to an account only when they accept, and delete it if they don't within a set period.
- Don't mark them as a member or infer belief until they accept.
- Record the origin of every person's data (self sign-up, referral, leader-added, sync, import) and every change since, with who made it.

## Sign-up, consent and communications
- Every form (sign-up, join request, website embed) shows the privacy notice: who the controller is, what's collected, why, who sees it, how long, and their rights, with an explicit opt-in. Send a confirmation email that also serves as a record.
- Pick and record a lawful basis per purpose: legitimate interests or contract for running groups; consent for optional things (photos visible to others, marketing).
- Consent is opt-in (no pre-ticked boxes), granular, stored with timestamp and wording, and as easy to withdraw as to give. Support sending consent requests to existing people and parents.
- Service messages are fine; promotional messages need consent or valid soft opt-in. Every email has unsubscribe and a preferences page.

## Who sees what (safeguarding by design)
- Members choose which contact details others can see; default to least visible. Leaders see only what they need, not full profiles.
- A requester's contact details go only to the leader who needs them, only when needed. Never to other members.
- Support optional central vetting so a church can check requests before leaders see them, without leaking details early.
- Scope staff views by role (e.g. a service or campus pastor sees their area, not the whole church). Enforce in the backend, not just the UI.
- Log who viewed or changed personal and safeguarding records.
- Let churches switch off reports they don't need, so staff can't report outside their stated purposes.
- Reporting/BI tools often connect with users that bypass app-level access rules: limit who can reach them and keep sensitive fields out.
- Anything public (website embeds, group finders): group name, area, day, leader first name at most. No member lists, home addresses or requester details.
- Open group types (teams, hobbies) may skip vetting, but anything involving under-18s or vulnerable adults follows safeguarding rules.

## Age rules (UK)
- **Age of digital consent is 13** (DPA 2018 s9). Under 13, consent-based processing needs a parent or guardian's verified consent.
- **ICO Children's Code** applies to any service likely used by under-18s (church apps are): DPIA, best interests of the child, high-privacy defaults, no geolocation or profiling by default, minimal data, no nudges to share more, child-friendly privacy information, parental controls transparent to the child.
- **Online Safety Act (Ofcom)**: messaging, posting or visible profiles likely make it a user-to-user service: illegal content and children's access risk assessments, children's protections, reporting and complaints tools, and highly effective age assurance where required (self-declared age isn't enough for that).
- Policy is moving: check the current UK position on under-16s and social media before shipping social features to young people.
- Build: collect date of birth or age band; decide a minimum age or a parental flow; under-18 accounts private by default; adults can't message minors outside safeguarded, leader-approved channels; invites to minors go via a parent; report and block tools that escalate to the church safeguarding officer.

## Where data is stored
- Host personal data in the UK or EEA. Database region is often fixed at creation (e.g. Supabase: check Project Settings, prefer London eu-west-2); confirm before go-live. Edge or serverless functions may run worldwide, so keep personal data processing in the regional backend where possible.
- Outside UK/EEA needs adequacy, the UK Extension to the EU-US Data Privacy Framework, or an IDTA/UK Addendum plus a transfer risk assessment. Transfer only what's necessary.
- Before adding any tool or vendor (email/SMS, analytics, BI, church management systems, hosting/CDN, error tracking, AI APIs, push): check where data is stored and processed, EU/UK region options, subprocessors, a signed DPA, the transfer mechanism, and whether special category data would reach it. Add it to a published subprocessor list and the privacy notice. Never accept a non-UK/EEA region just because it's the default.

## Integrations with church management systems
- Sync the minimum (e.g. contacts only). Match or create without overwriting the church's records.
- Don't push special category data (group membership, pastoral notes) to another system unless the church has decided it and the basis covers it.
- Exports (CSV etc.) are special category data: admin-only, logged.

## Development and operations
- Separate dev and production environments; dev uses fake seed data only. Contributors never see real people; never copy production data locally.
- No secrets in git history (rotate any that were committed); share secrets via a secrets manager, not chat; named owners run production migrations; turn on secret scanning and dependency alerts.
- Keep security findings out of public issues and PRs; raise privately.

## Individuals' rights
Access (one month to respond), rectification, erasure, restriction, objection, portability, withdrawing consent. Provide one written channel for requests, an in-app deletion request that notifies the church's data protection contact, and per-person export and delete covering all linked records.

## Breaches
A personal data breach (e.g. an access-rule gap) may need reporting to the ICO within 72 hours of awareness, and to affected people if high risk. Have a breach procedure before you need one.

## Admin to flag, not build
ICO registration (data protection fee), DPAs with every supplier, the church's own safeguarding lead's checklist, and legal review for anything uncertain.

## Checklist for every change touching personal data
- [ ] Each new field needed, with purpose and lawful basis noted
- [ ] Access rules enforced in the backend and tested per role and per church
- [ ] Special category and safeguarding data restricted; kept out of analytics, logs and exports
- [ ] Notice at point of collection; consent and data origin recorded; member visibility choices respected
- [ ] No account for people who haven't signed up; contact details shown only to the right person at the right time
- [ ] Viewing or changing sensitive records is logged
- [ ] Retention defined; covered by export and erasure
- [ ] Age rules applied: under-13 consent, Children's Code defaults, Online Safety Act duties
- [ ] Comms follow PECR
- [ ] New tool, region or vendor checked for location, DPA and transfers
- [ ] Only seed data in dev; no secrets committed; security issues kept private
- [ ] Anything uncertain flagged
