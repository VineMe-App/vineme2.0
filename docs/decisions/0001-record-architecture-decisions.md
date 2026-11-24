# ADR-0001: Record architecture decisions

- **Status:** Accepted
- **Date:** 2026-11-21
- **Scope:** cross-cutting

## Context

Docs had built up as one-off implementation summaries (`*_SUMMARY.md`, `final-*.md`), and many were out of date. Developers and AI agents had no reliable way to tell why the system is shaped the way it is, or which docs were current.

## Decision

We will record significant technical decisions as ADRs in `docs/decisions/`, using `docs/_templates/adr.md`. ADRs are append-only and are superseded rather than edited. Current-state explanation lives in `docs/architecture/`. Implementation diaries are not kept as docs: that history belongs in PR descriptions.

## Consequences

- **Good:** the reasoning survives staff and agent turnover, and agents can check ADRs before proposing changes that contradict them.
- **Trade-off:** a small amount of overhead on significant PRs.
- **Follow-up:** the rules for keeping docs current are in `docs/maintaining-docs.md`.
