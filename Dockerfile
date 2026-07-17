# syntax=docker/dockerfile:1
# ── Frontend (Angular 17+) ────────────────────────────────────────────────────
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY web/frontend/package*.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --legacy-peer-deps
COPY web/frontend/ ./
# BASE_HREF=/ — served at subdomain root; asset paths are absolute from /
RUN npx ng build --base-href / --configuration production \
    && test -n "$(find dist -name index.html | head -1)" \
    || (echo "ERROR: frontend build produced no index.html" && exit 1)

# ── Backend (NestJS + Prisma 7 driver-adapter) ────────────────────────────────
FROM node:20-alpine AS backend-builder
WORKDIR /app/backend
COPY backend/package*.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm install --legacy-peer-deps --no-audit --no-fund
COPY backend/ ./
# prisma generate produces the WASM client at src/generated/prisma (see schema.prisma output).
# Needs a DATABASE_URL for config loading — generate never actually connects.
ENV DATABASE_URL="postgresql://user:pass@localhost:5432/db"
RUN npx prisma generate
RUN npm run build \
    && test -n "$(find /app/backend/dist -name main.js | head -1)" \
    || (echo "ERROR: no main.js in dist — check tsconfig rootDir" && exit 1)

# ── Backend production deps (smaller runtime layer) ───────────────────────────
FROM node:20-alpine AS backend-deps
WORKDIR /app/backend
COPY backend/package*.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm install --omit=dev --legacy-peer-deps --no-audit --no-fund

# ── Runtime: nginx + node + supervisord in one container ──────────────────────
FROM node:20-alpine AS runtime
RUN apk add --no-cache nginx supervisor curl

# Backend
WORKDIR /app/backend
COPY --from=backend-deps    /app/backend/node_modules ./node_modules
COPY --from=backend-builder /app/backend/dist         ./dist
COPY --from=backend-builder /app/backend/prisma       ./prisma
COPY --from=backend-builder /app/backend/prisma.config.ts ./prisma.config.ts
COPY --from=backend-builder /app/backend/package.json ./package.json
# Prisma-generated WASM client (lives under src/generated/prisma because of output path)
COPY --from=backend-builder /app/backend/src/generated ./src/generated

# Frontend static assets
COPY --from=frontend-builder /app/frontend/dist/frontend/browser /usr/share/nginx/html

# nginx + supervisord configs (created in step 4)
COPY nginx.conf       /etc/nginx/http.d/default.conf
COPY supervisord.conf /etc/supervisord.conf

# Remove default nginx server block that conflicts with our listen 80
RUN rm -f /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisord.conf"]
