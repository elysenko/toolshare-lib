-- DB-level guards for the two core invariants. Prisma cannot express partial
-- unique indexes in schema.prisma, so they are declared here as raw SQL and
-- applied by `prisma migrate deploy`. They back up the app-level checks in
-- loans.service.ts / reservations.service.ts (which translate P2002 to 409).

-- At most one open (unreturned) loan per tool.
CREATE UNIQUE INDEX "Loan_toolId_open_key"
  ON "Loan" ("toolId")
  WHERE "returnedAt" IS NULL;

-- At most one ACTIVE reservation per user per tool. Scoped to ACTIVE so a user
-- may reserve → cancel → reserve the same tool again (multiple CANCELLED rows).
CREATE UNIQUE INDEX "Reservation_userId_toolId_active_key"
  ON "Reservation" ("userId", "toolId")
  WHERE "status" = 'ACTIVE';
