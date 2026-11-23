# ADR-0003: Phone-first authentication with SMS OTP

- **Status:** Accepted (backfilled)
- **Date:** 2026-11-21
- **Scope:** mobile, db

## Context

_Backfilled: this context is reconstructed from the code and commit history. Add the original reasoning if you know it._

Many members join through a church notice or a friend's referral, on their phone, and passwords are a barrier. Historical notes are in `docs/archive/2025-final-phone-first-summary.md` and `docs/archive/2025-magic-link-update-summary.md`.

## Decision

Mobile users sign up and sign in with a phone number and SMS one-time code (Supabase Auth with Twilio). Email is verified as a secondary channel. Local development uses fixed test OTPs in `supabase/config.toml`, plus the env-gated `dev-impersonate-user` Edge Function.

## Consequences

- **Good:** low-friction onboarding and no password resets for members.
- **Trade-off:** SMS costs and reliance on Twilio delivery. Developers can't sign in as real users without the impersonation function.
- **Rule:** `dev-impersonate-user` must stay disabled outside dev environments.
