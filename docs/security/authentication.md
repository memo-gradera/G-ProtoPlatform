# GRADERA Innovation Hub — Authentication

Microsoft Entra ID (Azure AD) secures the GRADERA API. The React frontend will acquire access tokens via **MSAL** and send them as `Authorization: Bearer <token>` headers.

App authorization roles are **not** sourced from Azure AD groups. Roles are stored in PostgreSQL (`roles`, `user_roles`) and assigned by administrators in the Innovation Hub.

## Architecture

```
Browser (MSAL) → Entra ID → access token
                         ↓
                   GRADERA API
                         ↓
              Validate JWT (jose + JWKS)
                         ↓
              Map oid/email → users table
                         ↓
              Load role from user_roles
```

## Entra app registration requirements

Register **two** applications (or a single SPA + exposed API pattern):

### 1. API application (resource)

- **Expose an API**
  - Application ID URI: `api://<api-client-id>` (or custom URI)
  - Add a scope such as `access_as_user`
- Note the **Application (client) ID** and **Directory (tenant) ID**
- Set `JWT_AUDIENCE` to the Application ID URI **or** the API client ID — it must match the `aud` claim on tokens the API receives

### 2. Frontend SPA application (later)

- Platform: Single-page application
- Redirect URIs: local dev + Azure Static Web Apps URLs
- **API permissions**: delegated permission to the API scope (`access_as_user`)
- MSAL will request tokens with `audience` = API Application ID URI

### Token validation (API)

The API validates:

| Check | Source |
|-------|--------|
| Signature | Microsoft JWKS (`/discovery/v2.0/keys`) |
| Issuer | Either `https://login.microsoftonline.com/{AZURE_TENANT_ID}/v2.0` **or** `https://sts.windows.net/{AZURE_TENANT_ID}/` (Entra may emit either format depending on token version/configuration) |
| Audience | `JWT_AUDIENCE` env var |
| Tenant | `tid` claim === `AZURE_TENANT_ID` |
| Expiry | `exp` / `nbf` (30s clock tolerance) |

Identity claims used:

| Claim | Usage |
|-------|--------|
| `oid` | `users.entra_object_id` lookup |
| `preferred_username` / `upn` | Email fallback + backfill |
| `name` | Display name |
| `tid` | Tenant verification |

## User provisioning model

1. Find user by `entra_object_id` (`oid`).
2. Else find by normalized email.
3. If found by email without `entra_object_id`, link the OID.
4. If not found:
   - **Production:** `403` — *User is not provisioned in GRADERA Innovation Hub.*
   - **Development:** optional auto-create **viewer** when `AUTO_PROVISION_DEV_USERS=true`

Administrators assign roles via `PATCH /api/users/:id/role`. The API resolves the **highest-privilege** role when multiple `user_roles` rows exist.

## Environment variables

See [`apps/api/.env.example`](../apps/api/.env.example):

| Variable | Description |
|----------|-------------|
| `AZURE_TENANT_ID` | Entra directory (tenant) ID |
| `AZURE_CLIENT_ID` | API app registration client ID (reference; audience may differ) |
| `JWT_AUDIENCE` | Expected `aud` claim on access tokens |
| `DEV_AUTH_BYPASS` | `true` = use seeded `admin@gradera.local` when no Bearer header (non-production only) |
| `AUTO_PROVISION_DEV_USERS` | `true` = auto-create viewer for unknown Entra users (non-production only) |

**Production:** `DEV_AUTH_BYPASS` is always ignored. Every request must include a valid Bearer token.

## Local development bypass

For local API work without MSAL:

```bash
DEV_AUTH_BYPASS=true
pnpm --filter gradera-api db:seed   # creates admin@gradera.local
pnpm --filter gradera-api dev
```

Requests without an `Authorization` header authenticate as the seeded admin.

To test JWT validation locally:

```bash
DEV_AUTH_BYPASS=false
AZURE_TENANT_ID=<tenant>
JWT_AUDIENCE=api://<api-client-id>
# Acquire token via Azure CLI or Postman, then:
curl -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/users/me
```

## MSAL frontend integration (next phase)

The frontend will:

1. Configure `@azure/msal-browser` with tenant + SPA client ID.
2. Request token for scope `api://<api-client-id>/access_as_user`.
3. Attach `Authorization: Bearer` on API calls.
4. Handle `403` provisioning errors with an admin contact message.

No frontend changes are included in this phase. See [`frontend-msal.md`](./frontend-msal.md) for the SPA integration implemented in `apps/web`.

## Security notes

- Roles are **never** read from Azure AD group claims.
- Service accounts and automation should use the same Bearer token flow (or future client-credentials scope).
- Rotate app secrets in Entra; the API uses JWKS (no shared secret for JWT validation).
