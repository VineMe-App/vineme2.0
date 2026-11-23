# ADR-0004: Enforce access with RLS and security_invoker views

- **Status:** Accepted (backfilled)
- **Date:** 2026-11-21
- **Scope:** db, web, mobile

## Context

_Backfilled: this context is reconstructed from the code and commit history. Add the original reasoning if you know it._

Both apps query Supabase directly from the client with the anon key and the user's JWT. Several churches share one database, and one church must never see another's members. Views run as their owner by default, which bypasses RLS.

## Decision

- Every table holding church or user data has RLS enabled, with policies scoped to the caller.
- Every view is created `WITH (security_invoker = true)` so RLS applies as the caller.
- Operations that need elevated rights are `SECURITY DEFINER` RPCs that check `auth.uid()` themselves, or Edge Functions using the service role.
- Schema, RLS, views and RPCs change only through tracked migrations in `supabase/migrations/`.

## Consequences

- **Good:** clients stay thin, and isolation is enforced in one place.
- **Trade-off:** every new table or view needs policy review. The PR template has a checklist for this.
- **Rule:** reviewers reject views without `security_invoker = true`.
