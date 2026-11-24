# Security, privacy and safeguarding

> **Summary.** VineMe holds personal and safeguarding-sensitive data, and church or group membership reveals religious belief, which is **special category data** under UK GDPR. Security is a priority now, not later (agreed at the 21 Nov 2026 kickoff). This folder records what the system does today and the checks still to do. These are engineering checks, not legal advice.

Last verified against code: 2026-11-22

| Page | Covers |
| --- | --- |
| [data-protection.md](./data-protection.md) | UK GDPR: data map, lawful basis, consent, retention, deletion, suppliers |
| [safeguarding.md](./safeguarding.md) | Who can see whom, vetting, vulnerable people, under-18s, access logs |
| [access-and-secrets.md](./access-and-secrets.md) | GitHub access, branch protection, secrets, environments, who runs migrations |

Agents building anything that touches personal data should also use the `church-data-protection` skill (`.agents/skills/church-data-protection/SKILL.md`). It holds the general UK rules; this folder records VineMe's own state and decisions, which take precedence.

How access is enforced in the system (RLS, `security_invoker` views, Edge Functions) is in [architecture/README.md#trust-boundaries](../architecture/README.md#trust-boundaries) and [ADR-0004](../decisions/0004-rls-and-security-invoker-views.md). This folder doesn't repeat it.

## Ownership

| Area | Owner |
| --- | --- |
| Security audit | Dan |
| Repo access | Jacob, Olly |
| Privacy / GDPR | _TODO: not decided yet_ |
| Safeguarding | _TODO: not decided yet_ |

The audit starts from Aonghas's hackathon security audit. _TODO: find it and link it here (it isn't in the repo)._

## This repo is public

`VineMe-App/vineme2.0` is a public GitHub repository. Whether it should stay public is still undecided ([access-and-secrets.md](./access-and-secrets.md#repository)). Until then:

- Don't write real people's data, project refs, URLs of private dashboards or secrets into docs.
- Record a security gap here as a check to do, without exploit detail. Report anything exploitable privately to the security owner instead.
- The docs site (`npm run docs:dev`) is for local use only. Don't deploy it.

## Advice to get

A solicitor's view on lawful basis and special category data is worth paying for. Also ask the IT and safeguarding leads at the large churches we work with for their own checklists, since they'll ask these questions as adoption grows.
