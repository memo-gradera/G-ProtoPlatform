# GRADERA Innovation Hub — Operations Runbook

Version: 0.1.0  
Last updated: June 2026

## CI/CD workflows

| Workflow | File | Trigger | Target |
|----------|------|---------|--------|
| **CI** | `.github/workflows/ci.yml` | PR + push to `main` | Validate only (no deploy) |
| **Deploy Web** | `.github/workflows/deploy-web.yml` | Push to `main` (`apps/web/**`) | Azure Static Web App |
| **Deploy API** | `.github/workflows/deploy-api.yml` | Push to `main` (API/domain/contracts) | Azure App Service (Docker) |
| **Deploy Dev** | `.github/workflows/deploy-dev.yml` | Manual `workflow_dispatch` | Full stack (API + web) |

---

## Automatic API deployment (`deploy-api.yml`)

**Purpose:** Deploy API changes automatically when merged to `main`, so the running container always includes the latest routes (e.g. `/api/admin/users`).

### Trigger paths

- `apps/api/**`
- `packages/domain/**`
- `packages/contracts/**`
- `pnpm-lock.yaml`
- `pnpm-workspace.yaml`
- `.github/workflows/deploy-api.yml`

Also available via **Actions → Deploy API → Run workflow**.

### What it does

1. Install, build domain, Prisma generate, API tests, API build
2. Build and push `memogradera/gradera-api:latest` and `memogradera/gradera-api:<git-sha>` (linux/amd64)
3. Confirm Docker manifest for the SHA tag
4. Azure OIDC login
5. `az webapp config container set` — pins App Service to **exact SHA tag** (not stale `:latest` cache)
6. `az webapp restart`
7. Poll `/health` for up to ~3 minutes; verify `commit_sha` when present

### Required GitHub secrets (dev environment)

| Secret | Purpose |
|--------|---------|
| `DOCKERHUB_USERNAME` | Push API image |
| `DOCKERHUB_TOKEN` | Push API image |
| `AZURE_CLIENT_ID` | OIDC app registration |
| `AZURE_TENANT_ID` | Entra tenant |
| `AZURE_SUBSCRIPTION_ID` | Azure subscription |

### Required GitHub variables (dev environment)

| Variable | Example |
|----------|---------|
| `AZURE_WEBAPP_NAME` | `gradera-innovationhub-dev-api` |
| `AZURE_RESOURCE_GROUP` | `gradera-innovationhub-dev-rg` |
| `VITE_API_BASE_URL` | `https://gradera-innovationhub-dev-api-dkcbdkdja0cpdyd0.westus3-01.azurewebsites.net/api` |

### Azure RBAC requirement

The GitHub Actions federated identity (Entra app registration) needs **Contributor** on the dev resource group:

```bash
az role assignment create \
  --assignee <GITHUB_ACTIONS_APP_CLIENT_ID> \
  --role Contributor \
  --scope /subscriptions/<SUBSCRIPTION_ID>/resourceGroups/gradera-innovationhub-dev-rg
```

Without this role, the workflow will push the Docker image successfully but **fail** at `az webapp config container set` with:

> GitHub service principal needs Contributor on gradera-innovationhub-dev-rg to run az webapp config container set.

### Manual API deploy (until RBAC is granted)

After the workflow builds and pushes the image (or after a local `docker push`):

```bash
export RG=gradera-innovationhub-dev-rg
export APP=gradera-innovationhub-dev-api
export SHA=<git-commit-sha>

az webapp config container set \
  --resource-group "$RG" \
  --name "$APP" \
  --container-image-name "memogradera/gradera-api:${SHA}" \
  --container-registry-url "https://index.docker.io"

az webapp restart --resource-group "$RG" --name "$APP"

curl "https://gradera-innovationhub-dev-api-dkcbdkdja0cpdyd0.westus3-01.azurewebsites.net/health"
```

Confirm `/health` returns `"commit_sha": "<SHA>"`.

### Verify deployed API version

```bash
curl -s "${VITE_API_BASE_URL%/api}/health" | jq .
```

Expected fields:

```json
{
  "status": "ok",
  "service": "gradera-api",
  "app_version": "0.1.0",
  "commit_sha": "<github-sha>"
}
```

If `commit_sha` is missing or does not match the merged commit, the App Service is still running an old image.

---

## Azure resources (dev)

| Resource | Name |
|----------|------|
| Resource group | `gradera-innovationhub-dev-rg` |
| API App Service | `gradera-innovationhub-dev-api` |
| Static Web App | `gradera-innovationhub-dev-web` |
| PostgreSQL | `gradera-innovationhub-dev-pg` |
| Docker Hub image | `memogradera/gradera-api` |

---

## Related docs

- [Azure GitHub Actions setup](../docs/azure/github-actions.md)
- [API Docker deployment](../docs/azure/api-docker-deployment.md)
- [apps/api/README.md](../apps/api/README.md)
