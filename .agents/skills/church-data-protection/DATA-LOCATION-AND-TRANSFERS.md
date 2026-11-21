# Data location and international transfers

#### When to use this file

Read this when choosing a hosting region, adding any service that stores or processes personal data (including dev, CI, logging and monitoring tools), letting someone outside the UK access data, or answering "where is our data?".

## What the law actually says
- UK GDPR doesn't say data must stay in the UK. It **restricts transfers**: sending personal data to, or making it accessible from, a receiver in another country (UK GDPR Chapter V). Remote access counts as a transfer, not just copying.
- A transfer is allowed only if one of these applies, checked in this order:
  1. **UK adequacy regulations ("data bridges")**: the EEA, plus countries the UK has approved (e.g. Switzerland, Japan, South Korea, Canada for commercial bodies, the Channel Islands, Isle of Man). Check the ICO's current list.
  2. **The US only via the UK Extension to the EU-US Data Privacy Framework**, and only to companies certified for the UK Extension. Check the vendor's certification; plain EU-US DPF isn't enough.
  3. **Appropriate safeguards**: the ICO's International Data Transfer Agreement (IDTA), or the EU Standard Contractual Clauses with the UK Addendum, **plus a transfer risk assessment** (TRA) showing the protection holds up in practice (e.g. government access laws).
  4. **Exceptions** (explicit consent, contract necessity and so on) are for occasional, one-off transfers. Never use them for routine hosting or a vendor's service.
- The Data (Use and Access) Act 2025 changes the adequacy test to a "data protection test" (protection not materially lower than the UK's). It's being brought in in stages: check what has commenced before relying on it.
- If the software also serves churches in the EU, EU GDPR applies to their data too. The EU recognises the UK as adequate (renewed in 2025); check the current position.

## Default for church data
- Keep **special category data (memberships, attendance, pastoral, safeguarding) in the UK or EEA**, in every copy. Use a transfer mechanism only for services that can't avoid it, and send them the minimum.
- Treat a non-UK/EEA region as a decision to record (mechanism, TRA, who approved), never an accepted default.
- Tell people in the privacy notice which countries data goes to and on what basis, and keep the subprocessor list current.

## Every place data lives
Personal data is often stored in more places than the main database. Check and record the region of each:
- **Primary database, read replicas and backups** (region is often fixed at creation: e.g. Supabase, check Project Settings, prefer London eu-west-2; confirm before go-live).
- **File storage and CDN caches** (CDNs cache worldwide: don't serve personal files through a public CDN).
- **Edge or serverless functions** (may run in the nearest region worldwide: keep personal data processing in the regional backend, or pin the function's region).
- **Logs, error tracking and session replay** (e.g. choose EU-hosted options; scrub personal data anyway).
- **Product analytics** (EU-hosted option; no special category data in events).
- **Email, SMS and push providers** (often US-based: need a mechanism; keep special category data out of message and push payload text, e.g. "You have a new request" rather than naming a group).
- **Church management system and other integrations** (where the other system is hosted).
- **AI APIs** (see [AI-TOOLS.md](AI-TOOLS.md)).
- **Development and CI** (see below).

## Development, CI and people abroad
- Dev, preview and CI environments (e.g. hosted CI runners, preview deployments) often run outside the UK. That's fine only if they hold seed data, never real people's data (see [DEVELOPMENT-AND-OPERATIONS.md](DEVELOPMENT-AND-OPERATIONS.md)).
- Staging that ever holds real data follows production's region rules.
- Staff of the same organisation working abroad aren't a restricted transfer in themselves, but the access still needs to be secure and necessary. **Contractors, agencies or support providers outside the UK are a transfer**: they need a mechanism and a DPA.
- Never copy production data to laptops or personal cloud storage, wherever you are.

## Record it
- Keep a data map listing each store or service, what personal data it holds, its region, the transfer mechanism (if any) and the date checked. It feeds the DPIA (see [DPIA.md](DPIA.md)) and the privacy notice.
- Recheck when a vendor changes its subprocessors or regions.

## Checks
- [ ] Region confirmed and recorded for every store and service, including backups, logs, CDN, edge functions and CI
- [ ] Special category data stays in the UK or EEA
- [ ] Each transfer has a valid mechanism (adequacy, UK Extension certification, or IDTA/Addendum plus TRA)
- [ ] No exceptions used for routine transfers
- [ ] Message and push payloads free of special category data
- [ ] Privacy notice and subprocessor list name the countries
