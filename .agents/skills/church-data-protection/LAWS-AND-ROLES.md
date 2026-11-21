# Laws, special category data and roles

#### When to use this file

Read this when you need to know which law applies to a feature, why church data needs more care than ordinary contact data, or who is responsible for what between the church and the software provider.

## Laws that apply
- **UK GDPR**: principles, lawful bases, rights, accountability. Any data about living people, digital or paper.
- **Data Protection Act 2018**: UK additions, special category conditions, safeguarding, age of consent.
- **PECR**: marketing emails and texts, notifications used for promotion, cookies.
- **Data (Use and Access) Act 2025**: amends the above (complaints, some lawful-processing and automated decision rules).
- **Online Safety Act 2023**: if users can message or post to each other.

## Why church data is different
- **Church or group membership reveals religious belief**, which is special category data. Treat memberships, join requests, attendance, prayer requests and pastoral notes as special category.
- Churches usually rely on the **not-for-profit religious body condition**. It needs appropriate safeguards, covers solely members, former members and people in regular contact, and does not allow disclosure outside the church without consent. It does not cover new contacts, people only invited, or the provider's own use.
- **Safeguarding, vulnerability and health notes** are the most sensitive data: restrict to named roles, never reachable with public or client keys, never sent to analytics or third parties.
- **Multi-church / multi-tenant**: each church sees only its own people. A person linked to several churches must not have one church's data shown to another.

## Roles
- The **church is the controller** for its people's data. The software provider is usually a **processor** and needs a written controller-processor agreement (UK GDPR Article 28).
- As processor, the provider acts only on the church's instructions, helps with DPIAs, rights requests and breaches, and lists its subprocessors.
- The provider is **controller** only for its own website, marketing, account and support data. If the provider uses church data for its own purposes (product analytics across churches, AI training, benchmarking), it may become a controller for that use and needs its own basis. Avoid this by default.

## Checks
- [ ] The lawful basis and, for special category data, the condition are recorded for each purpose
- [ ] The feature stays within what the church has instructed as controller
- [ ] No provider-side reuse of church data without a documented decision
