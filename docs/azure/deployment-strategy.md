# GRADERA Innovation Hub — Deployment Strategy

Deployment approach for local development through Azure production. **No CI/CD workflows exist yet** — this document defines the target process.

---

## Deployment tiers

| Tier | Where | Auth | Data | Purpose |
|------|-------|------|------|---------|
| **Local** | Developer machine | Mode A/B/C (see frontend-msal.md) | localStorage / local API / MSAL+API | Feature development |
| **Dev** | Azure (dev RG) | MSAL + Entra | Azure PostgreSQL | Integration, Entra validation |
| **Staging** | Azure (staging RG) | MSAL + Entra | Azure PostgreSQL (isolated) | UAT, release candidate |
| **Production** | Azure (prod RG) | MSAL + Entra | Azure PostgreSQL (isolated) | Gradera users |

---

## Application promotion path

```
feature branch
    │
    ▼
Pull Request (CI: build + test only)
    │
    ▼
merge to main
    │
    ├─▶ deploy-dev        (automatic on merge, optional)
    │
    ├─▶ deploy-staging    (manual approval or release tag)
    │
    └─▶ deploy-prod       (manual approval + change window)
```

### Branch strategy (recommended)

| Branch | Deploys to | Policy |
|--------|------------|--------|
| `feature/*` | Local only | PR required |
| `main` | dev (auto) | Protected branch, required checks |
| `release/*` or tag `v*` | staging → prod | Approvals required |

---

## Build artifacts

| App | Build command | Output | Deploy target |
|-----|---------------|--------|---------------|
| `apps/web` | `pnpm --filter gradera-innovation-hub build` | `apps/web/dist/` | Azure Static Web App |
| `apps/api` | `pnpm --filter gradera-api build` | `apps/api/dist/` + Prisma client | Azure App Service (Linux) |

Monorepo root: `pnpm install` with frozen lockfile in CI.

---

## Database migrations

| Environment | Strategy |
|-------------|----------|
| Local | `pnpm --filter gradera-api db:migrate` |
| dev | CI job or post-deploy step; destructive changes OK with coordination |
| staging | Same migration version as prod candidate; test rollback |
| prod | Manual approval gate; backup before migrate; no `migrate dev` |

---

## Infrastructure changes

```
Terraform change on branch
    │
    ▼
PR: terraform plan (dev) as comment
    │
    ▼
merge → terraform apply (dev)
    │
    ▼
staging apply (approval)
    │
    ▼
prod apply (approval + maintenance window)
```

State backend: Azure Storage account (one per subscription or per env — define before first apply).

---

## Future GitHub Actions stages (documentation only)

Workflows **not implemented** in this phase. Planned jobs:

### `build`

- Trigger: pull request, push to `main`
- Steps:
  - Checkout
  - Setup Node 20 + pnpm
  - `pnpm install --frozen-lockfile`
  - `pnpm --filter @proto-platform/domain build`
  - `pnpm --filter gradera-api build`
  - `pnpm --filter gradera-innovation-hub build`
- Upload artifacts: `api-dist`, `web-dist` (optional cache)

### `test`

- Trigger: pull request, push to `main`
- Steps:
  - Same setup as build
  - `pnpm --filter gradera-api test`
  - `pnpm --filter gradera-innovation-hub test`
  - (Future) lint, typecheck

### `deploy-dev`

- Trigger: push to `main` (optional) or workflow_dispatch
- Environment: GitHub Environment `dev`
- Steps:
  - Download / build artifacts
  - Deploy API → `gradera-api-dev` (OIDC or publish profile)
  - Run Prisma migrations against dev DB
  - Deploy SWA → `gradera-web-dev` with dev `VITE_*` variables
  - Smoke: `GET /health`, `GET /api/ideas` with service token or bypass disabled + test user

### `deploy-staging`

- Trigger: workflow_dispatch or tag `v*-rc*`
- Environment: GitHub Environment `staging` (required reviewers)
- Steps: same as dev with staging names and secrets

### `deploy-prod`

- Trigger: workflow_dispatch or tag `v*` (release)
- Environment: GitHub Environment `prod` (required reviewers + wait timer)
- Steps:
  - deploy-staging parity check (same artifact digest)
  - Deploy API with deployment slot swap (optional)
  - Migrations with backup confirmation
  - Deploy SWA prod
  - Post-deploy smoke tests
  - Application Insights alert validation

---

## Rollback

| Component | Rollback method |
|-----------|-----------------|
| API | App Service deployment slot swap or redeploy previous artifact |
| Frontend | SWA previous deployment (portal or CLI) |
| Database | Point-in-time restore (PostgreSQL Flexible Server) — last resort |
| Infrastructure | Terraform state revert + apply |

---

## Pre-deploy checklist (first dev deployment)

- [ ] Entra app registrations complete ([app-registrations.md](./app-registrations.md))
- [ ] Terraform scaffold reviewed; backend state configured
- [ ] `terraform apply` for dev environment
- [ ] App Service settings populated ([secrets-and-config.md](./secrets-and-config.md))
- [ ] Static Web App linked to GitHub repo (when CI ready)
- [ ] CORS configured on API for SWA URL
- [ ] Admin user seeded in dev PostgreSQL
- [ ] MSAL login tested end-to-end (Mode C against dev URLs)
- [ ] `pnpm check:api` equivalent passes against dev API URL

---

## Related docs

- [architecture.md](./architecture.md)
- [resource-inventory.md](./resource-inventory.md)
- [secrets-and-config.md](./secrets-and-config.md)
- [../../infra/azure/README.md](../../infra/azure/README.md)
