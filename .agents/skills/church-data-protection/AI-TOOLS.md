# AI tools and features

#### When to use this file

Read this when building any feature that sends church data to an AI or LLM service (summaries, suggestions, matching people to groups, drafting messages, search, chat), when choosing an AI vendor, or when the team uses AI tools (chat assistants, coding agents) near real data.

## Default: keep sensitive data out
- **Pastoral notes, prayer requests, safeguarding records, vulnerability and health information stay out of AI features unless the church has explicitly agreed**, for that feature and purpose, and the DPIA covers it.
- Group membership and attendance are special category data too: send only what the feature needs, and prefer IDs, counts or pseudonymised text over names and free text.
- Make AI features opt-in per church, off by default, with a setting a church admin can switch off at any time.
- Don't let a model infer special category data people haven't given you (e.g. guessing vulnerability, health, sexuality or belief strength from notes or behaviour).

## Decisions about people
- A person stays in the loop for anything that affects someone: placing them in a group, prioritising or declining a request, flagging a concern. AI can suggest; a named role decides.
- Solely automated decisions with legal or similarly significant effects are restricted (UK GDPR Article 22, as amended by the Data (Use and Access) Act 2025), and the restrictions stay strict for special category data. Avoid them.
- No profiling of children by default (see [CHILDREN-AND-AGE.md](CHILDREN-AND-AGE.md)).

## Choosing an AI vendor
Apply every check in [VENDORS-AND-INTEGRATIONS.md](VENDORS-AND-INTEGRATIONS.md), plus:
- the vendor does **not train** on your data, in the contract and the account settings;
- prompt and output **retention** is zero or short and stated;
- UK/EEA processing is available, or a valid transfer mechanism is in place;
- it is on the subprocessor list and in the privacy notice before launch.

## Building the feature
- Tell people in the privacy notice and the UI when AI is used and what it sees. Label AI-generated text.
- Prompts, outputs and AI logs are personal data: same access rules, retention and erasure as the source data.
- Enforce access before data reaches the model: a leader's AI summary must only use data that leader can already see.
- Update the DPIA; new technology on special category data is a DPIA trigger (see [DPIA.md](DPIA.md)).

## The team's own AI tools
- Never paste real people's data into AI chat tools or give coding agents production data or credentials. Use seed data (see [DEVELOPMENT-AND-OPERATIONS.md](DEVELOPMENT-AND-OPERATIONS.md)).

## Checks
- [ ] No pastoral, safeguarding, vulnerability or health data sent unless the church agreed and the DPIA covers it
- [ ] Feature is opt-in per church and can be switched off
- [ ] A person makes every decision that affects someone
- [ ] Vendor: no training, short retention, UK/EEA or valid transfer, DPA signed, listed as subprocessor
- [ ] Users told; AI output labelled; prompts and logs covered by retention and erasure
