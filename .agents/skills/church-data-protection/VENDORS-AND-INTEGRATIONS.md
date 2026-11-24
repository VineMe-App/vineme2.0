# Vendors and integrations

#### When to use this file

Read this when adding any tool, vendor or subprocessor, syncing with a church management system, or building an export.

## Where data is stored
Regions, transfer mechanisms and every place data lives are in [DATA-LOCATION-AND-TRANSFERS.md](DATA-LOCATION-AND-TRANSFERS.md). Check it for every new vendor.

The project should keep a vendor record in its docs (e.g. `docs/security/`): vendor, the personal data it gets, region, transfer route, DPA link and date checked. Read it before flagging a vendor, and update it when you add or change one.

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
- [ ] Region and transfer mechanism checked (see [DATA-LOCATION-AND-TRANSFERS.md](DATA-LOCATION-AND-TRANSFERS.md))
- [ ] DPA and subprocessors recorded
- [ ] Subprocessor list and privacy notice updated
- [ ] Sync sends and receives only the agreed fields
- [ ] Exports restricted and logged
