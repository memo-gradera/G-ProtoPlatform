# Innovation Hub — Pilot Limitations

This document sets expectations for the **internal GRADERA Innovation Hub pilot**. It is not a production readiness checklist.

## Security and access control

- **RBAC is enforced client-side** during the pilot. The UI and service layer block unauthorized actions, but remote entity APIs are not wrapped in server-side policy yet.
- Treat pilot data as **non-production**. Do not use real PHI or confidential customer information in ideas, URLs, or notes.

## Platform and backend

- **The configured remote backend** remains in use for auth, entities, file upload, and hosting.
- Data lives in the hosted app environment tied to `VITE_BASE44_APP_ID` — not in a self-managed database you control directly.
- **Supabase migration is a future phase.** Schema and RPC work in `supabase/migrations/` is preparatory and is **not** connected to this app at runtime.

## Audience and scope

- **Not intended for external users** — internal innovation, engineering, product, and executive stakeholders only.
- No SLA, backup guarantees, or formal support process for the pilot environment.

## Product gaps

- **No notification system** — users are not emailed or pinged on status changes, reviews, or assignments.
- **No server-side workflow engine** — transition rules run in the browser and service adapters; direct API calls could bypass them until backend enforcement exists.
- **Owner matching for developers** is string-based (email / display name) and may be fragile if idea ownership text is inconsistent.
- **Status history reads** fetch and filter client-side — acceptable for pilot volume, not optimized for large tenants.

## Demo / seed data

- Sample ideas (**SecuPHI**, **TestPHI**, **ProductPHI**, **CodePHI**) are created via `pnpm seed:pilot` and are idempotent by solution name.
- Seeded history covers a subset of ideas; new transitions after seeding append normally.

## What the pilot is meant to prove

- End-to-end innovation workflow: idea → prototype → executive review → catalog / archive.
- Role-appropriate UX for leads, developers, reviewers, and viewers.
- Audit visibility via status history and validated transitions.

## What the pilot is not meant to prove

- Enterprise security certification, multi-tenant isolation, or compliance attestation.
- Integration with HR identity, ITSM, or corporate SSO beyond the current auth provider.
- Production scalability, disaster recovery, or long-term data retention policy.

For demo steps, see `DEMO_SCRIPT.md`. For local setup, see **Running the Innovation Hub Pilot** in `README.md`.
