Gradera Innovation Hub - Operations Runbook

Version: 0.1.0

Last Updated: June 2026

⸻

1. Solution Overview

Gradera Innovation Hub is a SaaS platform used to manage innovation intake, prototype development, executive review, and portfolio governance.

The platform consists of:

* React Frontend
* Node.js API
* PostgreSQL Database
* Azure App Service
* Azure Static Web Apps
* Microsoft Entra ID Authentication
* GitHub Actions CI/CD

⸻

2. Architecture

Frontend

* React
* Vite
* MSAL Authentication
* Azure Static Web Apps

Backend

* Node.js
* Express
* Prisma ORM
* Azure App Service (Linux Container)

Database

* Azure PostgreSQL Flexible Server

Authentication

* Microsoft Entra ID

CI/CD

* GitHub Actions
* Docker Hub
* Azure Static Web Apps

⸻

3. Azure Resources

Resource Group

gradera-innovationhub-dev-rg

Resources

Azure PostgreSQL
gradera-innovationhub-dev-pg

API App Service
gradera-innovationhub-dev-api

Application Insights
gradera-innovationhub-dev-api

Container Registry
graderaacr

Static Web App
gradera-innovationhub-dev-web

⸻

4. Application URLs

Frontend

https://jolly-hill-00f07da1e.7.azurestaticapps.net

API

https://gradera-innovationhub-dev-api-dkcbdkdja0cpdyd0.westus3-01.azurewebsites.net

Health Endpoint

https://gradera-innovationhub-dev-api-dkcbdkdja0cpdyd0.westus3-01.azurewebsites.net/health

⸻

5. Authentication

Provider

Microsoft Entra ID

Authentication Flow

User
→ Static Web App
→ Microsoft Login
→ Access Token
→ API Validation
→ Role Validation
→ Application Access

Roles

Admin
Innovation Lead
Developer
Executive Reviewer
Viewer

⸻

6. CI/CD Process

Trigger

Git Push to Main

Pipeline

Push Code
→ CI Tests
→ Build Domain Package
→ Generate Prisma Client
→ Build API
→ Build Frontend
→ Build Docker Image
→ Push Docker Image
→ Restart Azure API
→ Validate Health Endpoint
→ Deploy Static Web App

⸻

7. GitHub Secrets

Environment: dev

Required Secrets

DOCKERHUB_USERNAME

DOCKERHUB_TOKEN

AZURE_STATIC_WEB_APPS_API_TOKEN

AZURE_WEBAPP_PUBLISH_PROFILE

DATABASE_URL

⸻

8. GitHub Variables

Environment: dev

VITE_AZURE_TENANT_ID

VITE_AZURE_CLIENT_ID

VITE_API_SCOPE

VITE_API_BASE_URL

AZURE_WEBAPP_NAME

⸻

9. Deployment Validation

After every deployment:

1. Verify GitHub Actions completed successfully
2. Verify API Health

GET

/health

Expected

{
“status”:“ok”
}

3. Verify Login

* Microsoft Authentication
* Role Assignment
* Application Access

4. Verify CRUD

* Create Idea
* Update Idea
* Create Prototype
* Move Kanban Card

⸻

10. Troubleshooting

Issue

API Not Starting

Actions

Verify Docker image pushed

Verify App Service restarted

Check App Service logs

⸻

Issue

Login Failure

Actions

Verify Entra App Registration

Verify Redirect URIs

Verify API Scope

⸻

Issue

Deployment Failure

Actions

Verify GitHub Secrets

Verify Docker Hub Credentials

Verify Publish Profile

Verify Static Web App Token

⸻

11. Backup & Recovery

Database

Azure PostgreSQL automated backups

Source Code

GitHub Repository

Container Images

Docker Hub

Infrastructure

Azure Resource Group

⸻

12. Current Platform Status

Status

Pilot Ready

Capabilities

✓ Authentication

✓ RBAC

✓ Ideas

✓ Prototypes

✓ Kanban

✓ Status History

✓ CI/CD

✓ Automated Deployment

Roadmap

User Administration

Blob Storage

Executive Review Enhancements

Portfolio Analytics

Notifications

Audit Enhancements