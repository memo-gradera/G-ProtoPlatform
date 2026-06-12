# GRADERA Innovation Hub — Azure Terraform root module (scaffold)
#
# DO NOT APPLY without configuring remote state and reviewing variables.
# This file defines resource structure only — no secrets, no subscription IDs.

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.0"
    }
  }

  # Uncomment and configure before first real deployment:
  # backend "azurerm" {
  #   resource_group_name  = "gradera-tfstate-rg"
  #   storage_account_name = "graderatfstate"
  #   container_name       = "tfstate"
  #   key                  = "innovation-hub.tfstate"
  # }
}

provider "azurerm" {
  features {
    resource_group {
      prevent_deletion_if_contains_resources = true
    }
  }

  # subscription_id = var.subscription_id  # Optional explicit subscription
}

# -----------------------------------------------------------------------------
# Locals — naming
# -----------------------------------------------------------------------------

locals {
  prefix = "gradera"

  resource_group_name = coalesce(
    var.resource_group_name,
    "${local.prefix}-innovationhub-${var.environment}-rg"
  )

  tags = merge(
    {
      application = "gradera-innovation-hub"
      environment = var.environment
      managed-by  = "terraform"
    },
    var.tags
  )

  # PostgreSQL admin username cannot contain @ or special chars
  pg_admin_login = coalesce(var.postgresql_admin_login, "graderaadmin")
}

# -----------------------------------------------------------------------------
# Resource group
# -----------------------------------------------------------------------------

resource "azurerm_resource_group" "main" {
  name     = local.resource_group_name
  location = var.location
  tags     = local.tags
}

# -----------------------------------------------------------------------------
# Monitoring
# -----------------------------------------------------------------------------

resource "azurerm_log_analytics_workspace" "main" {
  name                = "${local.prefix}-logs-${var.environment}"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  sku                 = "PerGB2018"
  retention_in_days   = var.log_analytics_retention_days
  tags                = local.tags
}

resource "azurerm_application_insights" "main" {
  name                = "${local.prefix}-insights-${var.environment}"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  workspace_id        = azurerm_log_analytics_workspace.main.id
  application_type    = "Node.JS"
  tags                = local.tags
}

# -----------------------------------------------------------------------------
# App Service (API)
# -----------------------------------------------------------------------------

resource "azurerm_service_plan" "api" {
  name                = "${local.prefix}-api-plan-${var.environment}"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  os_type             = "Linux"
  sku_name            = var.app_service_sku
  tags                = local.tags
}

resource "azurerm_linux_web_app" "api" {
  name                = "${local.prefix}-api-${var.environment}"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  service_plan_id     = azurerm_service_plan.api.id
  https_only          = true
  tags                = local.tags

  site_config {
    always_on         = var.app_service_always_on
    minimum_tls_version = "1.2"
    application_stack {
      node_version = "20-lts"
    }
    cors {
      allowed_origins     = var.api_cors_allowed_origins
      support_credentials = true
    }
  }

  app_settings = {
    NODE_ENV                              = "production"
    WEBSITE_NODE_DEFAULT_VERSION          = "~20"
    APPLICATIONINSIGHTS_CONNECTION_STRING = azurerm_application_insights.main.connection_string
    # Secrets (DATABASE_URL, JWT_AUDIENCE, etc.) — set via Portal / Key Vault / CI/CD
    # DATABASE_URL                          = "@Microsoft.KeyVault(...)"
    # AZURE_TENANT_ID                       = "..."
    # JWT_AUDIENCE                          = "api://..."
    # CORS_ORIGIN                           = join(",", var.api_cors_allowed_origins)
    # DEV_AUTH_BYPASS                       = "false"
  }

  lifecycle {
    ignore_changes = [
      app_settings, # Often managed post-provision or by CI/CD
    ]
  }
}

# -----------------------------------------------------------------------------
# PostgreSQL Flexible Server
# -----------------------------------------------------------------------------

resource "azurerm_postgresql_flexible_server" "main" {
  count = var.enable_postgresql ? 1 : 0

  name                   = "${local.prefix}-pg-${var.environment}"
  location               = azurerm_resource_group.main.location
  resource_group_name    = azurerm_resource_group.main.name
  version                = var.postgresql_version
  administrator_login    = local.pg_admin_login
  administrator_password = var.postgresql_admin_password # Pass via TF_VAR or -var; never commit

  storage_mb   = var.postgresql_storage_mb
  sku_name     = var.postgresql_sku
  zone         = var.postgresql_zone

  backup_retention_days        = var.postgresql_backup_retention_days
  geo_redundant_backup_enabled = var.postgresql_geo_redundant_backup

  tags = local.tags

  lifecycle {
    ignore_changes = [
      administrator_password, # Rotate outside Terraform or use Key Vault
    ]
  }
}

resource "azurerm_postgresql_flexible_server_database" "app" {
  count = var.enable_postgresql ? 1 : 0

  name      = var.postgresql_database_name
  server_id = azurerm_postgresql_flexible_server.main[0].id
  charset   = "UTF8"
  collation = "en_US.utf8"
}

# Allow Azure services (App Service outbound IPs should be restricted in hardening phase)
resource "azurerm_postgresql_flexible_server_firewall_rule" "azure_services" {
  count = var.enable_postgresql && var.postgresql_allow_azure_services ? 1 : 0

  name             = "AllowAzureServices"
  server_id        = azurerm_postgresql_flexible_server.main[0].id
  start_ip_address = "0.0.0.0"
  end_ip_address   = "0.0.0.0"
}

# -----------------------------------------------------------------------------
# Storage (prototype assets)
# -----------------------------------------------------------------------------

resource "azurerm_storage_account" "assets" {
  count = var.enable_storage ? 1 : 0

  name                     = var.storage_account_name
  resource_group_name      = azurerm_resource_group.main.name
  location                 = azurerm_resource_group.main.location
  account_tier             = var.storage_account_tier
  account_replication_type = var.storage_replication_type
  min_tls_version          = "TLS1_2"
  tags                     = local.tags

  blob_properties {
    delete_retention_policy {
      days = var.storage_blob_delete_retention_days
    }
  }
}

resource "azurerm_storage_container" "prototype_assets" {
  count = var.enable_storage ? 1 : 0

  name                  = var.storage_container_name
  storage_account_id    = azurerm_storage_account.assets[0].id
  container_access_type = "private"
}

# -----------------------------------------------------------------------------
# Static Web App (frontend)
# -----------------------------------------------------------------------------

resource "azurerm_static_web_app" "frontend" {
  count = var.enable_static_web_app ? 1 : 0

  name                = "${local.prefix}-web-${var.environment}"
  location            = var.static_web_app_location # SWA has limited regions
  resource_group_name = azurerm_resource_group.main.name
  sku_tier            = var.static_web_app_sku_tier
  sku_size            = var.static_web_app_sku_size
  tags                = local.tags

  # Link to GitHub in Portal or separate azurerm_static_web_app resource update
  # app_settings — VITE_* vars set via CI/CD or Portal after first deploy
}
