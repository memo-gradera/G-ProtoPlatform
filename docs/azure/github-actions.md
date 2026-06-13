# GRADERA Innovation Hub — GitHub Actions CI/CD

Workflow scaffolding for continuous integration and manual Azure dev deployment. **Azure App Service and Static Web App resources must exist before the deploy workflow can succeed.**

## Workflows

| Workflow | File | Trigger | Purpose |
|----------|------|---------|---------|
| **CI** | [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) | `pull_request`, push to `main` | Install, build domain, test/build web, test/build API |
| **Deploy Dev** | [`.github/workflows/deploy-dev.yml`](../../.github/workflows/deploy-dev.yml) | `workflow_dispatch` only | Manual dev deployment after Azure resources are provisioned |

Both workflows use **Node.js 22 LTS**, **pnpm 9**, and the pnpm store cache via `actions/setup-node`.

---

## Required GitHub secrets

Configure under **Settings → Secrets and variables → Actions** (repository or environment scope).

| Secret | Used by | Description |
|--------|---------|-------------|
| `AZURE_CLIENT_ID` | Deploy Dev | Entra app registration client ID for the **GitHub Actions** federated identity (not the API app registration) |
| `AZURE_TENANT_ID` | Deploy Dev | Microsoft Entra directory (tenant) ID |
| `AZURE_SUBSCRIPTION_ID` | Deploy Dev | Azure subscription ID |
| `AZURE_STATIC_WEB_APPS_API_TOKEN` | Deploy Dev | Deployment token from Azure Static Web App → **Manage deployment token** |
| `DATABASE_URL` | Deploy Dev (optional) | PostgreSQL connection string; required only when `run_migrations` is enabled |

Do **not** commit real secret values. Use placeholders in docs and `.env*.example` files only.

---

## Required GitHub variables

Repository or **dev** environment variables (non-secret configuration):

| Variable | Example | Description |
|----------|---------|-------------|
| `AZURE_WEBAPP_NAME` | `gradera-api-dev` | Linux App Service name (from Terraform output `api_app_service_name`) |
| `VITE_AZURE_TENANT_ID` | `<tenant-guid>` | Entra tenant for MSAL |
| `VITE_AZURE_CLIENT_ID` | `<spa-client-id>` | Entra SPA app registration client ID |
| `VITE_API_SCOPE` | `api://<api-client-id>/access_as_user` | Scope requested by the frontend |
| `VITE_API_BASE_URL` | `https://gradera-api-dev.azurewebsites.net/api` | Public API base URL (from Terraform output `api_base_url`) |

App Service **application settings** (Azure Portal or Terraform) are separate from GitHub variables. See [secrets-and-config.md](./secrets-and-config.md) and [apps/api/.env.production.example](../../apps/api/.env.production.example).

---

## OIDC setup (preferred over publish profiles)

The deploy workflow uses [OpenID Connect](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/about-security-hardening-with-openid-connect) to authenticate to Azure — no publish profile or long-lived Azure service principal password in GitHub.

### 1. Create an Entra app registration for GitHub Actions

1. Azure Portal → **Microsoft Entra ID** → **App registrations** → **New registration**
2. Name: e.g. `gradera-github-actions-dev`
3. Supported account types: single tenant
4. No redirect URI required for federated workload identity
5. Note the **Application (client) ID** → store as GitHub secret `AZURE_CLIENT_ID`
6. Note the **Directory (tenant) ID** → store as GitHub secret `AZURE_TENANT_ID`

### 2. Assign Azure RBAC on the subscription or resource group

Grant the app registration access to deploy:

```bash
az role assignment create \
  --assignee <GITHUB_ACTIONS_APP_CLIENT_ID> \
  --role Contributor \
  --scope /subscriptions/<SUBSCRIPTION_ID>/resourceGroups/<DEV_RESOURCE_GROUP>
```

Use a narrower role if your team policy requires it (e.g. custom role limited to App Service + Static Web App).

### 3. Add federated credentials (one per GitHub environment/branch)

Azure Portal → App registration → **Certificates & secrets** → **Federated credentials** → **Add credential**

| Field | Dev example |
|-------|-------------|
| Federated credential scenario | GitHub Actions deploying Azure resources |
| Organization | Your GitHub org (or user for personal repos) |
| Repository | `ProtoPlatform` (your repo name) |
| Entity type | `Environment` |
| GitHub environment name | `dev` |
| Name | `github-dev-deploy` |

Repeat for `main` branch or other environments when adding staging/prod workflows.

The deploy workflow sets `environment: dev`, so the federated credential must match the **dev** GitHub environment name.

### 4. GitHub environment

Create **Settings → Environments → dev** and attach the secrets/variables above. Optional protection rules (required reviewers) can gate manual deploys.

---

## Web build environment variables

Set as GitHub **variables** (or environment variables on the `dev` environment). Vite embeds these at build time.

| Variable | Production value |
|----------|------------------|
| `VITE_AUTH_PROVIDER` | `msal` |
| `VITE_BACKEND_PROVIDER` | `api` |
| `VITE_DEV_AUTH_BYPASS` | `false` |
| `VITE_DEV_DATA_BYPASS` | `false` |
| `VITE_AZURE_TENANT_ID` | Entra tenant GUID |
| `VITE_AZURE_CLIENT_ID` | SPA client ID |
| `VITE_API_SCOPE` | `api://<api-client-id>/access_as_user` |
| `VITE_API_BASE_URL` | `https://<api-host>/api` |

Template: [apps/web/.env.production.example](../../apps/web/.env.production.example)

Local BASE44 and local auth/data modes remain available via `.env.local`; they are not used in the deploy workflow.

---

## App Service application settings (API)

Configure on the Linux App Service after Terraform or manual provisioning:

| Setting | Notes |
|---------|-------|
| `NODE_ENV` | `production` |
| `PORT` | `8080` (App Service default for Node on Linux) |
| `CORS_ORIGIN` | Static Web App URL, e.g. `https://<swa-host>` |
| `DATABASE_URL` | Azure PostgreSQL connection string with `sslmode=require` |
| `AZURE_TENANT_ID` | Same tenant as Entra registrations |
| `AZURE_CLIENT_ID` | API app registration client ID |
| `JWT_AUDIENCE` | `api://<api-client-id>` or client ID (must match token `aud`) |
| `DEV_AUTH_BYPASS` | `false` |
| `AUTO_PROVISION_DEV_USERS` | `false` |
| `APPLICATIONINSIGHTS_CONNECTION_STRING` | From Terraform output (optional but recommended) |

**Startup command:** `node dist/index.js` (or `npm start` if `package.json` is at the deployment root).

**Health check path:** `/health`

Template: [apps/api/.env.production.example](../../apps/api/.env.production.example)

---

## API deployment package

The API is a pnpm workspace package with `workspace:*` dependencies. A plain `npm install` on a copied `package.json` will not resolve those deps. Use one of the packaging options below.

### Docker container (recommended)

Use when App Service zip/Oryx deploy corrupts or incompletely extracts `node_modules`. Build a container image and run App Service on Linux containers + ACR.

```bash
docker build -f apps/api/Dockerfile -t gradera-api:latest .
```

Full guide: [api-docker-deployment.md](./api-docker-deployment.md) — local run, ACR push, App Service container config, and future GitHub Actions pattern.

### Source package (App Service / Oryx zip)

Use when deploying to Azure App Service and letting **Oryx** run `npm install --omit=dev` on the server. Avoids Azure transforming prebuilt `node_modules` into `node_modules.tar.gz` symlinks.

```bash
pnpm --filter @proto-platform/domain build
pnpm --filter gradera-api build
pnpm --filter gradera-api package:azure-source
```

Script: [`apps/api/scripts/prepareAzureSourcePackage.mjs`](../../apps/api/scripts/prepareAzureSourcePackage.mjs)

Outputs `/tmp/gradera-api-source-package` and `/tmp/gradera-api-source.zip` containing:

- `dist/`, `prisma/`, `package.json`, `package-lock.json`
- `vendor/@proto-platform/domain` (file dependency; no `workspace:*`)
- **No** `node_modules/` in the zip

The script validates `npm install --omit=dev` locally, then removes `node_modules` before zipping. `postinstall` runs `prisma generate` when Oryx installs on Azure.

### Self-contained package (zip deploy with node_modules)

Use for manual zip deploy or environments where you control the full artifact and Oryx/npm install is not run on the server.

```bash
pnpm --filter @proto-platform/domain build
pnpm --filter gradera-api build
pnpm --filter gradera-api package:azure
```

Script: [`apps/api/scripts/prepareAzurePackage.mjs`](../../apps/api/scripts/prepareAzurePackage.mjs)

Outputs `/tmp/gradera-api-azure-package` and `/tmp/gradera-api.zip` (~38 MB) with production `node_modules` included.

The **Deploy Dev** workflow currently runs `pnpm --filter gradera-api package:azure` (zip). Prefer **Docker** or `package:azure-source` if zip deploy fails at runtime.

### Future: container deploy workflow

Planned addition to `.github/workflows/` (not implemented yet):

| Step | Action |
|------|--------|
| Build image | `docker/build-push-action` with `file: apps/api/Dockerfile`, `context: .` |
| Push to ACR | Tag `latest` + `${{ github.sha }}`; auth via OIDC or `ACR_*` secrets |
| Deploy | `az webapp config container set` or `azure/webapps-deploy@v3` for containers |
| Validate on PR | Optional `docker build -f apps/api/Dockerfile .` job in CI |

See [api-docker-deployment.md](./api-docker-deployment.md) for ACR and App Service settings.

---

## Deployment order

Complete these steps once before the first successful **Deploy Dev** run:

1. **Provision Azure resources** — run Terraform in `infra/azure/` for the dev environment (resource group, PostgreSQL, App Service, Static Web App, Application Insights). See [infra/azure/README.md](../../infra/azure/README.md).
2. **Configure Entra app registrations** — SPA + API apps, scopes, redirect URIs. See [app-registrations.md](./app-registrations.md).
3. **Set App Service application settings** — especially `DATABASE_URL`, JWT, and CORS (use SWA URL from Terraform output).
4. **Apply initial database migrations** — locally or via deploy workflow with `run_migrations: true` and `DATABASE_URL` secret.
5. **Seed dev data (optional)** — run `pnpm --filter gradera-api db:seed` against dev DB from a trusted machine.
6. **Configure GitHub OIDC** — federated credential, secrets, and `dev` environment variables.
7. **Copy Static Web App deployment token** — into `AZURE_STATIC_WEB_APPS_API_TOKEN`.
8. **Run Deploy Dev workflow** — Actions → **Deploy Dev** → **Run workflow**.

Subsequent releases: run **Deploy Dev** after merging to `main` (CI must pass). Enable `run_migrations` when the release includes new Prisma migrations.

---

## CI job graph

```
install
   └── build domain ──┬── test web ── build web
                      └── test api ── build api
```

---

## Prisma migrations in CI/CD

| Context | Command |
|---------|---------|
| Local development | `pnpm --filter gradera-api db:migrate` (`prisma migrate dev`) |
| Dev/staging/prod deploy | `pnpm --filter gradera-api exec prisma migrate deploy` |

Do not run `migrate dev` in production. The deploy workflow runs `migrate deploy` only when the `run_migrations` input is enabled and `DATABASE_URL` is set.

---

## Static Web App config

[apps/web/staticwebapp.config.json](../../apps/web/staticwebapp.config.json) defines SPA fallback and security headers. The deploy workflow copies it into `apps/web/dist/` before upload.

---

## Related docs

- [deployment-strategy.md](./deployment-strategy.md) — promotion path and tiers
- [secrets-and-config.md](./secrets-and-config.md) — full variable matrix
- [apps/api/README.md](../../apps/api/README.md) — API startup and health check
