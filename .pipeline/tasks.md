# Pipeline Task Decomposition

## Summary
ToolShare is a greenfield full-stack TypeScript app: a React 18 + Vite SPA (React Router 6) served by an Express + Prisma (PostgreSQL) API with JWT auth. It manages a tool catalog with derived availability, admin-created loans (with returns), user reservations (FIFO next-in-line), and an overdue dashboard. Auth is `full_auth`: signup/login/logout with the first signup becoming ADMIN and subsequent users USER. The whole thing ships as a single multi-stage Docker image that serves the API and static SPA, running `prisma migrate deploy` + seed on start.

## Surface contract

### Public routes (no auth)
- `GET /api/health`, `GET /api/health/deep`
- `POST /api/auth/signup`, `POST /api/auth/login`
- Client pages: `/login`, `/signup`

### Authenticated API routes
- `GET /api/auth/me`, `POST /api/auth/logout`
- `GET /api/tools` (query: `q`, `category`, `status`; returns derived availability + next-in-line reservation)
- `POST /api/tools`, `PATCH /api/tools/:id`, `DELETE /api/tools/:id` (admin only)
- `GET /api/loans` (query: `status=active|overdue|returned`)
- `POST /api/loans` (admin), `POST /api/loans/:id/return` (admin)
- `GET /api/reservations`, `POST /api/reservations` (USER reserves an on-loan tool)
- `GET /api/dashboard/overdue` (tool, borrower, dueDate, daysOverdue)
- `GET /api/admin/settings` (admin), `PATCH /api/admin/settings` (admin)

### Client pages (authenticated app, Shell header shows "ToolShare" on every page)
- `/dashboard` — Overdue section
- `/tools` — catalog with search/filter via query params: `?q=&category=&status=`, `?modal=new-tool|edit-tool&id=`, `?panel=<id>` detail panel
- `/loans` — list with `?modal=new-loan`, return action
- `/reservations` — list + reserve action
- `/admin/settings` — admin-only settings page

### Entities
- `User(id, email unique, passwordHash, role ADMIN|USER, createdAt)`
- `Tool(id, name, category Power|Hand|Garden|Measurement, condition New|Good|Fair|Worn, createdAt)`
- `Loan(id, toolId, borrowerName, borrowerUserId?, dueDate, returnedAt?, createdAt)`
- `Reservation(id, toolId, userId, status ACTIVE|FULFILLED|CANCELLED, createdAt)`
- `SystemSetting(key, value, updatedAt)`

### Derived (never stored)
- Tool availability: `available | on_loan | reserved` from open loan + active reservation.
- `daysOverdue` from `dueDate` when unreturned and past due.

## db_agent tasks
- [ ] Create `server/prisma/schema.prisma` with the Postgres datasource + Prisma client generator, and `DATABASE_URL` from env.
- [ ] Define `enum UserRole { ADMIN USER }` and `User` model: `id`, `email @unique`, `passwordHash`, `role UserRole @default(USER)`, `createdAt`.
- [ ] Define `enum ToolCategory { Power Hand Garden Measurement }`, `enum ToolCondition { New Good Fair Worn }`, and `Tool` model: `id`, `name`, `category`, `condition`, `createdAt`.
- [ ] Define `Loan` model: `id`, `toolId` (relation to Tool), `borrowerName String`, `borrowerUserId String?` (optional relation to User), `dueDate DateTime`, `returnedAt DateTime?`, `createdAt`.
- [ ] Define `enum ReservationStatus { ACTIVE FULFILLED CANCELLED }` and `Reservation` model: `id`, `toolId` (relation), `userId` (relation), `status @default(ACTIVE)`, `createdAt`; add a unique constraint to enforce a single ACTIVE reservation per user per tool (FIFO by `createdAt`).
- [ ] Add `SystemSetting` model — `key String @id`, `value String`, `updatedAt DateTime @updatedAt` (backs admin settings for `postgresql`/`minio` service config).
- [ ] Generate the initial Prisma migration for all models/enums so `prisma migrate deploy` works on container start.

## backend_agent tasks
- [ ] Create `server/src/prisma.ts` (Prisma client singleton) and `server/src/index.ts` (Express bootstrap, `cors`, JSON body parsing, mount all routers under `/api`, serve `client/dist` static SPA with catch-all to `index.html`).
- [ ] Create `server/src/auth/jwt.ts` (JWT sign/verify using `JWT_SECRET`) and `server/src/auth/middleware.ts` (`requireAuth`, `requireAdmin` guards).
- [ ] Create `server/src/routes/auth.ts` — `POST /api/auth/signup` (bcrypt hash; first user → ADMIN, subsequent → USER), `POST /api/auth/login` (verify + issue JWT), `GET /api/auth/me` (requireAuth), `POST /api/auth/logout`; validate bodies with `zod`.
- [ ] Create `server/src/lib/availability.ts` — derive tool status (`available|on_loan|reserved`) from open loan + active reservation, surface earliest ACTIVE reservation as next-in-line, and compute `daysOverdue`. Centralize so tools/loans/dashboard stay consistent.
- [ ] Create `server/src/routes/tools.ts` — `GET /api/tools` (requireAuth; `q` search, `category`/`status` filters; return derived availability + next-in-line) and admin `POST`/`PATCH /:id`/`DELETE /:id` (requireAdmin, zod-validated).
- [ ] Create `server/src/routes/loans.ts` — `GET /api/loans` (requireAuth; `status=active|overdue|returned` filter), `POST /api/loans` (requireAdmin; records `borrowerName` + `dueDate`, tool → on-loan), `POST /api/loans/:id/return` (requireAdmin; sets `returnedAt`, tool → available).
- [ ] Create `server/src/routes/reservations.ts` — `GET /api/reservations` (requireAuth), `POST /api/reservations` (requireAuth USER; reserve an on-loan tool → ACTIVE, enforce single ACTIVE per user per tool, FIFO ordering).
- [ ] Create `server/src/routes/dashboard.ts` — `GET /api/dashboard/overdue` (requireAuth; returns tool, borrower, dueDate, daysOverdue via availability helper) and `server/src/routes/health.ts` — `GET /api/health`, `GET /api/health/deep` (DB ping).
- [ ] Create `server/src/lib/config.ts` — `resolveConfig(key: string): string | null` reading `process.env[key]` first; if the value is absent or equals `PLACEHOLDER_CONFIGURE_IN_SETTINGS`, read the `SystemSetting` DB row; return null if neither is set.
- [ ] Create `server/src/routes/admin-settings.ts` — `GET /api/admin/settings` (requireAdmin; list `postgresql` and `minio` service keys with masked values + configured status) and `PATCH /api/admin/settings` (requireAdmin; upsert key/value pairs into `SystemSetting`).
- [ ] Create `server/prisma/seed.ts` — idempotent (upsert by email) demo ADMIN + USER (bcrypt-hashed) and sample tools; print one `SEED_CREDS_JSON {"admin":{...},"user":{...}}` line to stdout.
- [ ] Create `server/package.json` + `server/tsconfig.json` with deps (`express`, `@prisma/client`, `prisma`, `bcryptjs`, `jsonwebtoken`, `zod`, `cors`, `typescript`, `tsx`).

## ui_agent tasks
- [ ] Create client scaffold: `client/package.json`, `client/vite.config.ts` (dev proxy `/api` → server), `client/tsconfig.json`, `client/index.html`, `client/src/main.tsx`.
- [ ] Create `client/src/App.tsx` (React Router 6 with route nodes for all pages) and `client/src/components/Shell.tsx` (app shell header rendering "ToolShare" on every page; nav with admin section visible only to admins).
- [ ] Create `client/src/auth/AuthContext.tsx`, `client/src/auth/RequireAuth.tsx`, `client/src/auth/RequireAdmin.tsx` (route guards).
- [ ] Create `client/src/pages/LoginPage.tsx` (`/login`) and `client/src/pages/SignupPage.tsx` (`/signup`) as part of the main app; login redirects to `/dashboard`.
- [ ] Create `client/src/pages/DashboardPage.tsx` (`/dashboard`) with an "Overdue" section listing tool, borrower, due date, days overdue; include empty/loading/error states.
- [ ] Create `client/src/pages/ToolsPage.tsx` (`/tools`) — catalog showing name/category/condition/availability; search + `category`/`status` filters bound to `?q=&category=&status=`; admin add/edit modals via `?modal=new-tool|edit-tool&id=`; detail panel via `?panel=<id>`; all states URL-addressable.
- [ ] Create `client/src/pages/LoansPage.tsx` (`/loans`) — list with `status` filter, new-loan modal via `?modal=new-loan` (admin), and return action; and `client/src/pages/ReservationsPage.tsx` (`/reservations`) — list + reserve action, showing next-in-line.
- [ ] Create `client/src/pages/AdminSettingsPage.tsx` (`/admin/settings`, RequireAdmin) — list each service in `postgresql`/`minio` with a configured/unconfigured badge and a per-service credential form wired to `GET`/`PATCH /api/admin/settings`.

## service_agent tasks
- [ ] Create `client/src/api/client.ts` — fetch wrapper attaching JWT bearer from localStorage, JSON handling, and 401 handling (clear token / redirect to `/login`).
- [ ] Add typed API client functions for auth: `signup`, `login`, `me`, `logout`, consumed by AuthContext.
- [ ] Add typed API client functions for tools: list (with `q`/`category`/`status` params), create, update, delete.
- [ ] Add typed API client functions for loans (list with status filter, create, return), reservations (list, create), and dashboard overdue.
- [ ] Add typed API client functions for admin settings (`getSettings`, `patchSettings`) consumed by the AdminSettingsPage.

## tester tasks
- [ ] Auth: signup first user → ADMIN; login returns JWT; guarded routes 401 without token; admin-only routes (tool CRUD, loan create/return, admin settings) 403 for USER.
- [ ] Catalog: admin creates "Cordless Drill" (Power/Good) → appears available; USER list shows name/category/condition/availability; `q` search and `category`/`status` filters narrow results.
- [ ] Loans: create loan → tool shows on_loan and appears in loans list with borrower + due date; return → loan closed (`returnedAt` set), tool available again.
- [ ] Reservations: USER reserves an on-loan tool → appears in reservations list; earliest ACTIVE surfaces as next-in-line on return; single ACTIVE per user per tool enforced.
- [ ] Dashboard: a past-due unreturned loan appears under "Overdue" with tool, borrower, due date, and days overdue.
- [ ] Seed/health: seed prints a parseable `SEED_CREDS_JSON` line and both demo accounts log in; `GET /api/health` and `GET /api/health/deep` return 200 (deep pings DB).
- [ ] Deep-link coverage: navigate directly to route/query-param states (e.g. `/tools?category=Power&status=on_loan`, `/tools?modal=new-tool`, `/loans?modal=new-loan`, `/tools?panel=<id>`) and verify each renders correctly.

## Open questions
- `<spec_deployments>` includes `minio` (object storage), but the spec's file list and scenarios never reference file/image uploads or object storage. Admin settings tasks list a `minio` credential form for completeness; if MinIO is not actually used, downstream agents should drop it from the settings page.
- The provisioned integration is literally named "None (no third-party APIs or external services)" with a placeholder env key — this is not a real integration, so no integration client module was scoped. Confirm no third-party client is expected.
- Loan creation records a free-text `borrowerName` with optional `borrowerUserId`; the spec does not define how/whether the UI links a loan to an existing user account — downstream may treat `borrowerUserId` as unset for now.
