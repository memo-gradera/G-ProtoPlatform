# GRADERA Innovation Hub — Frontend MSAL Authentication

The React SPA authenticates users with **Microsoft Entra ID** via `@azure/msal-browser` and calls the GRADERA API with Bearer access tokens.

App roles are **not** read from Entra groups. After login, the frontend loads the provisioned user profile from `GET /api/users/me` and uses the `role` field for client-side RBAC.

## Operating modes

| Mode | Auth env | Backend env | Use case |
|------|----------|-------------|----------|
| **Local pilot** | `VITE_DEV_AUTH_BYPASS=true` → `local` | `VITE_DEV_DATA_BYPASS=true` → `local` | Offline demo, no API |
| **API + MSAL** | `VITE_AUTH_PROVIDER=msal` | `VITE_BACKEND_PROVIDER=api` | Production / Azure |
| **Legacy BASE44** | default / `base44` | default / `base44` | Existing pilot deployment |

Resolution logic lives in:

- `apps/web/src/lib/authMode.js`
- `apps/web/src/services/backendMode.js`

`VITE_DEV_AUTH_BYPASS=true` always forces **local** auth regardless of `VITE_AUTH_PROVIDER`.

`VITE_DEV_DATA_BYPASS=true` always forces **local** data regardless of `VITE_BACKEND_PROVIDER`.

## Required environment variables (MSAL + API)

| Variable | Description |
|----------|-------------|
| `VITE_AUTH_PROVIDER` | Set to `msal` for Microsoft login |
| `VITE_BACKEND_PROVIDER` | Set to `api` for GRADERA API |
| `VITE_AZURE_TENANT_ID` | Entra directory (tenant) ID |
| `VITE_AZURE_CLIENT_ID` | SPA app registration client ID |
| `VITE_API_SCOPE` | API delegated scope, e.g. `api://<api-client-id>/access_as_user` |
| `VITE_API_BASE_URL` | API base URL, e.g. `http://localhost:8080/api` |
| `VITE_DEV_AUTH_BYPASS` | Must be `false` in production |
| `VITE_DEV_DATA_BYPASS` | Must be `false` in production |

See also [`authentication.md`](./authentication.md) for Entra app registration on the API side.

## MSAL flow

```
User clicks "Sign in with Microsoft"
        ↓
MSAL loginRedirect (scope = VITE_API_SCOPE)
        ↓
Entra ID authenticates user
        ↓
Redirect back to SPA origin
        ↓
handleRedirectPromise + setActiveAccount
        ↓
acquireTokenSilent (popup/redirect fallback)
        ↓
GET /api/users/me with Authorization: Bearer
        ↓
AuthContext stores app user + role from API
```

Token acquisition: `apps/web/src/auth/tokenProvider.js`  
HTTP client: `apps/web/src/services/apiClient.js`

MSAL cache: `sessionStorage` (see `apps/web/src/auth/msalConfig.js`).

## Role resolution

1. MSAL proves identity (Entra `oid`, email).
2. API maps identity to PostgreSQL user and returns `{ id, email, full_name, role, roles }`.
3. `AuthContext` and `permissionGuard` use the API role for UI gating.
4. Server-side RBAC on the API remains authoritative.

## HTTP error handling

| Status | Frontend behavior |
|--------|-------------------|
| **401** | `ApiClientError` type `unauthorized` — session expired; user prompted to sign in again |
| **403** (unprovisioned) | `not_provisioned` — shows *User is not provisioned in GRADERA Innovation Hub.* |
| **403** (RBAC) | `forbidden` — toast with API message |
| **Network** | `network` — toast indicating API unreachable |

Normalized errors include a `toastMessage` property for UI toasts.

## Local bypass mode

```bash
VITE_DEV_AUTH_BYPASS=true
VITE_DEV_DATA_BYPASS=true
```

- Auth: seeded dev user from `devUser.js` (no MSAL, no BASE44)
- Data: `localStorage` demo store (`devDataStore.js`)
- Login page shows **Continue as dev user**

## Legacy BASE44 fallback

When `VITE_AUTH_PROVIDER` and bypass flags are unset/default:

- Auth uses `@base44/sdk` (Google, email/password)
- Data uses Base44 entities

BASE44 code remains in the codebase for migration compatibility.

## Local API integration testing

Three supported local configurations. See also [`docs/security/frontend-msal.md`](../../docs/security/frontend-msal.md) and [`docs/api-service-coverage.md`](./docs/api-service-coverage.md).

### Mode A — Local frontend + local data (offline pilot)

```bash
VITE_AUTH_PROVIDER=local
VITE_BACKEND_PROVIDER=local
VITE_DEV_AUTH_BYPASS=true
VITE_DEV_DATA_BYPASS=true
```

No API required. Demo data in `localStorage`.

### Mode B — Local frontend + local API (no MSAL)

**Frontend (`apps/web/.env.local`):**

```bash
VITE_AUTH_PROVIDER=local
VITE_BACKEND_PROVIDER=api
VITE_DEV_AUTH_BYPASS=true
VITE_DEV_DATA_BYPASS=false
VITE_API_BASE_URL=http://localhost:8080/api
```

**API (`apps/api/.env`):**

```bash
DEV_AUTH_BYPASS=true
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/gradera_innovation_hub?schema=public
```

```bash
# Terminal 1
pnpm --filter gradera-api db:migrate && pnpm --filter gradera-api db:seed
pnpm --filter gradera-api dev

# Terminal 2
pnpm --filter gradera-innovation-hub dev

# Terminal 3 — smoke check (no Bearer token)
pnpm --filter gradera-innovation-hub check:api
```

### Mode C — Local frontend + local API + MSAL

**Frontend:**

```bash
VITE_AUTH_PROVIDER=msal
VITE_BACKEND_PROVIDER=api
VITE_DEV_AUTH_BYPASS=false
VITE_DEV_DATA_BYPASS=false
VITE_AZURE_TENANT_ID=<tenant>
VITE_AZURE_CLIENT_ID=<spa-client-id>
VITE_API_SCOPE=api://<api-client-id>/access_as_user
VITE_API_BASE_URL=http://localhost:8080/api
```

**API:**

```bash
DEV_AUTH_BYPASS=false
AZURE_TENANT_ID=<tenant>
JWT_AUDIENCE=api://<api-client-id>
DATABASE_URL=...
```

Register SPA redirect URI `http://localhost:5173` in Entra.

## Local API integration testing (MSAL-only quick start)

Test against a running `gradera-api` instance:

```bash
# Terminal 1 — API with dev bypass (optional for token-less testing)
cd apps/api && DEV_AUTH_BYPASS=true pnpm dev

# Terminal 2 — Frontend
cd apps/web
# .env.local:
#   VITE_AUTH_PROVIDER=msal
#   VITE_BACKEND_PROVIDER=api
#   VITE_DEV_AUTH_BYPASS=false
#   VITE_DEV_DATA_BYPASS=false
#   VITE_AZURE_TENANT_ID=...
#   VITE_AZURE_CLIENT_ID=...
#   VITE_API_SCOPE=api://.../access_as_user
#   VITE_API_BASE_URL=http://localhost:8080/api
pnpm dev
```

Ensure the SPA redirect URI is registered in Entra (`http://localhost:5173`).

## Key source files

| File | Purpose |
|------|---------|
| `src/lib/authMode.js` | Auth provider resolution |
| `src/services/backendMode.js` | Data backend resolution |
| `src/auth/msalConfig.js` | MSAL + API env config |
| `src/auth/MsalProviderWrapper.jsx` | Conditional `MsalProvider` |
| `src/lib/AuthContext.jsx` | Session state, `/users/me` |
| `src/services/apiClient.js` | Bearer fetch wrapper |
| `src/services/*Service.js` | API / local / BASE44 branching |
| `src/services/reviewsService.js` | Executive review records (API GET/POST) |
| `pnpm check:api` | Local API smoke script (Mode B) |

## Not implemented yet

- File upload via API (Azure Blob)
- Azure Static Web Apps deployment
- Entra group-based roles (intentionally excluded)
