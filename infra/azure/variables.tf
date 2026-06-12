# GRADERA Innovation Hub — Terraform variables (scaffold)

variable "environment" {
  description = "Deployment environment: dev, staging, or prod"
  type        = string

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "environment must be dev, staging, or prod."
  }
}

variable "location" {
  description = "Primary Azure region for regional resources"
  type        = string
  default     = "eastus"
}

# variable "subscription_id" {
#   description = "Azure subscription ID (optional if using Azure CLI context)"
#   type        = string
#   default     = null
# }

variable "resource_group_name" {
  description = "Override resource group name (default: gradera-innovationhub-{env}-rg)"
  type        = string
  default     = null
}

variable "tags" {
  description = "Additional resource tags"
  type        = map(string)
  default     = {}
}

# -----------------------------------------------------------------------------
# App Service (API)
# -----------------------------------------------------------------------------

variable "app_service_sku" {
  description = "App Service plan SKU (e.g. B1, S1, P1v3)"
  type        = string
  default     = "B1"
}

variable "app_service_always_on" {
  description = "Keep API warm (recommended true for staging/prod)"
  type        = bool
  default     = false
}

variable "api_cors_allowed_origins" {
  description = "CORS origins for the API (Static Web App URLs)"
  type        = list(string)
  default     = ["http://localhost:5173"]
}

# -----------------------------------------------------------------------------
# PostgreSQL
# -----------------------------------------------------------------------------

variable "enable_postgresql" {
  description = "Provision PostgreSQL Flexible Server"
  type        = bool
  default     = true
}

variable "postgresql_version" {
  type    = string
  default = "16"
}

variable "postgresql_sku" {
  description = "PostgreSQL Flexible Server SKU name"
  type        = string
  default     = "B_Standard_B1ms"
}

variable "postgresql_storage_mb" {
  type    = number
  default = 32768
}

variable "postgresql_zone" {
  description = "Availability zone (null for no zone preference)"
  type        = string
  default     = null
}

variable "postgresql_database_name" {
  type    = string
  default = "gradera_innovation_hub"
}

variable "postgresql_admin_login" {
  type    = string
  default = null
}

variable "postgresql_admin_password" {
  description = "PostgreSQL admin password — supply via TF_VAR_postgresql_admin_password, never commit"
  type        = string
  sensitive   = true
  default     = null
}

variable "postgresql_backup_retention_days" {
  type    = number
  default = 7
}

variable "postgresql_geo_redundant_backup" {
  type    = bool
  default = false
}

variable "postgresql_allow_azure_services" {
  description = "Firewall rule for Azure services (tighten for production)"
  type        = bool
  default     = true
}

# -----------------------------------------------------------------------------
# Storage
# -----------------------------------------------------------------------------

variable "enable_storage" {
  type    = bool
  default = true
}

variable "storage_account_name" {
  description = "Globally unique storage account name (lowercase, no hyphens)"
  type        = string
}

variable "storage_account_tier" {
  type    = string
  default = "Standard"
}

variable "storage_replication_type" {
  type    = string
  default = "LRS"
}

variable "storage_container_name" {
  type    = string
  default = "prototype-assets"
}

variable "storage_blob_delete_retention_days" {
  type    = number
  default = 7
}

# -----------------------------------------------------------------------------
# Static Web App
# -----------------------------------------------------------------------------

variable "enable_static_web_app" {
  type    = bool
  default = true
}

variable "static_web_app_location" {
  description = "Static Web Apps region (limited set, e.g. eastus2, westeurope)"
  type        = string
  default     = "eastus2"
}

variable "static_web_app_sku_tier" {
  type    = string
  default = "Free"
}

variable "static_web_app_sku_size" {
  type    = string
  default = "Free"
}

# -----------------------------------------------------------------------------
# Monitoring
# -----------------------------------------------------------------------------

variable "log_analytics_retention_days" {
  type    = number
  default = 30
}
