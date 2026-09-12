# Sonex Reports

A React (Vite) reporting/dashboard frontend backed by a standalone Express +
SQL Server API. No third-party platform account needed — everything here
runs on infrastructure you control.

## Run Locally

### Option A — Demo Mode (no backend needed)

```bash
npm install
npm run dev
```

Open the local URL Vite prints (usually `http://localhost:5173`). If
`VITE_API_BASE_URL` is not set, the app automatically uses a local,
in-browser **mock backend** (`src/api/mockBackend.js`) with fake companies,
invoices, users, and reports — no backend or SQL Server connection required.

- **Log in with any username** (or `admin`/`viewer` — see below) and any
  password.
- Any username signs you in as a new demo **admin** account automatically.
  There's one exception on purpose: `viewer` logs in as a restricted demo
  user, to show what limited report access looks like.
- Data is stored in your browser's `localStorage` (key `demo_backend_state_v1`), so it persists across refreshes. Clear that key in dev tools to reset the demo data.

### Option B — Real Backend (your SQL Server data)

1. Set up the backend — see **[`backend/README.md`](./backend/README.md)** for full steps (install, `.env`, migrate, run).
2. In this project's root, create `.env.local`:
   ```bash
   VITE_API_BASE_URL=http://localhost:4000/api
   ```
3. `npm install && npm run dev` as usual.
4. Log in with a real username/password from your ERP's login table (e.g.
   `ADMIN` / whatever `USER_PASSWORD` is set on that row).

Every page — Dashboard, all reports, User Management, filters, exports —
now reads and writes through the real API and your SQL Server database.
Nothing about the UI, routes, or components changed between the two modes;
only what's underneath `src/api/base44Client.js` (`db`) does.

## Authentication

This app logs in directly against your **real, existing ERP login table**
(`USER_CODE` / `USER_PASSWORD`, default `admin.USERS`) — the same one your
desktop ERP application already uses. There is no self-registration, no
email verification, and no "Continue with Google": that table has no email
column, so this backend never creates or edits an account there — accounts
are still managed the same way they always were. See "Logging in" in
`backend/README.md`.

## Role-Based Access Control

This app uses two layers of RBAC, both enforced in the database and the
backend (never just in the UI):

1. **Coarse role** — whoever's `USER_CODE` is listed in `ADMIN_USER_CODES`
   (backend `.env`) gets full admin access. Admins implicitly reach
   everything; `requireRole("admin")` in `backend/middleware/auth.js` gates
   admin-only routes (`/api/users/*`, `/api/roles/*`, menu-management
   writes on `/api/menus/*`), independently re-checked from the database on
   every request.
2. **Menu-Based RBAC (fine-grained)** — the full sidebar/report menu tree is
   stored in the database (`admin.APP_MENUS`, self-referencing parent/
   child), roles are real database records (`admin.APP_ROLES`), and what a
   role can see is a normalized join table
   (`admin.APP_ROLE_MENU_PERMISSIONS`) — never a plain-text list on a user
   row. A separate bridge table (`admin.APP_USER_ROLE_MAP`) maps a real ERP
   `USER_CODE` to one of those roles, so assigning a role from `/users`
   never requires altering your ERP's own `USERS` table. From the moment an
   admin assigns a role, that user's sidebar (`GET /api/menus/my`) and every
   report request are authorized from that role's granted menus. Manage
   roles and their permissions from `/roles` (admin-only).

Frontend enforcement mirrors this: `src/hooks/useMenus.js` fetches the
permitted tree and renders only those menus (parents appear only when they
have a visible child); `src/hooks/useReportAccess.js` and
`src/components/AdminRoute.jsx` gate pages and route-level access the same
way. But hiding a menu item is never the only protection — the backend
independently re-checks on every `POST /api/functions/runReport` call and
returns `403 Forbidden` for anything not granted to the caller's role, even
with a valid, still-authenticated session and even if the request is sent
directly instead of through the UI.

See `backend/README.md` for a step-by-step manual test of the whole
role → permissions → sidebar → API-enforcement flow.

Company-level data scoping (`allowed_companies`, independent of menus) is
unchanged from before and still lives on `admin.APP_REPORT_ACCESS`, set from
the same `/users` page.

## Project layout

```
src/
  api/
    base44Client.js   Picks the real API client or the demo mock (`db`)
    apiClient.js       Real backend HTTP client (now incl. menus/roles)
    mockBackend.js     In-browser demo-mode data, incl. a mirror of the
                       Menu-Based RBAC tables so demo mode still works
  hooks/
    useMenus.js         Fetches the caller's permitted menu tree (GET /api/menus/my)
    useReportAccess.js  Report/company access; report access now sourced from useMenus
  pages/
    RoleManagement.jsx  Admin: create roles, grant/revoke menu permissions
    UserManagement.jsx  Admin: assign a role and allowed companies to each
                        real ERP account (read-only account list)
  components/, lib/     Original app structure, unchanged
backend/               Standalone Express + SQL Server API (see its README)
shared/, entities/, functions/, base44/
                        Legacy Base44-platform config, no longer used by the
                        app (kept in place, not deleted) — see note below.
```

### About the `shared/`, `entities/`, `functions/`, `base44/` folders

These were written for the Base44 platform's own hosted runtime (Deno-style
imports, `base44:runtime` secrets, entity-level RLS config) and can't run
outside it. The app no longer depends on them — `backend/` is the real,
running equivalent (the SQL logic in `shared/reportQueries.ts` and
`shared/dashboardQueries.ts` was ported into `backend/shared/*.js` verbatim).
They're left in the repo rather than deleted; delete them whenever you're
comfortable that you no longer need them for reference.
