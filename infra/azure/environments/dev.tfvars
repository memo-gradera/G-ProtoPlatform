# GRADERA Innovation Hub — dev environment
# Usage: terraform plan -var-file=environments/dev.tfvars

environment = "dev"
location    = "eastus"

# App Service
app_service_sku       = "B1"
app_service_always_on = false
api_cors_allowed_origins = [
  "http://localhost:5173",
  "https://localhost:5173",
  # Add after SWA provision: terraform output static_web_app_url
]

# PostgreSQL
enable_postgresql              = true
postgresql_sku                   = "B_Standard_B1ms"
postgresql_storage_mb            = 32768
postgresql_backup_retention_days = 7
postgresql_geo_redundant_backup  = false
postgresql_allow_azure_services  = true
# postgresql_admin_password — set via: export TF_VAR_postgresql_admin_password='...'

# Storage (name must be globally unique — change if taken)
enable_storage           = true
storage_account_name     = "graderastdev"
storage_replication_type = "LRS"

# Static Web App
enable_static_web_app     = true
static_web_app_location   = "eastus2"
static_web_app_sku_tier   = "Free"
static_web_app_sku_size   = "Free"

# Monitoring
log_analytics_retention_days = 30

tags = {
  cost-center = "innovation-dev"
}
