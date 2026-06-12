# GRADERA Innovation Hub — Entra App Registrations

Microsoft Entra ID (Azure AD) provides identity for the Innovation Hub. **Application roles are managed in PostgreSQL**, not Entra groups.

Register two applications in the Gradera tenant (or use one multi-tenant pattern if required by IT policy).

---

## 1. API application (resource server)

**Suggested display name:** `GRADERA Innovation Hub (API)`

### Platform configuration

- **Supported account types:** Accounts in this organizational directory only (single tenant)
- **No redirect URIs** on the API app itself (confidential/public API resource only)

### Expose an API

| Setting | Value |
|---------|-------|
| Application ID URI | `api://<api-client-id>` |
| Scope name | `access_as_user` |
| Admin consent display name | Access GRADERA Innovation Hub API |
| Admin consent description | Allows the SPA to call the GRADERA API on behalf of the signed-in user |
| Who can consent | Admins and users (or admins only per policy) |

**Scope identifier (full):** `api://<api-client-id>/access_as_user`

### Token configuration (optional claims)

Ensure access tokens include:

| Claim | Purpose |
|-------|---------|
| `oid` | Map to `users.entra_object_id` |
| `preferred_username` / `upn` | Email fallback |
| `name` | Display name |
| `tid` | Tenant verification |

### API `.env` mapping

| Entra value | API env var |
|-------------|-------------|
| Directory (tenant) ID | `AZURE_TENANT_ID` |
| Application (client) ID | `AZURE_CLIENT_ID` (reference) |
| Application ID URI or client ID | `JWT_AUDIENCE` |

Production: `DEV_AUTH_BYPASS=false` always.

---

## 2. SPA application (public client)

**Suggested display name:** `GRADERA Innovation Hub (SPA)`

### Platform configuration

- **Platform:** Single-page application

### Redirect URIs

| Environment | URI |
|-------------|-----|
| Local dev | `http://localhost:5173` |
| Local dev (alt) | `http://localhost:5173/` |
| Dev (SWA) | `https://<gradera-web-dev>.azurestaticapps.net` |
| Dev (custom) | `https://innovation-dev.gradera.ai` |
| Staging (SWA) | `https://<gradera-web-staging>.azurestaticapps.net` |
| Staging (custom) | `https://innovation-staging.gradera.ai` |
| Production (SWA) | `https://<gradera-web-prod>.azurestaticapps.net` |
| Production (custom) | `https://innovation.gradera.ai` |

### Logout URLs

Match redirect URIs (MSAL `postLogoutRedirectUri`).

### API permissions (delegated)

| API | Permission | Type | Admin consent |
|-----|------------|------|---------------|
| GRADERA Innovation Hub (API) | `access_as_user` | Delegated | Required |

**Do not** add Microsoft Graph permissions unless needed for profile photos etc.

### Implicit grant

- **Not required** — MSAL v2 uses authorization code flow with PKCE for SPAs.

### SPA `.env` mapping

| Entra value | Frontend env var |
|-------------|------------------|
| Directory (tenant) ID | `VITE_AZURE_TENANT_ID` |
| SPA Application (client) ID | `VITE_AZURE_CLIENT_ID` |
| Full scope | `VITE_API_SCOPE` = `api://<api-client-id>/access_as_user` |
| App Service URL | `VITE_API_BASE_URL` = `https://gradera-api-{env}.azurewebsites.net/api` |

Frontend production settings:

```
VITE_AUTH_PROVIDER=msal
VITE_BACKEND_PROVIDER=api
VITE_DEV_AUTH_BYPASS=false
VITE_DEV_DATA_BYPASS=false
```

---

## Authentication flow summary

```
1. User opens Static Web App URL
2. MSAL loginRedirect → Entra authorize endpoint
3. User signs in with Gradera credentials
4. Entra returns authorization code → MSAL exchanges for tokens
5. SPA acquires access token for scope api://<api-client-id>/access_as_user
6. SPA calls App Service with Authorization: Bearer <access_token>
7. API validates JWT (issuer, audience, signature, tid, exp)
8. API loads user + role from PostgreSQL
9. 403 if user not provisioned in GRADERA Innovation Hub
```

---

## Service principal / managed identity (future)

| Component | Identity approach |
|-----------|-------------------|
| App Service → PostgreSQL | Connection string in App Service settings (Phase 1); managed identity + AAD auth (Phase 2) |
| App Service → Storage | Managed identity + RBAC `Storage Blob Data Contributor` (when upload is implemented) |
| GitHub Actions → Azure | Federated workload identity (OIDC) — document in [secrets-and-config.md](./secrets-and-config.md) |

---

## Checklist before first dev deployment

- [ ] API app registration created with Expose an API scope
- [ ] SPA app registration created with redirect URIs for localhost + dev SWA URL
- [ ] Admin consent granted for `access_as_user`
- [ ] `JWT_AUDIENCE` on API matches token `aud` claim
- [ ] At least one user provisioned in PostgreSQL with appropriate `user_roles`
- [ ] CORS on API includes Static Web App origin (`CORS_ORIGIN`)

See also [../security/authentication.md](../security/authentication.md) and [../security/frontend-msal.md](../security/frontend-msal.md).
