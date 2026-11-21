# Development and operations

#### When to use this file

Read this when setting up environments, seed data, secrets, migrations, logging or monitoring, choosing where an environment or tool keeps data, or when you find a security problem.

## Environments and data
- Separate dev and production environments; dev uses fake seed data only.
- Contributors never see real people; never copy production data locally, into tests or into AI tools.

## Where each environment and tool keeps data
The legal rules on location and transfers are in [VENDORS-AND-INTEGRATIONS.md](VENDORS-AND-INTEGRATIONS.md). In operations, apply them to everything that holds or sees real people's data, not just the main database:
- **Database, storage and backups:** the production project, file storage, point-in-time recovery and backups all sit in the UK/EEA region (e.g. Supabase London eu-west-2). The region is usually fixed when the project is created, so check it before creating one; moving later means migrating.
- **Staging and preview environments:** if one ever holds real data, it follows the production rules, including region. Better: keep it on seed data.
- **Serverless and edge functions:** these may run in the nearest region worldwide. Keep personal data processing in the regional backend, or pin the function region where the platform allows.
- **Logs, error tracking and analytics:** pick the EU/UK region at sign-up (e.g. Sentry and PostHog both offer EU data regions), and still keep personal data out (see below).
- **Build and CI services:** GitHub Actions runners, EAS/Expo builds and similar services are usually outside the UK/EEA. They only ever see code and seed data, never production data or production keys that could read it.
- **Push notifications and email/SMS:** Apple, Google and Expo push services, and many email/SMS providers, process data outside the UK/EEA. Keep payloads to a generic prompt ("You have a new message") with no names, group names or content, and check the vendor's region and transfer mechanism.
- **Remote access:** staff of the same organisation using data while travelling abroad isn't a restricted transfer, but it is a security risk; use managed devices and least privilege. A contractor, agency or support provider outside the UK/EEA who can see production data is a restricted transfer: it needs a mechanism and a DPA.
- **Keep a data map:** for each store and tool, record what it holds, its region, its subprocessors and the transfer mechanism. Review it when you add a tool or change a region.

## Secrets and changes
- No secrets in git history (rotate any that were committed).
- Share secrets via a secrets manager, not chat.
- Named owners run production migrations.
- Turn on secret scanning and dependency alerts.

## Logging and monitoring
- No personal data in logs, URLs, analytics events or error reports. Scrub request bodies and free text.

## Security issues
- Keep security findings out of public issues and PRs; raise privately.

## Checks
- [ ] Only seed data outside production
- [ ] Production database, storage, backups, logs, error tracking and analytics in a UK/EEA region (or a recorded transfer mechanism)
- [ ] CI, build and push services never see production personal data
- [ ] Data map updated for any new store, tool or region
- [ ] No secrets committed
- [ ] Logs and error tracking free of personal data
- [ ] Security issues reported privately
