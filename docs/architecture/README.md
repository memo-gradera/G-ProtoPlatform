# GRADERA Innovation Hub — Architecture

Innovation Hub for Rapid Prototype Development (RPD) initiatives.

## Monorepo layout

| Path | Purpose |
|------|---------|
| `apps/web` | React + Vite UI (GRADERA Innovation Hub) |
| `packages/contracts` | Shared TypeScript types |
| `packages/domain` | Pure domain rules (stage transitions) |
| `packages/supabase-client` | Supabase client factory |
| `supabase/migrations` | PostgreSQL schema |

## MVP modules (scaffolded)

1. Auth shell — `/sign-in`, Supabase client stub
2. Kanban — `/kanban`
3. Idea detail — `/ideas/:ideaId`
4. Prototype catalog — `/catalog`
5. Executive review — `/executive-review`
6. Dashboard — `/dashboard`
7. Admin settings — `/admin`

## Workflow states

`ideas` → `in_progress` → `ready_for_demo` → `approved`

Alternate: `blocked`, `rejected`

Stage transition rules live in `packages/domain/src/idea/stage-transition.policy.ts`.

## Next implementation steps

1. RLS policies (ideas, profiles, history)
2. Auth session provider in `apps/web`
3. Kanban data fetching + realtime
4. Generate `database.types.ts` from Supabase CLI
