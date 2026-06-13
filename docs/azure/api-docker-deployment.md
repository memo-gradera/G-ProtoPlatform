# GRADERA Innovation Hub — API Docker deployment

Deploy `gradera-api` to **Azure App Service (Linux)** as a container image instead of zip/Oryx deploy. This avoids `node_modules.tar.gz` extraction and incomplete dependency trees on App Service.

**Related:** zip/source packaging scripts remain available (`package:azure`, `package:azure-source`). Prefer Docker when App Service zip/Oryx deploy fails at runtime.

---

## Prerequisites

- Docker (local build/push)
- Azure CLI (`az`) logged in
- Azure Container Registry (ACR) — create via Portal or Terraform
- App Service plan that supports **Linux containers** (not zip-only Node stack)

---

## Image overview

| Item | Value |
|------|--------|
| Dockerfile | [`apps/api/Dockerfile`](../../apps/api/Dockerfile) |
| Base image | `node:22-slim` |
| Build context | **Monorepo root** (`.`) |
| Runtime port | `8080` (`PORT` env) |
| Startup | `node dist/index.js` (from `/app/apps/api`) |
| Health check | `GET /health` |

The image:

1. Installs pnpm and workspace deps from `pnpm-lock.yaml`
2. Clears stale domain build cache (`dist/`, `*.tsbuildinfo`) — required because `.dockerignore` excludes `dist/`
3. Builds `@proto-platform/domain` (emits `dist/index.js` + `dist/index.d.ts`)
4. Builds `gradera-api` (`prisma generate` + `tsc`)
5. Copies runtime artifacts with pnpm workspace symlinks intact
6. Runs as non-root `node` user

---

## Build locally

From the monorepo root:

```bash
docker build -f apps/api/Dockerfile -t gradera-api:latest .
```

Expected final stage: `runner` with `/app/dist`, `/app/prisma`, `/app/node_modules`.

---

## Run locally

```bash
docker run --rm -p 8080:8080 \
  -e NODE_ENV=production \
  -e PORT=8080 \
  -e DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/gradera_innovation_hub?sslmode=require" \
  -e CORS_ORIGIN="http://localhost:5173" \
  -e AZURE_TENANT_ID="<tenant-id>" \
  -e JWT_AUDIENCE="api://<api-client-id>" \
  -e DEV_AUTH_BYPASS=false \
  gradera-api:latest
```

Or with a local env file (do not commit secrets):

```bash
docker run --rm -p 8080:8080 --env-file apps/api/.env gradera-api:latest
```

Verify:

```bash
curl http://localhost:8080/health
```

---

## Push to Azure Container Registry

Replace `<acr>` with your registry name (e.g. `graderadev`).

```bash
az acr login --name <acr>

docker tag gradera-api:latest <acr>.azurecr.io/gradera-api:latest
docker push <acr>.azurecr.io/gradera-api:latest
```

Optional version tag:

```bash
VERSION=$(git rev-parse --short HEAD)
docker tag gradera-api:latest <acr>.azurecr.io/gradera-api:${VERSION}
docker push <acr>.azurecr.io/gradera-api:${VERSION}
```

---

## Configure App Service to use the image

### Portal

1. App Service → **Deployment Center** (or **Container settings**)
2. Image source: **Azure Container Registry**
3. Select registry, image `gradera-api`, tag `latest` (or commit SHA)
4. Enable continuous deployment if desired

### Azure CLI

```bash
RESOURCE_GROUP=gradera-dev-rg
WEBAPP=gradera-api-dev
ACR=<acr>
IMAGE=<acr>.azurecr.io/gradera-api:latest

# Allow App Service to pull from ACR (system-assigned identity example)
PRINCIPAL_ID=$(az webapp identity assign \
  --resource-group "$RESOURCE_GROUP" \
  --name "$WEBAPP" \
  --query principalId -o tsv)

ACR_ID=$(az acr show --name "$ACR" --query id -o tsv)
az role assignment create \
  --assignee "$PRINCIPAL_ID" \
  --role AcrPull \
  --scope "$ACR_ID"

az webapp config container set \
  --resource-group "$RESOURCE_GROUP" \
  --name "$WEBAPP" \
  --docker-custom-image-name "$IMAGE" \
  --docker-registry-server-url "https://${ACR}.azurecr.io"

az webapp config appsettings set \
  --resource-group "$RESOURCE_GROUP" \
  --name "$WEBAPP" \
  --settings \
    WEBSITES_PORT=8080 \
    NODE_ENV=production \
    PORT=8080
```

### Required App Service application settings

Same as zip deploy — see [secrets-and-config.md](./secrets-and-config.md) and [`apps/api/.env.production.example`](../../apps/api/.env.production.example):

| Setting | Notes |
|---------|-------|
| `DATABASE_URL` | Azure PostgreSQL connection string |
| `CORS_ORIGIN` | Static Web App URL |
| `AZURE_TENANT_ID` | Entra tenant |
| `JWT_AUDIENCE` | API token audience |
| `DEV_AUTH_BYPASS` | `false` |
| `WEBSITES_PORT` | `8080` (matches container `EXPOSE`) |

**Startup command:** leave empty — the image `CMD` is `node dist/index.js`.

**Health check:** `/health`

---

## Database migrations

Run migrations outside the container startup path (same as zip deploy):

```bash
DATABASE_URL="..." pnpm --filter gradera-api exec prisma migrate deploy
```

Or from a one-off job / GitHub Actions step before or after image deploy.

Do not run `prisma migrate dev` in production.

---

## GitHub Actions (future container workflow)

No container deploy workflow exists yet. Planned pattern:

1. **Build and push image**
   - `docker/login-action` → ACR (or OIDC `azure/login` + `az acr login`)
   - `docker/build-push-action` with `file: apps/api/Dockerfile`, `context: .`
   - Tags: `latest`, `${{ github.sha }}`

2. **Deploy to App Service**
   - `azure/webapps-deploy@v3` with container image **or**
   - `az webapp config container set` after push

3. **Secrets / variables**
   - `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID` (OIDC)
   - `ACR_LOGIN_SERVER`, `ACR_USERNAME` / `ACR_PASSWORD` (if not using OIDC AcrPush)
   - App settings remain on App Service (not baked into the image)

4. **CI**
   - Optional job: `docker build -f apps/api/Dockerfile .` on PR to validate Dockerfile

See also [github-actions.md](./github-actions.md) for existing CI and zip deploy workflows.

---

## Deployment method comparison

| Method | When to use |
|--------|-------------|
| **Docker (this doc)** | **Recommended** — reliable `node_modules`, no Oryx zip extraction |
| `package:azure-source` | Zip without `node_modules`; Oryx runs `npm install` |
| `package:azure` | Self-contained zip with prebuilt `node_modules` (~38 MB); may hit App Service tar/symlink issues |

---

## Troubleshooting

| Symptom | Check |
|---------|--------|
| Container exits immediately | App Service logs; missing `DATABASE_URL` or Entra settings in production |
| 502 / not listening | `WEBSITES_PORT=8080`, `PORT=8080` |
| Prisma errors | Migrations applied? `DATABASE_URL` uses `sslmode=require` for Azure PostgreSQL |
| `Cannot find package 'cors'` | Rebuild image — do not use broken zip deploy for this app |
| `Could not find a declaration file for module '@proto-platform/domain'` | Stale `tsconfig.build.tsbuildinfo` with missing `dist/` — Dockerfile clears this before domain build; ensure `.dockerignore` excludes `**/*.tsbuildinfo` |

---

## Related files

- [`apps/api/Dockerfile`](../../apps/api/Dockerfile)
- [`.dockerignore`](../../.dockerignore)
- [`apps/api/README.md`](../../apps/api/README.md) — API runtime and health check
