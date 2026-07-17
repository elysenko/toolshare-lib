# Architecture

## Requested stack
`backend, web` — both newly scaffolded (repo previously contained only `README.md` and the Colossus deploy GitHub Action; no application code existed).

## Note on stack vs. plan
The scope agent's plan describes a React + Vite + Express stack. The platform's fixed stack for this project is **NestJS + Prisma + PostgreSQL** (backend) and **Angular + NestJS** (web), taken from `template-backend` and `template-web`. Per the scaffolding contract, the plan's *features* (roles, tool catalog, loans, reservations, overdue dashboard, JWT auth) should be implemented on top of this scaffolded stack, not on React/Express/Vite.

## Layout

### `backend/` (from `template-backend`)
Standalone NestJS + Prisma + PostgreSQL API, deployable on its own.
- `src/auth/` — JWT auth (Passport strategy, guards, decorators, roles via `Role` enum `admin|user`)
- `src/user/` — user CRUD
- `src/health/` — `GET /health/live`, `GET /health/ready` (Terminus, pings Prisma/DB)
- `src/prisma/` — Prisma client wrapper
- `prisma/schema.prisma` — `User` model with `Role` enum (`admin`/`user`) as a starting point; extend with `Tool`, `Loan`, `Reservation` models per the plan
- `prisma/seed/` — seed script entry point (empty scaffold — fill in demo data)
- API is prefixed `api/v1`, Swagger docs at `/api`
- `docker-compose.yml` — local Postgres for this service
- `Dockerfile` — pnpm-based multi-stage build, listens on port 3000

### `web/` (from `template-web`)
Split-container web app: Angular SPA + its own NestJS API, built as two Docker images.
- `web/frontend/` — Angular 17 SPA (`ng serve`/`ng build`), proxies `/api` to the backend in dev (`proxy.conf.json`)
- `web/backend/` — separate NestJS + Prisma API (JWT auth, users, health) serving `/api/v1`, Swagger at `/api`
- `web/Dockerfile.frontend` — builds `web/frontend`, serves `dist/frontend/browser` via nginx (`web/nginx.conf`) on port 80, proxies `/api/` to a `backend` service on port 3000
- `web/Dockerfile.backend` — builds `web/backend`, runs `node dist/main` on port 3000

## Next steps for the developer
1. Decide whether the project truly needs *two* separate NestJS APIs (`backend/` and `web/backend/`) or whether one should be dropped/merged — they were scaffolded independently because both `backend` and `web` were requested platforms.
2. Copy env files and fill in real secrets (no `.env.template` shipped in either template — create `backend/.env` and `web/backend/.env` with at least `DATABASE_URL`, `JWT_SECRET`, `JWT_EXP`, and for `web/backend` also `FRONTEND_URL`, `PORT`).
3. Extend `prisma/schema.prisma` in whichever backend is kept with the plan's domain models: `Tool`, `Loan`, `Reservation`, plus role/availability logic.
4. Run `npm install` (or `pnpm install` for `backend/`) in each scaffolded package, then `npx prisma migrate dev` once `DATABASE_URL` points at a real Postgres instance.
5. Implement the plan's routes/pages on top of the NestJS/Angular scaffolding (auth, tools catalog, loans, reservations, overdue dashboard).
6. Wire up `docker-compose.yml` / the two Dockerfiles under `web/` for local end-to-end runs.

## Template sources
- `backend` ← `/app/scaffold-templates/template-backend`
- `web` ← `/app/scaffold-templates/template-web`
