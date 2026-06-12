# Testing Notes — Innovation Hub

No test runner is configured in `apps/web` today. When adding Vitest (recommended alongside Vite), prioritize these regression cases for `src/domain/ideaWorkflow.js`.

## Setup recommendation

```bash
pnpm add -D vitest --filter gradera-innovation-hub
```

Add to `package.json` scripts: `"test": "vitest run"`.

Place tests at `src/domain/ideaWorkflow.test.js`.

## `ideaWorkflow` transition graph

| From | Allowed targets |
|------|-----------------|
| `ideas` | `in_progress`, `blocked`, `rejected` |
| `in_progress` | `ready_for_demo`, `blocked`, `rejected` |
| `ready_for_demo` | `approved`, `blocked`, `rejected` |
| `blocked` | `in_progress` |
| `approved` | _(none — terminal)_ |
| `rejected` | `ideas` |

### Cases to assert

1. **Storage alias** — `ready_4_demo` normalizes to `ready_for_demo`; `toStorageStatus('ready_for_demo')` returns `ready_4_demo`.
2. **Rejected → ideas reopen** — `canTransition('rejected', 'ideas')` is `true`; `validateTransition('rejected', 'ideas', {})` is valid (no extra fields).
3. **Approved is terminal** — `canTransition('approved', 'in_progress')` is `false`; `validateTransition` returns a message containing "final".
4. **Invalid transitions** — e.g. `ideas` → `approved` fails with a clear message.

## Required field validation

Use `validateTransition(from, to, context)` and expect `{ valid: false, message }` with the messages below.

### Blocked

- `in_progress` → `blocked` without `blocker_reason` → fails.
- Whitespace-only `blocker_reason` → fails.
- Non-empty trimmed `blocker_reason` → passes (if transition is otherwise allowed).

### Rejected

- `ideas` → `rejected` without `rejection_reason` → fails.
- Whitespace-only `rejection_reason` → fails.
- Non-empty trimmed `rejection_reason` → passes.

### Ready for Demo

- `in_progress` → `ready_for_demo` without `prototype_url` → fails.
- Whitespace-only `prototype_url` → fails.
- Invalid URL (e.g. `not-a-url`) → fails with URL format message.
- Valid `https://example.com` → passes.

### Approved

- `ready_for_demo` → `approved` without `demo_notes` or `decision_notes` → fails.
- Either non-empty `demo_notes` or `decision_notes` → passes.

## Helpers to test

- `hasTrimmedValue` — false for `null`, `''`, `'   '`; true for `'x'`.
- `isValidHttpUrl` — true for `http://` and `https://`; false for `ftp://`, relative paths, empty strings.
- `trimWorkflowContext` — trims `blocker_reason`, `rejection_reason`, `prototype_url`, `demo_notes`, `decision_notes`.

## Integration smoke (manual)

After workflow changes:

1. Kanban drag to **Blocked** without blocker reason → toast with blocker message.
2. Kanban drag to **Ready 4 Demo** without URL → toast; with invalid URL → format error.
3. Executive Review **Reject** without reason → toast; with reason → succeeds.
4. Executive Review **Approve** without demo/decision notes → toast; with notes → `decision_notes` persisted on idea and in status history metadata.
5. Rejected Archive sorted by `-updated_date` does not overwrite Kanban cache (different React Query keys).

## React Query keys

- Kanban / Dashboard / Review: `queryKeys.ideas.list()` → `['ideas', 'list', { sort: '-created_date', limit: 500 }]`
- Rejected Archive: `queryKeys.ideas.list({ sort: '-updated_date' })`
- Mutations call `invalidateIdeas(queryClient)` → invalidates all `['ideas']` queries.
