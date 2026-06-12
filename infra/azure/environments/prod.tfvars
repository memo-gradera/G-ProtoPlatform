# GRADERA Innovation Hub — production environment
# Usage: terraform plan -var-file=environments/prod.tfvars
#
# Requires: remote state backend, change approval, Key Vault for secrets

environment = "prod"
location    = "eastus"

app_service_sku       = "P1v3"
app_service_always_on = true
api_cors_allowed_origins = [
  # Production SWA and custom domain only — no localhost
  # "https://innovation.gradera.ai",
]

enable_postgresql              = true
postgresql_sku                   = "GP_Standard_D2ds_v5"
postgresql_storage_mb            = 131072
postgresql_backup_retention_days = 35
postgresql_geo_redundant_backup  = true
postgresql_allow_azure_services  = false # Use explicit firewall rules / private link

enable_storage           = true
storage_account_name     = "graderastprod"
storage_replication_type = "GRS"

enable_static_web_app     = true
static_web_app_location   = "eastus2"
static_web_app_sku_tier   = "Standard"
static_web_app_sku_size   = "Standard"

log_analytics_retention_days = 90

tags = {
  cost-center = "innovation-prod"
}
