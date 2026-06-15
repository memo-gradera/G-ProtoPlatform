# GRADERA Innovation Hub — Database Schema

PostgreSQL schema for the production API (`apps/api`). Managed with **Prisma** and targeting **Azure Database for PostgreSQL**.

The React frontend (`apps/web`) still uses BASE44/local services. This schema is the foundation for migrating data access to the API.

## Entity overview

| Table | Purpose |
|-------|---------|
| `users` | Platform users (Entra ID identity + profile) |
| `roles` | App-managed role catalog |
| `user_roles` | Many-to-many user ↔ role assignments |
| `ideas` | Innovation pipeline ideas |
| `idea_status_history` | Audit trail of idea status transitions |
| `prototypes` | Prototype catalog entries |
| `prototype_tags` | Tag vocabulary for prototypes |
| `prototype_tag_map` | Prototype ↔ tag associations |
| `prototype_reviews` | Executive review decisions |
| `rejection_reasons` | Catalog of rejection reason codes |
| `attachments` | File metadata (blob storage URLs) |
| `audit_events` | Cross-entity audit log |

## Enums

| Enum | Values |
|------|--------|
| `AppRoleName` | `admin`, `innovation_lead`, `developer`, `executive_reviewer`, `viewer` |
| `UserStatus` | `active`, `inactive`, `pending`, `suspended` |
| `IdeaStatus` | `ideas`, `in_progress`, `ready_for_demo`, `approved`, `blocked`, `rejected` |
| `IdeaPriority` | `low`, `medium`, `high`, `urgent` |
| `PrototypeStatus` | `draft`, `attached`, `published`, `archived` |
| `ReviewDecision` | `pending`, `approved`, `rejected` |

Enum values align with `@proto-platform/contracts` and the frontend workflow in `apps/web/src/domain`.

## Relationships

```mermaid
erDiagram
  users ||--o{ user_roles : has
  roles ||--o{ user_roles : assigned
  users ||--o{ ideas : owns
  ideas ||--o{ idea_status_history : tracks
  users ||--o{ idea_status_history : changes
  users ||--o{ prototypes : owns
  ideas ||--o{ prototypes : relates
  prototypes ||--o{ prototype_tag_map : tagged
  prototype_tags ||--o{ prototype_tag_map : used
  prototypes ||--o{ prototype_reviews : reviewed
  ideas ||--o{ prototype_reviews : subject
  users ||--o{ prototype_reviews : reviews
  rejection_reasons ||--o{ prototype_reviews : reason
  users ||--o{ attachments : uploads
  users ||--o{ audit_events : acts
```

## Prisma files

| Path | Description |
|------|-------------|
| `apps/api/prisma/schema.prisma` | Source of truth |
| `apps/api/prisma/migrations/` | Versioned SQL migrations |
| `apps/api/prisma/seed.ts` | Default roles, rejection reasons, local admin |
| `apps/api/src/db/client.ts` | Typed Prisma client singleton |
| `apps/api/src/db/constants.ts` | Enum re-exports |
| `apps/api/src/repositories/` | Data access placeholders |

## Prerequisites

- PostgreSQL 14+ (local Docker or Azure)
- `DATABASE_URL` in `apps/api/.env`

Example local connection:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/gradera_innovation_hub?schema=public
```

## Migration commands

From the monorepo root:

```bash
# Generate Prisma client after schema changes
pnpm --filter gradera-api db:generate

# Apply pending migrations (development)
pnpm --filter gradera-api db:migrate

# Deploy migrations (CI / production)
pnpm --filter gradera-api exec prisma migrate deploy
```

Create a new migration after editing `schema.prisma`:

```bash
cd apps/api
pnpm exec prisma migrate dev --name describe_your_change
```

## Seed commands

```bash
pnpm --filter gradera-api db:seed
```

Seeds:

- 5 default roles (`admin` … `viewer`)
- 5 default rejection reasons
- Local admin user: `admin@gradera.local` with `admin` role

## Prisma Studio

```bash
pnpm --filter gradera-api db:studio
```

## Azure notes (future)

- Use Azure Database for PostgreSQL flexible server
- Store `DATABASE_URL` in App Service configuration / Key Vault
- Enable SSL: append `?sslmode=require` to connection string
- Run `prisma migrate deploy` in release pipeline before app startup

## Delete behavior

- Ideas and prototypes use **hard delete** (no `deleted_at` column).
- API writes audit events (`idea.delete`, `prototype.delete`) before removing rows.
- Idea delete is rejected when linked prototypes exist (`related_idea_id`).
- Prototype delete does not modify the related idea; dependent reviews/tag maps cascade.

## What is not implemented yet

- Frontend wired to API repositories
- Entra ID user provisioning on first login
- Blob storage upload for attachments
- Row-level security policies in PostgreSQL
