# GRADERA Innovation Hub — Web App

**GRADERA Innovation Hub** is the internal Rapid Prototype Development platform for managing ideas, prototypes, and executive review workflows.

**About**

This project contains everything you need to run the Innovation Hub locally.

**Prerequisites:** 

1. Clone the repository using the project's Git URL 
2. Navigate to the project directory
3. Install dependencies: `npm install`
4. Create an `.env.local` file and set the right environment variables

```
VITE_BASE44_APP_ID=your_app_id
VITE_BASE44_APP_BASE_URL=your_backend_url

e.g.
VITE_BASE44_APP_ID=cbef744a8545c389ef439ea6
VITE_BASE44_APP_BASE_URL=https://my-to-do-list-81bfaad7.base44.app
```

Run the app: `npm run dev`

## Local Development Authentication Bypass

Skip backend login during local development by adding to `.env.local`:

```
VITE_DEV_AUTH_BYPASS=true
```

When enabled:

- The app auto-authenticates as a mock user (`memo@local.dev`, default role **admin**).
- No `base44.auth.me()` call or login redirect on startup.
- **DEV MODE** badge appears in the app header with a role switcher.
- Roles are stored in `localStorage` (`innovation_hub_dev_role`): `admin`, `innovation_lead`, `developer`, `executive_reviewer`, `viewer`.
- **Sign out** clears local session only (no backend logout). Use **Continue as dev user** on the login page to sign back in.

**Important:** Leave this unset or `false` in production. When only auth bypass is enabled, entity API calls still use the configured backend.

## Local Development Full Bypass

Run entirely offline with local demo data in `localStorage`:

```
VITE_DEV_AUTH_BYPASS=true
VITE_DEV_DATA_BYPASS=true
```

When `VITE_DEV_DATA_BYPASS=true`:

- All services (`ideas`, `prototypes`, `users`, status history, file uploads) use **`src/lib/devDataStore.js`** instead of the remote backend.
- Initial data loads from `demo/pilotSeedData.js` and persists under `innovation_hub_dev_data`.
- Dashboard KPIs and charts work from local data.
- Screenshot uploads return a local **data URL** (no remote upload).
- Use **Reset Demo Data** in the DEV MODE banner to restore the seed dataset.

Restart `pnpm dev` after changing env flags.

## Local integration modes (summary)

| Mode | Auth | Backend | Use case |
|------|------|---------|----------|
| **A** | `local` + `DEV_AUTH_BYPASS` | `local` + `DEV_DATA_BYPASS` | Offline pilot |
| **B** | `local` + `DEV_AUTH_BYPASS` | `api` | Frontend against local `gradera-api` without MSAL |
| **C** | `msal` | `api` | Production-like Entra + API |

Run API smoke checks (Mode B): `pnpm check:api` (requires running API with `DEV_AUTH_BYPASS=true`).

See [`docs/security/frontend-msal.md`](../../docs/security/frontend-msal.md) and [`docs/api-service-coverage.md`](./docs/api-service-coverage.md).

## Running the Innovation Hub Pilot

### Run locally

```bash
cd apps/web
pnpm install
cp .env.example .env.local   # then set backend variables (see below)
pnpm dev
```

Open [http://localhost:5173](http://localhost:5173).

Required environment variables in `.env.local`:

```
VITE_BASE44_APP_ID=your_app_id
VITE_BASE44_APP_BASE_URL=https://your-app.base44.app
```

Optional for seeding: `BASE44_ACCESS_TOKEN` (copy from browser after login).

### Seed demo data

```bash
cd apps/web
pnpm seed:pilot
```

Loads sample **SecuPHI**, **TestPHI**, **ProductPHI**, and **CodePHI** ideas (all pipeline statuses), prototypes, and sample status history. Safe to re-run — skips records that already exist.

### Login

- Register or sign in with your account (email/password or Google OAuth on the login page).
- First-time users default to **viewer** until an admin assigns a role in **Admin Settings** (`/settings`).

### Role behavior (pilot)

| Role | Capabilities |
|------|----------------|
| **Admin** | Full access; manage user roles |
| **Innovation Lead** | Create/move ideas, prototypes, exec review, reopen rejected |
| **Developer** | Edit and drag **owned** ideas; limited transition targets |
| **Executive Reviewer** | Approve/reject Ready 4 Demo ideas; view catalog |
| **Viewer** | Read-only dashboard, kanban, and catalog |

Assign roles in **Admin Settings** before a multi-role demo. For developer ownership demos, set idea owner to match the developer’s email or use seeded **Dev Owner** ideas.

### Demo flow

Follow step-by-step instructions in [`DEMO_SCRIPT.md`](./DEMO_SCRIPT.md).

### Limitations

See [`PILOT_LIMITATIONS.md`](./PILOT_LIMITATIONS.md) — client-side RBAC, remote backend dependency, no notifications, internal-only pilot.
