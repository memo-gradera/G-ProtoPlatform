# GRADERA Innovation Hub — Azure Terraform

Terraform scaffold for GRADERA Innovation Hub Azure resources. **Do not run `terraform apply` until:**

1. Azure subscription and permissions are confirmed
2. Remote state backend is configured
3. Entra app registrations are documented ([docs/azure/app-registrations.md](../../docs/azure/app-registrations.md))
4. Team has reviewed [docs/azure/architecture.md](../../docs/azure/architecture.md)

## Why Terraform

| Criteria | Terraform | Bicep |
|----------|-----------|-------|
| Multi-cloud / portable modules | ✅ | Azure-only |
| Team familiarity / hiring | Common | Azure-focused |
| State management | Mature | ARM deployment history |
| Ecosystem (providers, CI) | Large | Growing |

Bicep is a valid alternative if the team is 100% Azure-native and uses ARM exclusively. This repo scaffolds **Terraform** for portability and module reuse.

## Prerequisites

- [Terraform](https://developer.hashicorp.com/terraform/install) >= 1.5
- [Azure CLI](https://learn.microsoft.com/cli/azure/install-azure-cli) logged in: `az login`
- Subscription Contributor (or scoped RBAC) on target subscription
- **No credentials in this repo**

## Layout

```
infra/azure/
├── README.md           # This file
├── main.tf             # Provider, resource group, core resources (scaffold)
├── variables.tf        # Input variables
├── outputs.tf          # Outputs for CI/CD and app configuration
└── environments/
    ├── dev.tfvars
    ├── staging.tfvars
    └── prod.tfvars
```

## Quick start (plan only)

```bash
cd infra/azure

# Initialize (local state for scaffold — configure remote backend before prod)
terraform init

# Plan for dev (no apply)
terraform plan -var-file=environments/dev.tfvars
```

### Remote state (configure before first apply)

Uncomment and set in `main.tf` or a `backend.tf` file:

```hcl
terraform {
  backend "azurerm" {
    resource_group_name  = "gradera-tfstate-rg"
    storage_account_name = "graderatfstate"
    container_name       = "tfstate"
    key                  = "innovation-hub.dev.tfstate"
  }
}
```

Use separate state keys per environment: `innovation-hub.dev.tfstate`, `innovation-hub.staging.tfstate`, `innovation-hub.prod.tfstate`.

## Recommended deployment order

1. **Entra app registrations** (manual — not Terraform)
2. **Resource group + Log Analytics + Application Insights**
3. **PostgreSQL Flexible Server** + database + firewall rules
4. **Storage account** + blob container
5. **App Service plan + App Service** (configure app settings)
6. **Static Web App**
7. **Run Prisma migrations** + seed admin user
8. **Configure SWA environment variables** + deploy frontend
9. **End-to-end MSAL test**

## What this scaffold includes

- Resource group
- Log Analytics workspace
- Application Insights
- Linux App Service plan + Web App (placeholder site)
- PostgreSQL Flexible Server (scaffold — sensitive)
- Storage account + blob container
- Static Web App (scaffold)

## What is NOT included yet

- Entra app registrations (Portal / separate module)
- Key Vault
- Private endpoints / VNet
- CDN / Front Door
- Auto-scale rules
- GitHub Actions workflows
- Actual secrets or subscription IDs

## Related documentation

- [docs/azure/architecture.md](../../docs/azure/architecture.md)
- [docs/azure/resource-inventory.md](../../docs/azure/resource-inventory.md)
- [docs/azure/secrets-and-config.md](../../docs/azure/secrets-and-config.md)
- [docs/azure/deployment-strategy.md](../../docs/azure/deployment-strategy.md)
- [docs/azure/cost-estimate.md](../../docs/azure/cost-estimate.md)
