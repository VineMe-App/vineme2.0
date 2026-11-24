# Dependencies, CI and builds

- [ ] `npm audit` (run locally, read-only) for each workspace. Only report advisories where the vulnerable code path is actually reachable in VineMe; the rest are update chores.
- [ ] Lockfile is committed and CI installs with `npm ci`. No dependencies from git URLs or unpinned tarballs without a reason.
- [ ] New dependencies are well known and maintained; watch for typosquats and install scripts.
- [ ] GitHub Actions (`.github/workflows/`): `permissions` are minimal; no `pull_request_target` or `workflow_run` that checks out and runs PR code with secrets; third-party actions pinned (ideally to a commit SHA); untrusted values (PR titles, branch names) aren't put directly into `run:` scripts.
- [ ] Secrets in CI are only exposed to jobs that need them, and not to forks.
- [ ] Branch protection and rulesets (`.github/rulesets/`) require review for `dev` and `main`.
- [ ] Vercel and EAS: production env vars and deploy rights are limited to named people. These live outside the repo, so mark them needs validation.
- [ ] Dependabot or similar alerts and secret scanning are on (owner check).
