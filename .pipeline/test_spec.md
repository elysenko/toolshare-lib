# Test Specification

> ⚠️ **Warning:** `.pipeline/surface.json` was not found. The API surface below was
> derived from the "Surface contract" section of `.pipeline/tasks.md` and the approved
> spec. If a canonical `surface.json` is produced later, re-reconcile this document
> against it. 18 endpoints are enumerated here.

## Coverage summary
- Total cases: 78
- API endpoints covered: 18 / 18 (from derived surface contract)
- User journeys covered: 11

Endpoints in scope (derived):
1. `GET /api/health`
2. `GET /api/health/deep`
3. `POST /api/auth/signup`
4. `POST /api/auth/login`
5. `GET /api/auth/me`
6. `POST /api/auth/logout`
7. `GET /api/tools`
8. `POST /api/tools`
9. `PATCH /api/tools/:id`
10. `DELETE /api/tools/:id`
11. `GET /api/loans`
12. `POST /api/loans`
13. `POST /api/loans/:id/return`
14. `GET /api/reservations`
15. `POST /api/reservations`
16. `GET /api/dashboard/overdue`
17. `GET /api/admin/settings`
18. `PATCH /api/admin/settings`

---

## API tests

### `GET /api/health`
- **Happy path**: no auth, no body → `200` with JSON `{ status: "ok" }` (or equivalent liveness shape). Must NOT touch the database.
- **Validation failures**: n/a (no inputs).
- **Auth failures**: none — endpoint is public; returns `200` even with no `Authorization` header.
- **Idempotency / edge cases**: repeated calls always `200`; response time independent of DB state.

### `GET /api/health/deep`
- **Happy path**: no auth → `200` with a body indicating DB reachable (e.g. `{ status: "ok", db: "up" }`). Performs a real DB ping/query.
- **Validation failures**: n/a.
- **Auth failures**: none — public route.
- **Idempotency / edge cases**: when the DB is unreachable → non-200 (e.g. `503`) with `db` marked down; distinguishes it from `/api/health`.

### `POST /api/auth/signup`
- **Happy path (first user)**: body `{ email: "admin@ex.com", password: "pw123456" }` on an empty user table → `200/201` with a JWT token and user object; created user `role === "ADMIN"`. Password persisted only as a bcrypt hash (never returned).
- **Happy path (subsequent user)**: same shape when ≥1 user already exists → new user `role === "USER"`.
- **Validation failures**:
  - Missing `email` → `400` (zod).
  - Malformed `email` (`"notanemail"`) → `400`.
  - Missing/short `password` (empty or below min length) → `400`.
  - Non-JSON / empty body → `400`.
- **Auth failures**: none — public route.
- **Idempotency / edge cases**: duplicate `email` (already registered) → `409` (or `400`) with a clear "email already in use" message; no second user created.

### `POST /api/auth/login`
- **Happy path**: body `{ email, password }` matching a seeded/known account → `200` with JWT + user `{ id, email, role }`. Both seeded demo accounts (admin + user) must succeed.
- **Validation failures**: missing `email` or `password` → `400`.
- **Auth failures**:
  - Unknown email → `401` (generic "invalid credentials", must not reveal which field is wrong).
  - Correct email, wrong password → `401`.
- **Idempotency / edge cases**: repeated logins issue valid tokens each time; token decodes to the correct user id + role.

### `GET /api/auth/me`
- **Happy path**: valid `Authorization: Bearer <token>` → `200` with the current user `{ id, email, role }`, no `passwordHash`.
- **Validation failures**: n/a.
- **Auth failures**:
  - No `Authorization` header → `401`.
  - Malformed / non-JWT token → `401`.
  - Expired or wrong-secret token → `401`.
- **Idempotency / edge cases**: response reflects the token subject exactly (admin token → ADMIN role).

### `POST /api/auth/logout`
- **Happy path**: valid token → `200` (stateless JWT; endpoint acknowledges logout). Client is responsible for discarding the token.
- **Validation failures**: n/a.
- **Auth failures**: no token → `401` (route is under requireAuth per contract).
- **Idempotency / edge cases**: calling twice still returns `200`.

### `GET /api/tools`
- **Happy path**: authenticated (USER or ADMIN) → `200` with an array of tools; each item includes `id, name, category, condition` and a **derived** `availability` in `{ available, on_loan, reserved }`, plus `nextInLine` (earliest ACTIVE reservation) when applicable.
- **Validation failures**:
  - `category` not in `{Power, Hand, Garden, Measurement}` → `400` (or empty result — assert whichever the impl chooses, but must be consistent and documented).
  - `status` not in `{available, on_loan, reserved}` → `400` or empty result.
- **Auth failures**: no token → `401`.
- **Idempotency / edge cases**:
  - `?q=drill` narrows to tools whose name matches (case-insensitive substring).
  - `?category=Power` returns only Power tools.
  - `?status=on_loan` returns only tools with an open loan.
  - Combined `?q=drill&category=Power&status=on_loan` applies all filters (AND).
  - Availability is computed at query time and matches the loan/reservation state (a tool with an open unreturned loan → `on_loan`; with an ACTIVE reservation and no open loan → `reserved`; otherwise `available`).

### `POST /api/tools`
- **Happy path (admin)**: admin token + body `{ name: "Cordless Drill", category: "Power", condition: "Good" }` → `201` with the created tool; immediately appears in `GET /api/tools` with `availability === "available"`.
- **Validation failures**:
  - Missing `name` → `400`.
  - `category` outside enum → `400`.
  - `condition` outside `{New, Good, Fair, Worn}` → `400`.
- **Auth failures**:
  - No token → `401`.
  - USER token → `403` (admin-only).
- **Idempotency / edge cases**: creating two tools with the same name is allowed (no uniqueness on name) unless the impl states otherwise.

### `PATCH /api/tools/:id`
- **Happy path (admin)**: admin token + partial body (e.g. `{ condition: "Fair" }`) → `200` with updated tool; change reflected in subsequent `GET`.
- **Validation failures**: invalid enum value for `category`/`condition` → `400`.
- **Auth failures**: no token → `401`; USER token → `403`.
- **Idempotency / edge cases**: unknown `:id` → `404`.

### `DELETE /api/tools/:id`
- **Happy path (admin)**: admin token → `200/204`; tool no longer in `GET /api/tools`.
- **Validation failures**: n/a.
- **Auth failures**: no token → `401`; USER token → `403`.
- **Idempotency / edge cases**: unknown `:id` → `404`; deleting a tool with an open loan should either be blocked (`409`) or cascade — assert the impl's documented behavior consistently.

### `GET /api/loans`
- **Happy path**: authenticated → `200` with an array of loans, each with `id, toolId (or tool), borrowerName, dueDate, returnedAt, createdAt`.
- **Validation failures**: `status` outside `{active, overdue, returned}` → `400` or empty result (documented).
- **Auth failures**: no token → `401`.
- **Idempotency / edge cases**:
  - `?status=active` → loans with `returnedAt == null` and `dueDate >= now`.
  - `?status=overdue` → loans with `returnedAt == null` and `dueDate < now`.
  - `?status=returned` → loans with `returnedAt != null`.

### `POST /api/loans`
- **Happy path (admin)**: admin token + `{ toolId, borrowerName: "Alex", dueDate: "<future ISO>" }` → `201` with the loan; the referenced tool's `availability` becomes `on_loan` in `GET /api/tools`; loan appears in `GET /api/loans?status=active`.
- **Validation failures**:
  - Missing `toolId`, `borrowerName`, or `dueDate` → `400`.
  - `dueDate` not a valid date → `400`.
- **Auth failures**: no token → `401`; USER token → `403`.
- **Idempotency / edge cases**:
  - `toolId` that does not exist → `404`.
  - Creating a loan on a tool that already has an open (unreturned) loan → `409` (double-loan prevented).

### `POST /api/loans/:id/return`
- **Happy path (admin)**: admin token on an open loan → `200`; loan now has `returnedAt` set; the tool returns to `available` (or `reserved` if an ACTIVE reservation exists); loan moves to `GET /api/loans?status=returned`.
- **Validation failures**: n/a (id in path).
- **Auth failures**: no token → `401`; USER token → `403`.
- **Idempotency / edge cases**:
  - Unknown loan `:id` → `404`.
  - Returning an already-returned loan → `409` (or no-op `200`, documented).
  - On return, the earliest ACTIVE reservation for that tool is surfaced as next-in-line (tool becomes `reserved`, reservation optionally transitions per impl).

### `GET /api/reservations`
- **Happy path**: authenticated → `200` with an array of reservations `{ id, toolId, userId, status, createdAt }`, ordered/derivable by FIFO `createdAt`.
- **Validation failures**: n/a.
- **Auth failures**: no token → `401`.
- **Idempotency / edge cases**: a USER sees the reservation list per impl policy (own vs all); assert the documented visibility rule.

### `POST /api/reservations`
- **Happy path (USER)**: USER token + `{ toolId }` for a tool currently `on_loan` → `201` with an ACTIVE reservation.
- **Validation failures**: missing `toolId` → `400`; unknown `toolId` → `404`.
- **Auth failures**: no token → `401`.
- **Idempotency / edge cases**:
  - Reserving a tool that is `available` (not on loan) → `400/409` (only on-loan tools are reservable, per spec).
  - Same user reserving the same tool twice while an ACTIVE reservation exists → `409` (single ACTIVE per user per tool enforced by unique constraint).
  - Two different users reserving the same on-loan tool → both ACTIVE; FIFO by `createdAt` determines next-in-line.

### `GET /api/dashboard/overdue`
- **Happy path**: authenticated → `200` with an array of overdue entries, each `{ tool, borrower, dueDate, daysOverdue }` where `daysOverdue` is a positive integer derived from `dueDate < now` and `returnedAt == null`.
- **Validation failures**: n/a.
- **Auth failures**: no token → `401`.
- **Idempotency / edge cases**:
  - A loan due yesterday and unreturned appears with `daysOverdue >= 1`.
  - A returned-but-was-late loan does NOT appear.
  - A not-yet-due loan does NOT appear.
  - `daysOverdue` matches the value derived by the shared availability helper (consistent with `/api/loans?status=overdue`).

### `GET /api/admin/settings`
> Derived from the surface contract; the base spec is largely silent on this and flags `minio` as a possible drop. Treat as conditional — skip/mark N/A if admin settings are not implemented.
- **Happy path (admin)**: admin token → `200` listing service keys (`postgresql`, and `minio` if retained) with **masked** values and a configured/unconfigured status flag.
- **Validation failures**: n/a.
- **Auth failures**: no token → `401`; USER token → `403`.
- **Idempotency / edge cases**: secret values are masked, never returned in cleartext.

### `PATCH /api/admin/settings`
> Same conditional note as above.
- **Happy path (admin)**: admin token + `{ key, value }` (or map of pairs) → `200`; upserts into `SystemSetting`; subsequent `GET` shows the key as configured (value masked).
- **Validation failures**: unknown/unsupported key → `400`; missing `value` → `400`.
- **Auth failures**: no token → `401`; USER token → `403`.
- **Idempotency / edge cases**: patching the same key twice updates in place (single row per key, `updatedAt` bumped).

---

## UI / journey tests

### Journey: First-user signup becomes ADMIN
- **Steps**: On an empty system, navigate to `/signup` → enter email + password → submit.
- **Expected outcomes**: redirected into the authenticated app (`/dashboard`); Shell header shows "ToolShare"; account has admin capabilities (admin nav / tool-create controls visible).
- **Negative path**: submitting with a malformed email or empty password shows an inline validation error and does not navigate; duplicate email shows a server error message.

### Journey: Login and land on dashboard
- **Steps**: Navigate to `/login` → enter valid seeded credentials → submit.
- **Expected outcomes**: redirect to `/dashboard`; token stored in localStorage; Shell header shows "ToolShare"; `GET /api/auth/me` reflects the logged-in user.
- **Negative path**: wrong password shows an "invalid credentials" message; user stays on `/login`; no token stored.

### Journey: Logout
- **Steps**: While authenticated, trigger logout from the Shell.
- **Expected outcomes**: token cleared from localStorage; redirected to `/login`; protected routes now redirect back to `/login`.
- **Negative path**: navigating directly to `/dashboard` after logout redirects to `/login`.

### Journey: Browse & filter tool catalog
- **Steps**: Authenticated, go to `/tools`; type in search; select category and status filters.
- **Expected outcomes**: each tool row shows name, category, condition, and availability; filters update the URL query params (`?q=&category=&status=`) and the visible list; results match the filter (AND semantics).
- **Negative path**: a query that matches nothing shows an empty-state message (not an error); loading and error states render.

### Journey: Deep-link catalog states
- **Steps**: Directly navigate to `/tools?category=Power&status=on_loan`, then `/tools?modal=new-tool`, then `/tools?modal=edit-tool&id=<id>`, then `/tools?panel=<id>`.
- **Expected outcomes**: filter deep-link pre-applies category+status filters; `modal=new-tool` opens the create modal (admin); `modal=edit-tool&id=` opens the edit modal pre-filled; `panel=<id>` opens the tool detail panel. All states are URL-addressable and survive refresh.
- **Negative path**: `panel=<unknown-id>` or `edit-tool&id=<unknown>` shows a not-found / graceful empty state, not a crash.

### Journey: Admin creates a tool
- **Steps**: As admin, `/tools?modal=new-tool` → fill name "Cordless Drill", category Power, condition Good → save.
- **Expected outcomes**: modal closes; new tool appears in the catalog with availability `available`; persisted via `POST /api/tools`.
- **Negative path**: submitting with a blank name or unselected enum shows validation errors; a non-admin user does not see the create control (and a deep-link to `?modal=new-tool` is inert / hidden for USER).

### Journey: Admin edits / deletes a tool
- **Steps**: As admin, open `?modal=edit-tool&id=<id>`, change condition, save; then delete a tool via the detail panel/row action.
- **Expected outcomes**: edit persists and list reflects the change; delete removes the tool from the list.
- **Negative path**: USER cannot access edit/delete controls; edit with invalid values shows validation errors.

### Journey: Loans — create, view, return
- **Steps**: As admin, `/loans?modal=new-loan` → pick a tool, enter borrower name + due date → save; view the loans list; then perform the return action on that loan.
- **Expected outcomes**: new loan appears in the list with borrower name + due date; the tool's availability flips to `on_loan` on `/tools`; after return, the loan shows as returned and the tool becomes available again.
- **Negative path**: creating a loan with missing borrower/due date shows validation errors; USER cannot open the new-loan modal or perform returns.

### Journey: Loans status filter
- **Steps**: On `/loans`, switch the status filter between active / overdue / returned.
- **Expected outcomes**: list narrows to loans matching each status; filter state is reflected/addressable.
- **Negative path**: empty status categories show an empty state.

### Journey: Reservations — reserve and next-in-line
- **Steps**: As USER, on `/tools` find an on-loan tool and reserve it; view `/reservations`.
- **Expected outcomes**: reservation appears in the list as ACTIVE; when the tool's loan is returned, the earliest ACTIVE reservation shows as next-in-line and the tool reflects `reserved`.
- **Negative path**: reserving an available (not-on-loan) tool is blocked with a message; reserving the same tool twice shows a "already reserved" error.

### Journey: Dashboard overdue section
- **Steps**: With a past-due unreturned loan present, authenticated user opens `/dashboard`.
- **Expected outcomes**: the "Overdue" section lists the tool, borrower, due date, and days overdue (positive integer).
- **Negative path**: with no overdue loans, the section shows an empty state; loading and error states render.

---

## Data integrity tests
- **Password storage**: `User.passwordHash` is a bcrypt hash; plaintext passwords never persisted or returned by any endpoint.
- **First-user role**: exactly the first created user is `ADMIN`; all subsequent users default to `USER`.
- **Email uniqueness**: no two `User` rows share an email (DB unique constraint enforced).
- **Loan → tool availability**: while a `Loan` has `returnedAt == null`, its tool derives `on_loan`; after `returnedAt` is set, the tool derives `available` (or `reserved` if an ACTIVE reservation exists). Availability is never stored on `Tool`.
- **Single open loan per tool**: a tool cannot have two simultaneous unreturned loans.
- **Reservation uniqueness**: at most one `ACTIVE` `Reservation` per (userId, toolId) — enforced by a unique constraint; FIFO order preserved by `createdAt`.
- **daysOverdue derivation**: computed from `dueDate` vs. current time for unreturned loans only; consistent between `/api/dashboard/overdue` and `/api/loans?status=overdue`.
- **Seed idempotency**: running the seed multiple times (upsert by email) does not duplicate the demo ADMIN/USER or sample tools; the `SEED_CREDS_JSON {...}` line is printed once per run and is JSON-parseable; both printed accounts can log in.
- **SystemSetting**: at most one row per `key`; `updatedAt` advances on each PATCH (if admin settings retained).

---

## Out of scope
- **Password reset / email verification flows** — spec is silent; no endpoints defined.
- **Token refresh / rotation and server-side session invalidation** — JWT is stateless; logout is client-side token discard only.
- **Rate limiting, brute-force lockout, CAPTCHA** — not specified.
- **MinIO / object storage and file uploads** — `tasks.md` open question flags `minio` as unreferenced by any spec scenario; admin-settings `minio` cases are conditional and skipped if the service is dropped.
- **Third-party / external API integrations** — spec lists integrations as "None"; no integration client under test.
- **Linking a loan's `borrowerUserId` to an existing account via the UI** — spec does not define this flow; borrower is treated as free-text for now.
- **Pagination, sorting UI, and bulk operations** on catalog/loans/reservations — not specified.
- **Docker/deploy runtime behavior** (multi-stage build, `prisma migrate deploy` ordering) — validated by the deploy pipeline, not by these functional test cases, beyond the seed-idempotency and health-endpoint checks above.
- **Cross-browser / responsive / accessibility conformance** — not specified.
