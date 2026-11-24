# Admin security: sign-in, two-factor and encryption

#### When to use this file

Read this when building or reviewing sign-in, roles or sessions for staff and leaders, admin dashboards, account recovery, file storage, backups, the mobile app's local storage, or anything about how data is sent or stored.

## Two-factor sign-in for staff and leaders
- Anyone who can see other people's data (church staff, leaders, admins, the provider's support staff) must use two-factor sign-in. Prefer authenticator apps or passkeys over SMS codes.
- Enforce it in the backend (e.g. require the stronger assurance level in access rules for admin data), not only at the login screen.
- Account recovery must not be weaker than two-factor: no password-only reset into an admin account.
- Require it on the infrastructure too: database console, hosting, code host, email/SMS provider, church management system connection.

## Sessions and roles
- Sensible session lengths for admin areas; sign out on role removal.
- Ask for sign-in again before high-risk actions (exports, viewing safeguarding records, changing roles).
- Remove access promptly when a leader steps down or a staff member leaves; review admin roles regularly.
- Least privilege: no shared admin accounts; service or admin keys stay server-side.

## Encryption in transit
- HTTPS (TLS 1.2 or later) everywhere: web, app APIs, webhooks, integrations. HSTS on web domains. No plain HTTP fallbacks.
- Links in emails use HTTPS and short-lived, single-use tokens. No personal data in URLs.

## Encryption at rest
- Database, file storage and backups encrypted at rest. Hosted providers usually do this by default: confirm and record it.
- Backups sit in the same UK/EEA region and follow retention rules.
- Consider extra field-level encryption for the most sensitive notes (safeguarding, pastoral), with keys kept apart from the data.
- Files with personal data (photos of people, exports) go in private storage with short-lived signed links, not public buckets.

## Devices
- Mobile apps keep tokens in the platform's secure storage (Keychain, Keystore), not plain local storage, and don't cache sensitive data unencrypted.
- Exports downloaded to staff devices are the church's responsibility: warn, minimise, and log them.

## Checks
- [ ] Two-factor required and enforced in the backend for every role that sees others' data
- [ ] Recovery and infrastructure accounts protected to the same level
- [ ] Re-sign-in for high-risk actions; access removed when roles end
- [ ] HTTPS only; no personal data in URLs
- [ ] Encryption at rest confirmed for database, storage and backups
- [ ] Private storage for files of people; tokens in secure device storage
