# GRADERA Innovation Hub — Azure Architecture

This document describes the target Azure architecture for the GRADERA Innovation Hub monorepo (`apps/web` + `apps/api`). It is a **planning reference** — no resources are provisioned by this repository until Terraform is applied deliberately.

## System overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Microsoft Entra ID (Tenant)                          │
│   SPA App Registration          API App Registration (Expose API scope)      │
└─────────────────────────────────────────────────────────────────────────────┘
         │ MSAL login                              │ JWT validation (JWKS)
         ▼                                         ▼
┌──────────────────────┐              ┌──────────────────────────────────────┐
│ Azure Static Web App │   HTTPS      │ Azure App Service (Linux, Node 20)   │
│ apps/web (React)     │─────────────▶│ apps/api (Express + TypeScript)    │
│ Vite build output    │  Bearer JWT  │ Prisma ORM                           │
└──────────────────────┘              └──────────┬─────────────┬─────────────┘
                                                 │             │
                                    PostgreSQL   │             │ Blob (future)
                                                 ▼             ▼
                                    ┌────────────────┐  ┌──────────────────┐
                                    │ Azure Database │  │ Storage Account  │
                                    │ for PostgreSQL │  │ Container:       │
                                    │ Flexible Server│  │ prototype-assets │
                                    └────────────────┘  └──────────────────┘

         ┌─────────────────────────────────────────────────────────────┐
         │ Application Insights  ◀── telemetry ──  App Service / SWA │
         │ Log Analytics Workspace                                     │
         └─────────────────────────────────────────────────────────────┘
```

## Request flow

### Authenticated API call

```
User browser
    │
    ├─1─▶ MSAL (SPA) → Entra ID authorize/token
    │
    ├─2─▶ Access token (aud = api://<api-client-id>, scope access_as_user)
    │
    ├─3─▶ Static Web App serves React SPA
    │
    └─4─▶ HTTPS → App Service /api/*
              Authorization: Bearer <JWT>
              │
              ├─ Validate issuer, audience, signature, tid (jose + JWKS)
              ├─ Map oid/email → users (PostgreSQL)
              ├─ Load role from user_roles (not Entra groups)
              └─ Business logic + audit
```

### Data persistence

| Store | Purpose |
|-------|---------|
| **PostgreSQL** | Users, roles, ideas, prototypes, reviews, status history, audit |
| **Blob Storage** | Prototype screenshots and file assets (**production target**) |
| **Local disk (`data/uploads/`)** | Prototype screenshots today (dev/MVP only — not durable on App Service) |
| **Entra ID** | Identity only — not authorization roles |

> **Screenshot storage warning:** Current screenshot storage uses local disk for dev/MVP. Production should move to Azure Blob Storage.

## Environment strategy

Three isolated Azure environments share the same architecture pattern with different SKUs, secrets, and URLs.

| Environment | Purpose | Typical audience |
|-------------|---------|------------------|
| **dev** | Integration testing, Entra/MSAL validation, schema migrations | Developers |
| **staging** | Pre-production validation, UAT, release candidate | Team + stakeholders |
| **prod** | Production Innovation Hub | Gradera users |

### Isolation model

- **Separate resource group per environment** (recommended)
- **Separate PostgreSQL server** per environment (no shared database)
- **Separate App Service** and **Static Web App** per environment
- **Separate Storage Account** per environment
- **Shared Entra tenant** with **per-environment redirect URIs** on the SPA registration (or separate app registrations if compliance requires)

### Promotion path (application)

```
Local (Modes A/B/C) → dev → staging → prod
```

Infrastructure changes follow the same promotion: Terraform plan/apply per environment with increasing change control on `prod`.

## Naming convention

Pattern: `gradera-{component}-{env}` or `gradera{env}{component}` for globally unique names (Storage, PostgreSQL).

| Resource type | Pattern | Example (dev) |
|---------------|---------|-----------------|
| Resource group | `gradera-innovationhub-{env}-rg` | `gradera-innovationhub-dev-rg` |
| Static Web App | `gradera-web-{env}` | `gradera-web-dev` |
| App Service plan | `gradera-api-plan-{env}` | `gradera-api-plan-dev` |
| App Service | `gradera-api-{env}` | `gradera-api-dev` |
| PostgreSQL server | `gradera-pg-{env}` | `gradera-pg-dev` |
| PostgreSQL database | `gradera_innovation_hub` | same name all envs |
| Storage account | `graderast{env}` (lowercase, no hyphens) | `graderastdev` |
| Blob container | `prototype-assets` | fixed name |
| Application Insights | `gradera-insights-{env}` | `gradera-insights-dev` |
| Log Analytics | `gradera-logs-{env}` | `gradera-logs-dev` |

**Tags (all resources):**

| Tag | Value |
|-----|-------|
| `application` | `gradera-innovation-hub` |
| `environment` | `dev` \| `staging` \| `prod` |
| `managed-by` | `terraform` |
| `cost-center` | *(team-defined)* |

## Region

Default: **same region for all resources in an environment** (e.g. `eastus` or `westeurope`). Choose based on Gradera tenant data residency requirements.

## Related documentation

| Document | Contents |
|----------|----------|
| [resource-inventory.md](./resource-inventory.md) | Per-environment resource names and SKUs |
| [app-registrations.md](./app-registrations.md) | Entra SPA + API registrations |
| [secrets-and-config.md](./secrets-and-config.md) | Env vars and future GitHub secrets |
| [deployment-strategy.md](./deployment-strategy.md) | Promotion and CI/CD stages (planned) |
| [cost-estimate.md](./cost-estimate.md) | Monthly cost ranges |
| [../../infra/azure/README.md](../../infra/azure/README.md) | Terraform scaffold |

## Out of scope (this phase)

- Actual Azure provisioning (`terraform apply`)
- GitHub Actions workflows
- Azure Blob Storage backend for prototype screenshots (local disk MVP exists in `apps/api`)
- Private Link / VNet integration (future hardening)
