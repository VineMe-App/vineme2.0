# Who sees what (safeguarding by design)

#### When to use this file

Read this when a feature shows personal data to anyone other than the person themselves: members, group leaders, staff, other churches, the public, or reporting tools.

## Members and leaders
- Members choose which contact details others can see; default to least visible. Leaders see only what they need, not full profiles.
- A requester's contact details go only to the leader who needs them, only when needed. Never to other members.
- Support optional central vetting so a church can check requests before leaders see them, without leaking details early.
- Open group types (teams, hobbies) may skip vetting, but anything involving under-18s or vulnerable adults follows safeguarding rules.

## Staff
- Scope staff views by role (e.g. a service or campus pastor sees their area, not the whole church). Enforce in the backend, not just the UI.
- Log who viewed or changed personal and safeguarding records.
- Let churches switch off reports they don't need, so staff can't report outside their stated purposes.
- Leaders and volunteers are data subjects too: reports about their groups should support them, not rank or appraise them.

## Multi-church
- Every query, view, function and cache is scoped to the church. A person linked to several churches must not have one church's data shown to another.

## Reporting and BI tools
- They often connect with users that bypass app-level access rules: limit who can reach them and keep sensitive fields out.

## Public surfaces
- Website embeds and group finders show group name, area, day, leader first name at most. No member lists, home addresses or requester details.
- Images in public storage are public: don't store photos of people there without consent (see [CHILDREN-AND-AGE.md](CHILDREN-AND-AGE.md) for children).

## Checks
- [ ] Access enforced in the database or backend, tested per role and per church
- [ ] Defaults are least visible
- [ ] Contact details released only to the right person at the right time
- [ ] Sensitive views and changes are logged
- [ ] Public surfaces show only the minimum
