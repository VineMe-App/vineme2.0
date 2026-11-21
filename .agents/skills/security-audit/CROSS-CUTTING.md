# Cross-cutting logic

Bugs that no single checklist catches. Ask these of each feature in scope.

- **Wrong check, not missing check:** the code checks "is signed in" or "is a leader" when the rule is "is a leader of this group in this church".
- **Two paths, one effect:** the UI path is protected but a second path to the same result isn't (an RPC, an Edge Function, a direct table write, a bulk import, a sync from a church management system).
- **Trusting stored data:** data written by one path (a sync, an import, a trigger) is trusted by another as if it had been validated.
- **State skipping:** can a join request, referral or invite jump straight to approved? Can a declined or expired one be reused?
- **Races:** check-then-act steps that can run twice at once (double approve, duplicate accounts, limits).
- **Exports and reports as leaks:** a lower-role user triggers an export, report or CSV that includes people or fields beyond their access, or data that should have been deleted.
- **Search and filters as oracles:** search, counts, filters or different errors reveal that a person, group or flag exists when the caller can't see it.
- **Lifecycle:** when someone leaves a group or church, loses a role, or deletes their account, do their access, sessions, cached data and push tokens go too?
- **Defaults:** what happens when config, an env var or a feature flag is missing? It should fail closed.
- **Multi-church people:** a person linked to several churches must not let one church see another's data about them.
