# GRADERA Innovation Hub — Azure Documentation

Planning and deployment documentation for Azure hosting. **No resources are provisioned by reading these docs.**

## Documents

| Document | Description |
|----------|-------------|
| [architecture.md](./architecture.md) | System diagram, auth flow, naming, environments |
| [resource-inventory.md](./resource-inventory.md) | Per-environment resource names and SKUs |
| [app-registrations.md](./app-registrations.md) | Entra SPA + API registrations |
| [secrets-and-config.md](./secrets-and-config.md) | Env vars and future GitHub secrets |
| [deployment-strategy.md](./deployment-strategy.md) | Promotion path and planned CI/CD stages |
| [github-actions.md](./github-actions.md) | CI workflows, OIDC, secrets, and deploy order |
| [api-docker-deployment.md](./api-docker-deployment.md) | Docker image build, ACR, App Service containers |
| [cost-estimate.md](./cost-estimate.md) | Monthly cost scenarios |

## Infrastructure as Code

Terraform scaffold: [../../infra/azure/README.md](../../infra/azure/README.md)

## Application docs (existing)

- [../security/authentication.md](../security/authentication.md) — API JWT validation
- [../security/frontend-msal.md](../security/frontend-msal.md) — MSAL and local integration modes

## Status

| Item | Status |
|------|--------|
| Architecture docs | ✅ This folder |
| Terraform scaffold | ✅ `infra/azure/` |
| Azure provisioning | ⏳ Not started |
| GitHub Actions CI | ✅ `.github/workflows/ci.yml` |
| GitHub Actions deploy (dev) | ✅ Manual workflow scaffold; Azure resources required |
