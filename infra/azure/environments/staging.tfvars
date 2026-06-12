# GRADERA Innovation Hub — staging environment
# Usage: terraform plan -var-file=environments/staging.tfvars

environment = "staging"
location    = "eastus"

app_service_sku       = "B1"
app_service_always_on = true
api_cors_allowed_origins = [
  "http://localhost:5173",
  # Add staging SWA URL after provision
]

enable_postgresql              = true
postgresql_sku                   = "B_Standard_B1ms"
postgresql_storage_mb            = 32768
postgresql_backup_retention_days = 14
postgresql_geo_redundant_backup  = false

enable_storage           = true
storage_account_name     = "graderaststaging"
storage_replication_type = "LRS"

enable_static_web_app     = true
static_web_app_location   = "eastus2"
static_web_app_sku_tier   = "Standard"
static_web_app_sku_size   = "Standard"

log_analytics_retention_days = 60

tags = {
  cost-center = "innovation-staging"
}
