# GRADERA Innovation Hub — Secrets and Configuration

Configuration reference for Azure-hosted environments. **Never commit secrets to git.** Use App Service application settings, Static Web App configuration, Azure Key Vault (recommended for prod), and future GitHub Actions secrets.

---

## Frontend variables (`apps/web`)

Build-time variables (Static Web App / GitHub Actions). Prefix `VITE_` for Vite embedding.

| Variable | dev | staging | prod | Secret? |
|----------|-----|---------|------|---------|
| `VITE_AUTH_PROVIDER` | `local` or `msal` | `msal` | `msal` | No |
| `VITE_BACKEND_PROVIDER` | `api` | `api` | `api` | No |
| `VITE_DEV_AUTH_BYPASS` | `true` (local only) | `false` | `false` | No |
| `VITE_DEV_DATA_BYPASS` | `true` (local only) | `false` | `false` | No |
| `VITE_AZURE_TENANT_ID` | Entra tenant GUID | same | same | No |
| `VITE_AZURE_CLIENT_ID` | SPA client ID | same | same | No |
| `VITE_API_SCOPE` | `api://…/access_as_user` | same | same | No |
| `VITE_API_BASE_URL` | `https://gradera-api-dev.azurewebsites.net/api` | staging URL | prod URL | No |
| `VITE_BASE44_*` | Legacy pilot only | — | — | No |

**Static Web App:** configure in Azure Portal → Configuration → Application settings, or `staticwebapp.config.json` for routes only (not secrets).

---

## Backend variables (`apps/api`)

App Service application settings (slot-sticky for prod).

| Variable | dev | staging | prod | Secret? |
|----------|-----|---------|------|---------|
| `NODE_ENV` | `production` | `production` | `production` | No |
| `PORT` | `8080` (App Service sets) | same | same | No |
| `CORS_ORIGIN` | SWA dev URL | SWA staging URL | SWA prod URL | No |
| `DATABASE_URL` | PostgreSQL connection string | per env | per env | **Yes** |
| `AZURE_TENANT_ID` | Entra tenant GUID | same | same | No |
| `AZURE_CLIENT_ID` | API app client ID | same | same | No |
| `JWT_AUDIENCE` | `api://<api-client-id>` | same | same | No |
| `DEV_AUTH_BYPASS` | `true` (dev only, optional) | `false` | `false` | No |
| `AUTO_PROVISION_DEV_USERS` | `false` | `false` | `false` | No |
| `APPLICATIONINSIGHTS_CONNECTION_STRING` | From Terraform output | per env | per env | Sensitive |

**Future (Blob upload):**

| Variable | Purpose | Secret? |
|----------|---------|---------|
| `AZURE_STORAGE_ACCOUNT_NAME` | Blob account | No |
| `AZURE_STORAGE_CONTAINER_NAME` | `prototype-assets` | No |
| `AZURE_STORAGE_CONNECTION_STRING` | Upload SDK (Phase 1) | **Yes** |
| Or managed identity | No connection string | — |

---

## Database variables

| Variable | Source | Notes |
|----------|--------|-------|
| `DATABASE_URL` | App Service setting | `postgresql://USER:PASSWORD@gradera-pg-{env}.postgres.database.azure.com:5432/gradera_innovation_hub?sslmode=require` |
| PostgreSQL admin user | Terraform / Key Vault | Created at server provisioning |
| PostgreSQL admin password | Key Vault | Rotate on schedule |

**Prisma migrations:** run in CI/CD deploy step or one-off release pipeline — not on every app start in prod.

---

## MSAL / Entra variables

| Concept | Frontend | Backend |
|---------|----------|---------|
| Tenant ID | `VITE_AZURE_TENANT_ID` | `AZURE_TENANT_ID` |
| SPA client ID | `VITE_AZURE_CLIENT_ID` | — |
| API client ID | — | `AZURE_CLIENT_ID` (reference) |
| API scope | `VITE_API_SCOPE` | — |
| Token audience | — | `JWT_AUDIENCE` |

No client secret on SPA (public client). API validates JWTs via JWKS — no shared secret for token validation.

---

## Storage variables

| Variable | Example | Secret? |
|----------|---------|---------|
| Storage account name | `graderastdev` | No |
| Container name | `prototype-assets` | No |
| Connection string | App Service setting | **Yes** |
| Public access | Disabled | — |

---

## Future GitHub Actions secrets

Document for CI/CD implementation (not created yet).

### Repository secrets (org or repo level)

| Secret | Used by | Purpose |
|--------|---------|---------|
| `AZURE_CLIENT_ID` | deploy jobs | GitHub OIDC federated credential app |
| `AZURE_TENANT_ID` | deploy jobs | Entra tenant |
| `AZURE_SUBSCRIPTION_ID` | deploy jobs | Target subscription |
| `AZURE_CREDENTIALS` | — | **Avoid** — prefer OIDC over long-lived JSON |

### Environment secrets (GitHub Environments: `dev`, `staging`, `prod`)

| Secret | Environment | Purpose |
|--------|-------------|---------|
| `DATABASE_URL` | per env | Migration job (optional) |
| `STATIC_WEB_APPS_API_TOKEN_DEV` | dev | SWA deploy |
| `STATIC_WEB_APPS_API_TOKEN_STAGING` | staging | SWA deploy |
| `STATIC_WEB_APPS_API_TOKEN_PROD` | prod | SWA deploy |
| `AZURE_WEBAPP_PUBLISH_PROFILE_*` | per env | App Service deploy (alternative to OIDC) |

### GitHub Environment variables (non-secret)

| Variable | Example |
|----------|---------|
| `VITE_API_BASE_URL` | `https://gradera-api-dev.azurewebsites.net/api` |
| `VITE_AZURE_TENANT_ID` | GUID |
| `VITE_AZURE_CLIENT_ID` | SPA GUID |
| `VITE_API_SCOPE` | `api://…/access_as_user` |
| `API_APP_NAME` | `gradera-api-dev` |
| `SWA_APP_NAME` | `gradera-web-dev` |
| `RESOURCE_GROUP` | `gradera-innovationhub-dev-rg` |

### Key Vault integration (prod recommended)

```
App Service → Key Vault reference → @Microsoft.KeyVault(SecretUri=…)
```

Store: `DATABASE_URL`, storage connection strings, any future API keys.

---

## Local development reference

See `apps/web/.env.example`, `apps/api/.env.example`, and [../security/frontend-msal.md](../security/frontend-msal.md) for Modes A/B/C.
