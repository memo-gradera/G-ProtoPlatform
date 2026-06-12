# GRADERA Web — API Service Coverage

Each frontend service supports **local** (dev data bypass), **api** (GRADERA API), and **base44** (legacy pilot) modes unless noted.

| Service | Local | API | BASE44 | Notes |
|---------|-------|-----|--------|-------|
| `ideasService` | ✅ devDataStore | ✅ CRUD + transition | ✅ Idea entity | Status mapped `ready_4_demo` ↔ `ready_for_demo` |
| `prototypesService` | ✅ devDataStore | ✅ CRUD + publish/archive | ✅ Prototype entity | Status mapped `demo_ready` ↔ `published` |
| `usersService` | ✅ devDataStore | ✅ me/list/updateRole | ✅ User entity | MSAL auth uses `/users/me` via AuthContext |
| `dashboardService` | ✅ composes services | ✅ `/dashboard/kpis` | ✅ composes services | Rejection reasons derived from ideas list |
| `ideaStatusHistoryService` | ✅ devDataStore | ✅ `/ideas/:id/status-history` | ✅ IdeaStatusHistory entity | `recordTransition` skipped in API mode (server writes history) |
| `reviewsService` | ✅ devDataStore | ✅ GET/POST `/reviews` | ❌ not in pilot | Executive UI still uses `ideasService.transitionStatus` |
| `filesService` | ✅ data URL | ⚠️ probe only | ✅ Base44 upload | API upload not implemented — `FileUploadUnavailableError` |

Mode resolution: `src/services/backendMode.js` (`VITE_DEV_DATA_BYPASS` forces local).

Smoke check: `pnpm check:api` (requires `VITE_API_BASE_URL`, API `DEV_AUTH_BYPASS=true` for token-less runs).
