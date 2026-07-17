FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json pnpm-lock.yaml* ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile
COPY . .
# Generate the Prisma client (output: src/generated/prisma) BEFORE the TS build,
# otherwise the imports in prisma.service.ts won't resolve. A dummy URL satisfies
# config loading — generate never connects to a database.
ENV DATABASE_URL="postgresql://user:pass@localhost:5432/db"
RUN npx prisma generate
RUN pnpm build

FROM node:22-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
# prisma.config.ts carries the datasource URL binding used by `migrate deploy`.
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY package*.json ./
EXPOSE 3000
# Apply pending migrations, run the idempotent seed, then start the API. If a
# migration fails the container exits non-zero and K8s will not serve traffic.
CMD ["sh", "-c", "npx prisma migrate deploy && node prisma/seed/seed.js && node dist/src/main"]
