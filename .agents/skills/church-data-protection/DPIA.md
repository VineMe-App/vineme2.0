# Data protection impact assessments (DPIAs)

#### When to use this file

Read this when starting a new product, feature or system that handles church members' data, when a change adds a new purpose, data type, audience, vendor or integration, or when someone asks whether a DPIA is needed. The short answer for church software is usually yes.

## Why church software usually needs a full DPIA
UK GDPR Article 35 requires a DPIA before processing that is likely to be high risk. It names **large-scale processing of special category data** as one case. A church app holding group memberships, attendance or pastoral notes for a large church, or for many churches, is processing religious belief data at scale. That alone triggers a DPIA, whether or not children use the service.

Other common triggers on the ICO's list, any of which adds to the case:
- children or vulnerable people, where their data is used for marketing, profiling or automated decisions, or online services are offered directly to children (separately, the Children's Code expects a DPIA for any service likely used by under-18s);
- data about people collected from someone else (invites, referrals, imports, syncs) where telling them would be impossible or disproportionate ("invisible processing");
- combining or matching data from several sources (e.g. a church management system sync);
- new technology, including AI features (see [AI-TOOLS.md](AI-TOOLS.md));
- location data or tracking.

## Who does what
- The **church, as controller, owns the DPIA** and signs it off, with its data protection lead.
- The **provider, as processor, must help** (Article 28) and is best placed to write the technical parts. A good pattern: maintain a template DPIA for the product that each church adopts and adds its own context to.
- Do it **before** processing starts and during design, not after launch.

## What it must contain (Article 35(7))
1. **Description**: what data, whose, where from, who sees it, where it's stored, how long, which vendors.
2. **Necessity and proportionality**: lawful basis and special category condition, why each field is needed, how minimisation, accuracy, retention and rights are met.
3. **Risks to people**: e.g. outing someone's faith to family or employer, exposing a vulnerable person's details to the wrong leader, cross-church leakage, a breach of pastoral notes, unwanted contact after an invite.
4. **Measures**: the controls that reduce each risk (access rules, defaults, vetting, encryption, two-factor, retention jobs, logs) and the residual risk.
5. **Sign-off**: who approved it, any advice from the data protection lead, and the review date.

If high risk remains after the measures, the controller must consult the ICO before going ahead (Article 36).

## Keep it live
- Treat the DPIA as a project document stored with the other privacy decisions, not a one-off form.
- Review it when a change adds a new purpose, data type, audience, vendor, integration or AI feature, and at least yearly.
- Keep a data map (tables, fields, purposes, retention, who can see them) in the repo docs; it feeds the description section and makes reviews cheap.

## Checks
- [ ] The change has been compared with the current DPIA
- [ ] New data, audiences, vendors or risks are added to it, with measures
- [ ] The data map is updated
- [ ] The church knows the DPIA changed and who signs it off
