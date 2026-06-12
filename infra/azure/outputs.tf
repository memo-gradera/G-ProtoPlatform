# GRADERA Innovation Hub — Terraform outputs (scaffold)

output "environment" {
  description = "Deployed environment name"
  value       = var.environment
}

output "resource_group_name" {
  description = "Resource group name"
  value       = azurerm_resource_group.main.name
}

output "resource_group_id" {
  value = azurerm_resource_group.main.id
}

output "location" {
  value = azurerm_resource_group.main.location
}

# -----------------------------------------------------------------------------
# API (App Service)
# -----------------------------------------------------------------------------

output "api_app_service_name" {
  description = "App Service name for gradera-api deployment"
  value       = azurerm_linux_web_app.api.name
}

output "api_app_service_default_hostname" {
  description = "Default API hostname (use for VITE_API_BASE_URL)"
  value       = azurerm_linux_web_app.api.default_hostname
}

output "api_base_url" {
  description = "Suggested API base URL for frontend configuration"
  value       = "https://${azurerm_linux_web_app.api.default_hostname}/api"
}

output "api_health_url" {
  description = "Health check URL"
  value       = "https://${azurerm_linux_web_app.api.default_hostname}/health"
}

# -----------------------------------------------------------------------------
# Frontend (Static Web App)
# -----------------------------------------------------------------------------

output "static_web_app_name" {
  description = "Static Web App resource name"
  value       = var.enable_static_web_app ? azurerm_static_web_app.frontend[0].name : null
}

output "static_web_app_default_hostname" {
  description = "Default frontend URL — add to Entra SPA redirect URIs"
  value       = var.enable_static_web_app ? azurerm_static_web_app.frontend[0].default_host_name : null
}

output "static_web_app_url" {
  value = var.enable_static_web_app ? "https://${azurerm_static_web_app.frontend[0].default_host_name}" : null
}

# -----------------------------------------------------------------------------
# PostgreSQL
# -----------------------------------------------------------------------------

output "postgresql_server_fqdn" {
  description = "PostgreSQL server FQDN for DATABASE_URL"
  value       = var.enable_postgresql ? azurerm_postgresql_flexible_server.main[0].fqdn : null
}

output "postgresql_database_name" {
  value = var.postgresql_database_name
}

output "database_url_hint" {
  description = "DATABASE_URL format (substitute password from Key Vault)"
  sensitive   = true
  value = var.enable_postgresql ? format(
    "postgresql://%s:<password>@%s:5432/%s?sslmode=require",
    local.pg_admin_login,
    azurerm_postgresql_flexible_server.main[0].fqdn,
    var.postgresql_database_name,
  ) : null
}

# -----------------------------------------------------------------------------
# Storage
# -----------------------------------------------------------------------------

output "storage_account_name" {
  value = var.enable_storage ? azurerm_storage_account.assets[0].name : null
}

output "storage_container_name" {
  value = var.storage_container_name
}

# -----------------------------------------------------------------------------
# Monitoring
# -----------------------------------------------------------------------------

output "application_insights_connection_string" {
  description = "Set as APPLICATIONINSIGHTS_CONNECTION_STRING on App Service"
  sensitive   = true
  value       = azurerm_application_insights.main.connection_string
}

output "log_analytics_workspace_id" {
  value = azurerm_log_analytics_workspace.main.id
}

# -----------------------------------------------------------------------------
# Entra / MSAL hints (manual configuration)
# -----------------------------------------------------------------------------

output "msal_configuration_hints" {
  description = "Values to configure after Entra app registration (not created by Terraform)"
  value = {
    vite_api_base_url = "https://${azurerm_linux_web_app.api.default_hostname}/api"
    vite_api_scope    = "api://<api-client-id>/access_as_user"
    jwt_audience      = "api://<api-client-id>"
    cors_origin       = var.enable_static_web_app ? "https://${azurerm_static_web_app.frontend[0].default_host_name}" : "set-after-swa-provision"
  }
}
