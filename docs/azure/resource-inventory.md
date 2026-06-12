# GRADERA Innovation Hub — Azure Resource Inventory

Per-environment resource inventory for **dev**, **staging**, and **prod**. All names follow [architecture.md](./architecture.md) naming conventions.

> **Note:** The baseline resource group name `gradera-innovationhub-rg` is the logical project name. Each environment uses a suffixed resource group: `gradera-innovationhub-{env}-rg`.

---

## dev

| Resource | Name | SKU / tier (recommended) | Notes |
|----------|------|--------------------------|-------|
| Resource group | `gradera-innovationhub-dev-rg` | — | All dev resources |
| Static Web App | `gradera-web-dev` | **Free** or Standard | Free for pilot; Standard for custom domain + SLA |
| App Service plan | `gradera-api-plan-dev` | **B1** (Linux) | 1 core, 1.75 GB RAM |
| App Service | `gradera-api-dev` | Node 20 LTS | `apps/api` deployment target |
| PostgreSQL Flexible Server | `gradera-pg-dev` | **Burstable B1ms** | Single zone, 32 GB storage start |
| PostgreSQL database | `gradera_innovation_hub` | — | Prisma migrations |
| Storage account | `graderastdev` | **Standard LRS** | Globally unique name |
| Blob container | `prototype-assets` | Private | Future file uploads |
| Log Analytics workspace | `gradera-logs-dev` | Pay-as-you-go | 30-day retention default |
| Application Insights | `gradera-insights-dev` | Linked to Log Analytics | API + SWA telemetry |

**URLs (after provisioning):**

| Service | URL pattern |
|---------|-------------|
| Frontend | `https://<random>.azurestaticapps.net` or custom `https://innovation-dev.gradera.ai` |
| API | `https://gradera-api-dev.azurewebsites.net` |

---

## staging

| Resource | Name | SKU / tier (recommended) | Notes |
|----------|------|--------------------------|-------|
| Resource group | `gradera-innovationhub-staging-rg` | — | Pre-production |
| Static Web App | `gradera-web-staging` | **Standard** | Staging slot / preview URLs |
| App Service plan | `gradera-api-plan-staging` | **B1** or **S1** | S1 if deployment slots needed |
| App Service | `gradera-api-staging` | Node 20 LTS | Mirrors prod config |
| PostgreSQL Flexible Server | `gradera-pg-staging` | **Burstable B1ms** | Separate from dev/prod data |
| PostgreSQL database | `gradera_innovation_hub` | — | Seed with anonymized data optional |
| Storage account | `graderaststaging` | **Standard LRS** | |
| Blob container | `prototype-assets` | Private | |
| Log Analytics workspace | `gradera-logs-staging` | Pay-as-you-go | 60-day retention |
| Application Insights | `gradera-insights-staging` | Linked to Log Analytics | |

**URLs:**

| Service | URL pattern |
|---------|-------------|
| Frontend | `https://<random>.azurestaticapps.net` or `https://innovation-staging.gradera.ai` |
| API | `https://gradera-api-staging.azurewebsites.net` |

---

## prod

| Resource | Name | SKU / tier (recommended) | Notes |
|----------|------|--------------------------|-------|
| Resource group | `gradera-innovationhub-prod-rg` | — | Production |
| Static Web App | `gradera-web-prod` | **Standard** | Custom domain + TLS |
| App Service plan | `gradera-api-plan-prod` | **P1v3** (Linux) | Auto-scale rules optional |
| App Service | `gradera-api-prod` | Node 20 LTS | Always On enabled |
| PostgreSQL Flexible Server | `gradera-pg-prod` | **General Purpose D2ds_v5** | Zone redundant optional |
| PostgreSQL database | `gradera_innovation_hub` | — | Automated backups enabled |
| Storage account | `graderastprod` | **Standard GRS** | Geo-redundant for assets |
| Blob container | `prototype-assets` | Private + SAS / managed identity | |
| Log Analytics workspace | `gradera-logs-prod` | Pay-as-you-go | 90-day retention |
| Application Insights | `gradera-insights-prod` | Linked to Log Analytics | Alerts configured |

**URLs:**

| Service | URL pattern |
|---------|-------------|
| Frontend | `https://innovation.gradera.ai` (example custom domain) |
| API | `https://api-innovation.gradera.ai` or `https://gradera-api-prod.azurewebsites.net` |

---

## Entra ID (tenant-wide, not per environment RG)

| Registration | Name (suggested) | Environment scope |
|--------------|------------------|-------------------|
| SPA | `GRADERA Innovation Hub (SPA)` | All redirect URIs (localhost + dev + staging + prod) |
| API | `GRADERA Innovation Hub (API)` | Single exposed API; `JWT_AUDIENCE` per env uses same app ID URI |

Optional: separate SPA/API registrations per environment for strict isolation (higher operational overhead).

---

## Terraform mapping

| Inventory item | Terraform resource (scaffold) |
|----------------|-------------------------------|
| Resource group | `azurerm_resource_group.main` |
| Log Analytics | `azurerm_log_analytics_workspace.main` |
| Application Insights | `azurerm_application_insights.main` |
| App Service plan | `azurerm_service_plan.api` |
| App Service | `azurerm_linux_web_app.api` |
| PostgreSQL | `azurerm_postgresql_flexible_server.main` |
| Storage | `azurerm_storage_account.assets` |
| Static Web App | `azurerm_static_web_app.frontend` |

See [../../infra/azure/README.md](../../infra/azure/README.md) for scaffold details.
