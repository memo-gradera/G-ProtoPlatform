# Innovation Hub — Pilot Demo Script

Use this script for a **15–20 minute** internal walkthrough. Have at least three user accounts available (or change roles in Admin Settings between sections).

**Suggested roles:** Innovation Lead (primary), Developer, Executive Reviewer, Admin (for settings/archive).

---

## Before you start

1. Run the app locally (`pnpm dev` from `apps/web`).
2. Seed pilot data: `pnpm seed:pilot` (requires `.env.local` and optional `BASE44_ACCESS_TOKEN`).
3. Assign roles in **Admin Settings** for demo accounts.
4. Sign in as **Innovation Lead** to begin.

---

## 1. Dashboard overview (2 min)

**Route:** `/`

- Point out KPI cards: total ideas, in progress, ready for demo, approved, rejected, blocked.
- Highlight **SecuPHI**, **TestPHI**, **ProductPHI**, and **CodePHI** sample ideas in charts.
- Mention cycle time and approval rate are computed from pipeline data.

**Talking point:** Single pane for innovation portfolio health before diving into execution.

---

## 2. Create an idea (2 min)

**Route:** `/kanban`

- Click **New Idea**.
- Create a lightweight idea (e.g. “SecuPHI Session Timeout Guard”).
- Fill solution name, short description, owner, and blueprint fields.
- Save — idea appears in **Ideas** column.

**Talking point:** Blueprint fields capture enough context for prototype planning and exec review.

---

## 3. Move idea to In Progress (1 min)

- Open the new idea or drag it to **In Progress**.
- Show drawer fields for owner, priority, and blueprint.

**Talking point:** All status changes go through validated transitions (visible in history later).

---

## 4. Show blocked validation (2 min)

- Drag an idea toward **Blocked** (or change status in drawer) **without** a blocker reason.
- Show validation error toast.
- Add a blocker reason, retry — transition succeeds.

**Demo seed reference:** **TestPHI Coverage Radar** is already blocked with a sample reason.

---

## 5. Attach prototype URL (1 min)

- Open **CodePHI Safe Refactor Assistant** (in progress) or your demo idea.
- Enter a valid URL: `https://demo.example.com/my-prototype`
- Save.

**Talking point:** Required before moving to Ready 4 Demo.

---

## 6. Move to Ready 4 Demo (1 min)

- Drag to **Ready 4 Demo** (must have valid `https://` prototype URL).
- Show invalid URL rejection if time permits.

**Demo seed reference:** **TestPHI Regression Hub** is already in Ready 4 Demo.

---

## 7. Executive Review — approve / reject (3 min)

**Route:** `/review`  
**Sign in as:** Executive Reviewer (or Innovation Lead)

- Open **Pending Review** tab — show **TestPHI Regression Hub**.
- **Approve** an idea (requires demo/decision notes on seeded **ProductPHI Roadmap Lens** if approving live).
- **Reject** with a required reason on a pending item.
- Show **Needs Revision** returning an idea to In Progress (Innovation Lead role).

**Demo seed reference:** **ProductPHI Roadmap Lens** (approved), **ProductPHI Vendor Compare** (rejected).

---

## 8. Status history timeline (2 min)

**Route:** `/kanban`

- Open **TestPHI Regression Hub** or **ProductPHI Roadmap Lens** in the detail drawer.
- Scroll to **Status History** — show transitions, actor, timestamp, reason, metadata.

**Talking point:** Audit trail for compliance and retrospective reviews.

---

## 9. Prototype Catalog (2 min)

**Route:** `/prototypes`

- Browse seeded prototypes (SecuPHI, TestPHI, ProductPHI, CodePHI).
- Filter by status; open one to edit (role permitting).
- Note link to related idea where present.

---

## 10. Rejected Archive — reopen (2 min)

**Route:** `/rejected`  
**Sign in as:** Innovation Lead or Admin

- Show **ProductPHI Vendor Compare** with rejection reason.
- **Reopen** to Ideas column (clears rejection, returns to pipeline).
- Mention only roles with reopen permission can perform this action.

---

## Close (1 min)

- Recap: intake → build → demo → exec decision → catalog + archive.
- Point to `PILOT_LIMITATIONS.md` for honest scope boundaries.
- Collect feedback on workflow friction and missing integrations.

---

## Quick role cheat sheet

| Role | Use in demo |
|------|-------------|
| Innovation Lead | Create ideas, move pipeline, reopen rejected |
| Developer | Edit/drag **owned** ideas only (`Dev Owner` seeded ideas) |
| Executive Reviewer | Approve/reject Ready 4 Demo items |
| Viewer | Read-only tour of dashboard and kanban |
| Admin | User role management, full access |
