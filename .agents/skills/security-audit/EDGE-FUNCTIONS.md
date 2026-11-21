# Edge Functions (`supabase/functions/`)

Edge Functions are public HTTPS endpoints. Many use a service-role client, so their own checks are the only control.

- [ ] Every function is registered in `supabase/config.toml`. For `verify_jwt = true`, the gateway only checks the JWT is valid; the function still has to check who the user is and what they may do.
- [ ] For each `verify_jwt = false` function: the comment in `config.toml` says how it authenticates, and the code really does that (shared secret compared in constant time, webhook signature check, cron secret). A function that "only cron calls" is still reachable by anyone.
- [ ] The function gets the user from the verified token (`auth.getUser(jwt)`), not from a user id, church id or role in the request body.
- [ ] Role and church checks happen before any service-role read or write, and cover every id in the request (a group id, person id or church id must belong to the caller's church).
- [ ] Dev-only, test or impersonation functions can't run in production (env check that fails closed, not deployed, or restricted to named admins), and are covered by the same review as everything else.
- [ ] Functions that create users, delete users, change flags (e.g. vulnerable, verified, role) or export data are admin-only and logged.
- [ ] Exports (CSV etc.) only include the caller's church and fields their role may see.
- [ ] Inputs are validated (types, lengths, ids). Values passed to external APIs, URLs or SQL are not built by string concatenation.
- [ ] Outbound requests to user-supplied URLs are not possible, or are restricted to known hosts.
- [ ] CORS: `Access-Control-Allow-Origin: *` is fine for bearer-token APIs but check no cookie-based auth relies on it.
- [ ] Code in `_shared/` used by several functions is reviewed once, then each caller checked for how it uses it.
- [ ] Error responses don't leak secrets or other churches' data.

Test locally with `supabase functions serve` against the local stack, calling as seed users from different churches and roles, and with no token.
