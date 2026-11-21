# Development and operations

#### When to use this file

Read this when setting up environments, seed data, secrets, migrations, logging or monitoring, or when you find a security problem.

## Environments and data
- Separate dev and production environments; dev uses fake seed data only.
- Contributors never see real people; never copy production data locally, into tests or into AI tools.

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
- [ ] Logs and error tracking free of personal data
- [ ] Security issues reported privately
