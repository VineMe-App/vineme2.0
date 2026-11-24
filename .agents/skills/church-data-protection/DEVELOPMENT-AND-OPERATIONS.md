# Development and operations

#### When to use this file

Read this when setting up environments, seed data, secrets, migrations, logging or monitoring, or when you find a security problem.

## Environments and data
- Separate dev and production environments; dev uses fake seed data only.
- Contributors never see real people; never copy production data locally, into tests or into AI tools.

## Where dev and ops tools run
- Dev, preview and CI environments, hosted runners, logging, error tracking and monitoring all have a region. Check it, and record it in the data map: see [DATA-LOCATION-AND-TRANSFERS.md](DATA-LOCATION-AND-TRANSFERS.md).
- Outside the UK/EEA is acceptable only for environments that hold seed data. Anything that can see production data (logs, error reports, backups, staging) follows production's region rules.
- Contractors or agencies abroad who can reach production data are a restricted transfer: they need a mechanism and a DPA.

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
- [ ] No secrets committed
- [ ] Logs and error tracking free of personal data, and their region recorded
- [ ] Dev, preview and CI hold seed data only, wherever they run
- [ ] Security issues reported privately
