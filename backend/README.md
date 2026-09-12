# Sonex Reports — Backend

Standalone Express API + SQL Server backend for the frontend in `..`/`src`.
No Base44 account, CLI, or platform dependency — this is a normal Node app
you run and deploy yourself.

## What it does

- **Auth**: logs in directly against your REAL, existing ERP login table
  (`USER_CODE` / `USER_PASSWORD` / `ROLE_CODE` / `ACTIVE` — same table your
  desktop ERP app already uses; see `SQL_USERS_TABLE` in `.env`, default
  `admin.USERS`). This backend only ever `SELECT`s from that table — it
  never creates, edits, or deletes an ERP account. There is no
  self-registration, no email OTP, and no "Continue with Google": that
  table has no email column, so those flows would have nothing real to work
  against and are intentionally disabled (with a clear message) rather than
  faked.
- **RBAC (coarse)**: whoever's `USER_CODE` is listed in `ADMIN_USER_CODES`
  (`.env`, default `ADMIN`) gets full admin access — every menu, plus
  `/users` and `/roles`. `middleware/auth.js` computes this fresh from the
  database on every request; `requireRole("admin")` enforces it on the
  backend, not just in the frontend UI.
- **RBAC (fine-grained, Menu-Based)**: `admin.APP_MENUS` is the Menu Master
  (a self-referencing tree — Account → Accounting → General Ledger, etc.),
  `admin.APP_ROLES` is a real roles table, `admin.APP_ROLE_MENU_PERMISSIONS`
  is the join between them, and `admin.APP_USER_ROLE_MAP` bridges a real
  `USER_CODE` to one of those roles (kept as its own table, not a column on
  your ERP's `USERS` table, so assigning a role never requires altering ERP
  data). A user's sidebar (`GET /api/menus/my`) and every report request
  (`POST /api/functions/runReport`) are authorized from their assigned
  role's granted menus — see `db/menusRepo.js`, `db/rolesRepo.js`,
  `db/roleMenuPermissionsRepo.js`, `db/userRoleMapRepo.js`,
  `routes/menus.routes.js`, `routes/roles.routes.js`. Admins implicitly
  see/reach everything, same as every other access check in this app.
- **Reports**: `routes/functions.routes.js` runs the same parameterized SQL
  against your ERP tables (`admin.CHART`, `admin.VOUCHER`,
  `admin.SALE_INVOICE_HEADER`, etc.) that the original app used — see
  `shared/reportQueries.js` and `shared/dashboardQueries.js`.
- **Dashboard caching** and **weekly summary email** are ported over,
  adjusted for the fact that the login table has no email column (see
  "Weekly summary email" below).

## Setup

```bash
cd backend
npm install
cp .env.example .env
# edit .env: SQL_SERVER_* connection details, SQL_USERS_TABLE (your real
# login table), ADMIN_USER_CODES, JWT_SECRET (openssl rand -hex 32), etc.
# (a ready-to-use backend/.env is already included in this delivery, pointed
#  at the SQL Server connection and admin.USERS table you provided)
npm run migrate   # verifies SQL_USERS_TABLE has the columns login needs
                   # (never creates/alters it), and creates+seeds this app's
                   # own tables (admin.APP_ROLES, admin.APP_MENUS, etc.) if
                   # they don't exist yet. Safe to re-run any time — every
                   # step upserts, nothing is dropped or duplicated, and
                   # your ERP data is never touched.
npm run dev        # starts on http://localhost:4000 (auto-restarts on save)
```

Verify the database connection actually works before moving on:

```bash
curl http://localhost:4000/api/health/db
# {"ok":true,"connected":true,"db":"SonexDB","server_name":"DESKTOP-SJJS8GS\\SQL2019"}
```

A non-200 response includes the real driver error (bad credentials, wrong
host/instance/port, firewall, etc.) instead of a generic failure — fix
`SQL_SERVER_*` in `.env` and re-run `npm run dev` until this returns `ok:true`
before doing anything else.

Then point the frontend at it — in the project root, create `.env.local`
(already included in this delivery):

```bash
VITE_API_BASE_URL=http://localhost:4000/api
```

and run `npm install && npm run dev` in the project root as usual. Without
`VITE_API_BASE_URL` set, the frontend falls back to the original in-browser
demo mode (fake data, no backend needed) — that fallback is unchanged and
only used when this variable is absent; with it set, every page (dashboard,
reports, User Access, Role Management) reads and writes the real database,
and login goes against your real ERP users table.

## Logging in

Use any existing ERP username/password from your `SQL_USERS_TABLE` — e.g.
`ADMIN` / `ADMIN` if that row hasn't been changed. Whoever's `USER_CODE` is
listed in `ADMIN_USER_CODES` (comma-separated, case-insensitive; defaults to
just `ADMIN`) gets full admin access automatically. Add more codes to that
list (no code changes needed) to make other existing ERP accounts admins too.
Everyone else starts with **no menu access** until an admin assigns them a
role from `/users` — see below.

## Menu-Based Role Access Control — how it fits together

```
admin.USERS (your real ERP table, read-only)
      |  USER_CODE
      v
admin.APP_USER_ROLE_MAP  -->  admin.APP_ROLES  -->  admin.APP_ROLE_MENU_PERMISSIONS  -->  admin.APP_MENUS (tree)
```

- **Menu Master** (`admin.APP_MENUS`): every sidebar entry, seeded by
  `db/menuSeedData.js` on `npm run migrate` — Account → Accounting → General
  Ledger/Trial Balance/Accounts Receivable/Accounts Payable/Customer Aging/
  Vendor Aging; Sales → its 4 reports; Purchases → its 2 reports;
  Administration → User Access, Role Management.
- **Roles** (`admin.APP_ROLES`): "Administrator" and "Standard User" are
  seeded automatically; create as many custom roles as you like from
  `/roles`.
- **Role ↔ Menu permissions** (`admin.APP_ROLE_MENU_PERMISSIONS`): what
  `/roles` writes when you tick/untick a report for a role. Granting a leaf
  report is enough — its parent groups are resolved and shown automatically,
  you don't need to separately grant "Accounting" to see "General Ledger"
  under it.
- **User → Role** (`admin.APP_USER_ROLE_MAP`): set from the "Role" dropdown
  on `/users`, keyed by the real `USER_CODE`. From that moment the user's
  sidebar (`GET /api/menus/my`) and every report call are authorized from
  that role — no per-user report list anywhere anymore, and your ERP
  `admin.USERS` table is never written to.
- **Enforcement**: hiding a menu item in the sidebar is never the only
  thing stopping access — `POST /api/functions/runReport` independently
  checks the caller's role-granted menu keys server-side and returns
  `403 Forbidden` (same shape as every other authorization failure in this
  app) for anything not granted, even if the request is sent directly
  (e.g. via curl/Postman) with a valid, still-logged-in session token.

### Quick manual test

1. `npm run migrate`, then start both backend and frontend.
2. Log in as `ADMIN` (or whichever `USER_CODE` is your real admin password) →
   full admin, sees every menu.
3. As admin, go to `/roles`, create a role (e.g. "Sales Viewer"), grant it
   only "Items Wise Sale" and "Customer Wise Sale", save.
4. Go to `/users`, pick a non-admin ERP account (e.g. `MOHSIN`), assign it
   the "Sales Viewer" role from the dropdown.
5. Log in as that user (their existing ERP password) — the sidebar shows
   only Sales → Items Wise Sale / Customer Wise Sale (no Accounting/
   Purchases/Administration).
6. Try opening `/reports/general_ledger` directly by URL, or calling
   `POST /api/functions/runReport` with `report: "general_ledger"` using
   that user's token — both are blocked (page shows "no access", API
   returns 403) even though the session is valid.
7. Back in `/roles`, grant "Sales Viewer" the "General Ledger" report too,
   save, then refresh the other user's browser tab — General Ledger (and
   its parents "Accounting"/"Account") now appear in their sidebar and the
   report opens, with no re-login required.

## Weekly summary email

`POST /api/weekly-summary-email` — previous week's sales/purchases per
company, emailed to whoever is listed in `WEEKLY_SUMMARY_RECIPIENTS` in
`.env` (comma-separated addresses; your login table has no email column, so
recipients can't be derived from it automatically — list them explicitly).
Trigger it either:

- as a signed-in admin (`curl` with a Bearer token), or
- from an external scheduler (cron, Windows Task Scheduler, cron-job.org)
  hitting `POST /api/weekly-summary-email?token=<WEEKLY_SUMMARY_TOKEN>` on a
  schedule — set `WEEKLY_SUMMARY_TOKEN` in `.env` first.

If `SMTP_HOST` is left blank, the email is printed to the server console
instead of actually being sent — handy for local testing.

## Project layout

```
backend/
  server.js              Express app + route mounting, GET /api/health/db
  db/
    pool.js                SQL Server connection pool (mssql)
    tables.js               Table names, read from env
    migrate.js               Verifies the real USERS table, creates/seeds
                             this app's own tables (never touches USERS)
    menuSeedData.js          Canonical menu tree used to seed admin.APP_MENUS
    usersRepo.js             Reads the real ERP login table (read-only)
    userRoleMapRepo.js        USER_CODE <-> RBAC role bridge table
    reportAccessRepo.js, dashboardCacheRepo.js
    menusRepo.js, rolesRepo.js, roleMenuPermissionsRepo.js   Menu-Based RBAC
  middleware/auth.js       requireAuth / requireRole / requireMenu (the real RBAC gate)
  routes/                  auth (login/me only), users, report-access,
                           functions, weekly summary, menus (Menu Master +
                           /my), roles (Role + permissions)
  shared/                  reportQueries.js, dashboardQueries.js — the actual
                           SQL for every report + the dashboard KPIs
  utils/                   JWT helper, mailer (weekly summary only)
  sql/schema.sql           Reference DDL (migrate.js does this for you already)
```
