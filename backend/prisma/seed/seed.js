'use strict';
/**
 * Production seed — runs with plain `node`, no TypeScript toolchain needed.
 * Dependencies: pg + bcryptjs (both in package.json "dependencies").
 * Usage:  node prisma/seed/seed.js
 * Called by: npx prisma db seed  (via package.json "prisma.seed" field)
 *
 * Idempotent: users upsert by email, tools upsert by a stable id derived from
 * their name, so repeated runs (e.g. on every container start) never duplicate.
 * Prints one JSON-parseable `SEED_CREDS_JSON {...}` line with the demo logins.
 */
const { Pool } = require('pg');
const { createHash, randomUUID } = require('crypto');
const bcrypt = require('bcryptjs');

function derivePassword(email) {
  return createHash('sha256')
    .update(email + (process.env.SEED_SECRET || 'colossus-seed'))
    .digest('hex')
    .slice(0, 16);
}

// Stable UUID-shaped id from a seed string → lets tools upsert idempotently.
function stableId(seed) {
  const h = createHash('sha256').update('toolshare:' + seed).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}

const SEED_USERS = [
  { name: 'Admin Name', email: 'admin@example.com', role: 'admin' },
  { name: 'User Name', email: 'user@example.com', role: 'user' },
];

const SEED_TOOLS = [
  { name: 'Cordless Drill', category: 'Power', condition: 'Good' },
  { name: 'Circular Saw', category: 'Power', condition: 'Fair' },
  { name: 'Claw Hammer', category: 'Hand', condition: 'Good' },
  { name: 'Garden Spade', category: 'Garden', condition: 'New' },
  { name: 'Tape Measure', category: 'Measurement', condition: 'Good' },
  { name: 'Extension Ladder', category: 'Hand', condition: 'Worn' },
];

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL not set');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  const creds = {};
  try {
    for (const u of SEED_USERS) {
      const plain = derivePassword(u.email);
      const hashed = bcrypt.hashSync(plain, 10);
      await pool.query(
        `INSERT INTO "User" (id, name, email, password, role, "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5::"Role", now(), now())
         ON CONFLICT (email) DO UPDATE
           SET name        = EXCLUDED.name,
               password    = EXCLUDED.password,
               role        = EXCLUDED.role,
               "updatedAt" = now()`,
        [randomUUID(), u.name, u.email, hashed, u.role],
      );
      creds[u.role] = { email: u.email, password: plain };
    }

    for (const t of SEED_TOOLS) {
      await pool.query(
        `INSERT INTO "Tool" (id, name, category, condition, "createdAt", "updatedAt")
         VALUES ($1, $2, $3::"ToolCategory", $4::"ToolCondition", now(), now())
         ON CONFLICT (id) DO UPDATE
           SET name        = EXCLUDED.name,
               category    = EXCLUDED.category,
               condition   = EXCLUDED.condition,
               "updatedAt" = now()`,
        [stableId(t.name), t.name, t.category, t.condition],
      );
    }

    // Single JSON-parseable credentials line for automated verification.
    console.log(`SEED_CREDS_JSON ${JSON.stringify(creds)}`);
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
