# Data location, vendors and integrations

#### When to use this file

Read this when choosing where data is hosted, adding any tool, vendor or subprocessor, syncing with a church management system, or building an export.

## Where data is stored
- Host personal data in the UK or EEA. Database region is often fixed at creation (e.g. Supabase: check Project Settings, prefer London eu-west-2); confirm before go-live.
- Edge or serverless functions may run worldwide, so keep personal data processing in the regional backend where possible.
- Outside UK/EEA needs adequacy, the UK Extension to the EU-US Data Privacy Framework, or an IDTA/UK Addendum plus a transfer risk assessment. Transfer only what's necessary.

## New tools and vendors
Before adding any tool or vendor (email/SMS, analytics, BI, church management systems, hosting/CDN, error tracking, AI APIs, push), check:
- where data is stored and processed, and the EU/UK region options;
- its subprocessors;
- a signed DPA and the transfer mechanism;
- whether special category data would reach it.

Add it to a published subprocessor list and the privacy notice. Never accept a non-UK/EEA region just because it's the default. AI vendors have extra checks in [AI-TOOLS.md](AI-TOOLS.md).

## Church management system integrations
- Sync the minimum (e.g. contacts only). Match or create without overwriting the church's records.
- Don't push special category data (group membership, pastoral notes) to another system unless the church has decided it and the basis covers it.
- Data pulled in (e.g. vulnerability tags) inherits the strictest rules in [ACCESS-AND-VISIBILITY.md](ACCESS-AND-VISIBILITY.md).

## Exports
- Exports (CSV etc.) are special category data: admin-only, logged, and minimal.

## Checks
- [ ] UK/EEA region confirmed for every store and processor
- [ ] DPA, subprocessors and transfer mechanism recorded
- [ ] Subprocessor list and privacy notice updated
- [ ] Sync sends and receives only the agreed fields
- [ ] Exports restricted and logged
