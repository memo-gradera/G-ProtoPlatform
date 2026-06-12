# GRADERA Innovation Hub — Azure Cost Estimate

Rough **monthly USD estimates** for planning. Actual costs vary by region, usage, egress, and reserved capacity. Use the [Azure Pricing Calculator](https://azure.microsoft.com/pricing/calculator/) before provisioning.

**Region assumption:** East US / West Europe (similar order of magnitude)  
**Currency:** USD / month, excluding Entra ID (included in M365 for most tenants)

---

## Scenario 1 — Developer Pilot (dev only)

Single **dev** environment for 2–5 developers. Minimal SKUs, no HA.

| Resource | SKU | Est. monthly |
|----------|-----|--------------|
| Static Web App | Free | $0 |
| App Service plan | B1 Linux | ~$13 |
| PostgreSQL Flexible Server | Burstable B1ms, 32 GB | ~$25 |
| Storage account | Standard LRS, &lt;10 GB | ~$1 |
| Log Analytics + App Insights | &lt;1 GB ingestion | ~$5–15 |
| **Total (dev pilot)** | | **~$45–55 / month** |

Optional: add **staging** at same SKUs → **~$90–110 / month** for dev + staging.

---

## Scenario 2 — Small Team (dev + staging + prod-lite)

Team of 10–25 users. Production on modest SKUs without multi-region HA.

| Resource | dev | staging | prod | Notes |
|----------|-----|---------|------|-------|
| Static Web App | Free | Standard ~$9 | Standard ~$9 | Custom domains on std+ |
| App Service | B1 ~$13 | B1 ~$13 | **P1v3 ~$75** | Prod Always On |
| PostgreSQL | B1ms ~$25 | B1ms ~$25 | **D2ds_v5 ~$120** | Prod GP tier |
| Storage | LRS ~$1 | LRS ~$1 | GRS ~$2 | Low asset volume |
| Monitoring | ~$10 | ~$10 | ~$20 | Higher prod traffic |
| **Subtotal** | ~$49 | ~$58 | ~$226 | |

**Total (all three environments): ~$330–380 / month**

---

## Scenario 3 — Production (prod-focused)

Production-grade for 50+ users with HA options. Dev/staging assumed separate (add Scenario 1 or 2).

| Resource | SKU | Est. monthly |
|----------|-----|--------------|
| Static Web App | Standard | ~$9 |
| App Service plan | P1v3 (1 instance) | ~$75 |
| App Service (scale-out) | +1 instance peak | ~$75 (variable) |
| PostgreSQL Flexible Server | GP D4ds_v5, 128 GB, HA optional | ~$250–400 |
| Storage account | GRS, 100 GB | ~$5–10 |
| Log Analytics + App Insights | 5–10 GB/month | ~$50–100 |
| Key Vault | Standard, low ops | ~$1 |
| **Total (prod only)** | | **~$390–670 / month** |

Add **~$100–150 / month** for dev + staging if kept at pilot SKUs.

---

## Cost optimization tips

| Tip | Savings |
|-----|---------|
| Stop dev App Service nights/weekends (scripted) | ~30% on compute |
| Reserved capacity (1-year) on prod App Service + PostgreSQL | ~30–40% |
| Keep dev on Free SWA + B1 | Minimize pilot cost |
| Single Log Analytics workspace with env tags | Reduce workspace overhead |
| Blob lifecycle policy (cool/archive old assets) | Storage egress + capacity |

---

## Recommended SKU summary

| Tier | App Service | PostgreSQL | SWA |
|------|-------------|------------|-----|
| **dev** | B1 | Burstable B1ms | Free |
| **staging** | B1 or S1 | Burstable B1ms | Standard |
| **prod** | P1v3+ | GP D2ds_v5+ | Standard |

---

## One-time / non-monthly costs

| Item | Estimate |
|------|----------|
| Custom domain (if not already owned) | Registrar fees |
| SSL | Included on SWA + App Service |
| Entra ID P1/P2 | Only if conditional access / PIM required |
| Egress to internet | Usually low for internal hub |

---

## Next steps

1. Confirm budget with finance using **Scenario 2** as default planning figure (~$350/month all envs).
2. Set Azure budget alerts on `gradera-innovationhub-*-rg` resource groups.
3. Tag all resources with `environment` for Cost Management filtering.

See [resource-inventory.md](./resource-inventory.md) for SKU names used in Terraform tfvars.
