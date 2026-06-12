# ADR 0001: pnpm Monorepo Structure

## Status

Accepted

## Context

GRADERA Innovation Hub needs a clear separation between UI, shared types, domain logic, and Supabase infrastructure while staying deployable to Vercel.

## Decision

Use a **pnpm workspace** with **Turborepo** for task orchestration:

- `apps/web` — single deployable frontend
- `packages/contracts` — shared types (no runtime deps)
- `packages/domain` — business rules only
- `packages/supabase-client` — thin Supabase wrapper

Workspace packages are consumed as TypeScript source via `exports: "./src/index.ts"` and bundled by Vite (no package build step in MVP).

## Consequences

- Fast scaffold iteration; add `tsup` or project references when publishing packages externally
- Vite `server.fs.allow` must include monorepo root for workspace resolution
- Domain logic stays testable without React or Supabase imports
