# GRADERA Innovation Hub — API

Production backend scaffold for Azure App Service (Node.js + Express + TypeScript).

The React frontend in `apps/web` still uses BASE44/local services and is not yet wired to this API. PostgreSQL, Prisma, RBAC, and **Microsoft Entra ID JWT validation** are implemented here; MSAL on the frontend and Azure deployment are next phases.

## Architecture (target)

| Layer | Azure service |
|-------|----------------|
| Frontend | Azure Static Web Apps |
| API | Azure App Service (this package) |
| Database | Azure PostgreSQL |
| Auth | Microsoft Entra ID / MSAL JWT |

## Prerequisites

- Node.js 20+
- pnpm 9+

## Local development

From the monorepo root:

```bash
pnpm install
cp apps/api/.env.example apps/api/.env
pnpm --filter gradera-api dev
```

Or from this directory:

```bash
cp .env.example .env
pnpm dev
```

## Scripts

| Script | Description |
|--------|-------------|
| `pnpm dev` | Start API with hot reload (`tsx watch`) |
| `pnpm build` | Compile TypeScript to `dist/` |
| `pnpm start` | Run compiled output |
| `pnpm test` | Vitest smoke tests |
| `pnpm typecheck` | TypeScript check |
| `pnpm lint` | ESLint (when configured) |
| `pnpm db:generate` | Generate Prisma client |
| `pnpm db:migrate` | Apply migrations (development) |
| `pnpm db:seed` | Seed roles, rejection reasons, local admin |
| `pnpm db:studio` | Open Prisma Studio |

## Database (PostgreSQL + Prisma)

Schema and migrations live in `prisma/`. See [`docs/database/schema.md`](../../docs/database/schema.md) for entity overview and relationships.

```bash
cp apps/api/.env.example apps/api/.env
# Start PostgreSQL, then:
pnpm --filter gradera-api db:migrate
pnpm --filter gradera-api db:seed
```

Data access: `src/db/client.ts`, `src/repositories/`, `src/services/`.

## Endpoints

| Method | Path | Auth / RBAC | Description |
|--------|------|-------------|-------------|
| `GET` | `/health` | Public | Liveness probe |
| `GET` | `/api/users/me` | Authenticated | Current user profile |
| `GET` | `/api/users` | Admin, Innovation Lead | List users |
| `PATCH` | `/api/users/:id/role` | Admin | Update app-managed role |
| `GET` | `/api/ideas` | Dashboard view | List ideas |
| `GET` | `/api/ideas/:id` | Dashboard view | Get idea |
| `POST` | `/api/ideas` | Idea create | Create idea (+ history + audit) |
| `PATCH` | `/api/ideas/:id` | Idea edit | Update fields (**not** status) |
| `POST` | `/api/ideas/:id/transition` | Idea transition | Workflow-validated status change |
| `DELETE` | `/api/ideas/:id` | Idea delete | Hard delete (no soft-delete column) |
| `GET` | `/api/ideas/:id/status-history` | Dashboard view | Status history (newest first) |
| `GET` | `/api/prototypes` | Dashboard view | List prototypes |
| `GET` | `/api/prototypes/:id` | Dashboard view | Get prototype |
| `POST` | `/api/prototypes` | Prototype create | Create prototype |
| `PATCH` | `/api/prototypes/:id` | Prototype edit | Update prototype |
| `POST` | `/api/prototypes/:id/publish` | Prototype publish | Publish prototype |
| `POST` | `/api/prototypes/:id/archive` | Prototype archive | Archive prototype |
| `GET` | `/api/reviews` | Review view | List reviews (`?idea_id=`) |
| `POST` | `/api/reviews` | Review approve/reject | Create review (+ idea transition) |
| `GET` | `/api/dashboard/kpis` | Dashboard view | Pipeline KPIs |
| `GET` | `/api/files` | Placeholder | Files (not implemented) |
| `GET` | `/api/auth` | Placeholder | Auth (MSAL pending) |

**Health URL (default):** [http://localhost:3001/health](http://localhost:3001/health)

### Local test flow

```bash
cp apps/api/.env.example apps/api/.env
pnpm --filter gradera-api db:migrate
pnpm --filter gradera-api db:seed
pnpm --filter gradera-api dev

# Another terminal:
curl http://localhost:3001/health
curl http://localhost:3001/api/users/me
curl http://localhost:3001/api/ideas
curl http://localhost:3001/api/dashboard/kpis
pnpm --filter gradera-api test
```

## Authentication

Microsoft Entra ID access tokens are validated on every protected request (except when the dev bypass applies).

| Environment | Behavior |
|-------------|----------|
| **Production** | Always requires `Authorization: Bearer <JWT>`. `DEV_AUTH_BYPASS` is ignored. |
| **Development / test** | `DEV_AUTH_BYPASS=true` (default): no header → seeded `admin@gradera.local`. |
| **Development / test** | `DEV_AUTH_BYPASS=false`: requires valid Bearer token. |

JWT validation uses [`jose`](https://github.com/panva/jose) against Microsoft JWKS. The API checks issuer, audience, signature, tenant (`tid`), and expiry. Identity is mapped to PostgreSQL users by `entra_object_id` or email; app roles come from `user_roles` — **not** Azure AD groups.

See [`docs/security/authentication.md`](../../docs/security/authentication.md) for Entra app registration, provisioning, and MSAL integration notes.

```bash
# Dev bypass (default)
DEV_AUTH_BYPASS=true pnpm --filter gradera-api dev
curl http://localhost:3001/api/users/me

# JWT path
DEV_AUTH_BYPASS=false \
  AZURE_TENANT_ID=<tenant> \
  JWT_AUDIENCE=api://<api-client-id> \
  curl -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/users/me
```

## Environment variables

See [`.env.example`](./.env.example):

- `PORT` — HTTP port (default `3001`)
- `NODE_ENV` — `development` | `test` | `production`
- `CORS_ORIGIN` — Allowed frontend origin(s), comma-separated
- `DATABASE_URL` — PostgreSQL connection string
- `AZURE_TENANT_ID` — Entra directory (tenant) ID
- `AZURE_CLIENT_ID` — API app registration client ID (reference)
- `JWT_AUDIENCE` — Expected JWT `aud` claim (Application ID URI or client ID)
- `DEV_AUTH_BYPASS` — Local dev bypass (non-production only; default `true`)
- `AUTO_PROVISION_DEV_USERS` — Auto-create viewer for unknown Entra users in dev (default `false`)

## Shared domain

RBAC permissions and idea stage transition rules are imported from `@proto-platform/domain` (shared with the monorepo). The frontend `apps/web/src/domain` modules remain unchanged for now.

## Middleware

- `src/middleware/auth.ts` — Entra ID JWT validation + optional dev bypass
- `src/auth/entraJwt.ts` — JWKS signature verification and claim extraction
- `src/auth/userProvisioning.ts` — Map Entra identity to PostgreSQL user
- `src/middleware/logging.ts` — Request ID + structured console logging
- `src/middleware/rbac.ts` — Permission enforcement helper
- `src/middleware/errorHandler.ts` — Normalized API errors

## Azure App Service

Target host for this package. CI/CD scaffolding lives in [`.github/workflows/deploy-dev.yml`](../../.github/workflows/deploy-dev.yml); see [`docs/azure/github-actions.md`](../../docs/azure/github-actions.md) for OIDC setup and secrets.

### Startup command

Linux App Service (Node 20+ / 22):

```bash
node dist/index.js
```

Equivalent: `npm start` when the deployment root contains `package.json` with the `"start"` script.

Set **Configuration → General settings → Startup Command** in the Portal, or `site_config.application_stack` / app command in Terraform.

### Required application settings

Production template: [`.env.production.example`](./.env.production.example). Minimum settings:

| Setting | Notes |
|---------|-------|
| `NODE_ENV` | `production` |
| `PORT` | `8080` (App Service default for Node on Linux) |
| `CORS_ORIGIN` | Azure Static Web App origin (comma-separated if multiple) |
| `DATABASE_URL` | Azure PostgreSQL with `sslmode=require` |
| `AZURE_TENANT_ID` | Entra directory ID |
| `AZURE_CLIENT_ID` | API app registration client ID |
| `JWT_AUDIENCE` | Must match access token `aud` claim |
| `DEV_AUTH_BYPASS` | `false` |
| `AUTO_PROVISION_DEV_USERS` | `false` |

Optional: `APPLICATIONINSIGHTS_CONNECTION_STRING` from Terraform output.

### Health check

Configure App Service health check path:

```
/health
```

Liveness endpoint is public (no auth). Default local URL: [http://localhost:3001/health](http://localhost:3001/health).

### Prisma migrations

| Environment | Command |
|-------------|---------|
| Local | `pnpm --filter gradera-api db:migrate` (`prisma migrate dev`) |
| Dev / staging / prod | `pnpm --filter gradera-api exec prisma migrate deploy` |

Run `migrate deploy` in the release pipeline (GitHub Actions **Deploy Dev** with `run_migrations: true`) or as an approved manual step — **not** on every app restart in production.

The deploy workflow packages the API with `pnpm --filter gradera-api deploy --prod --legacy` so workspace dependencies (`@proto-platform/domain`, etc.) are included in the App Service artifact.

## What is not implemented yet

- Attachment upload routes
- Soft delete for ideas (schema has no `deleted_at`)
- Automatic deploy on merge to `main` (deploy workflow is manual `workflow_dispatch` only)
