import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../src/generated/prisma/client';
import bcryptjs from 'bcryptjs';
import { createHash } from 'crypto';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error('DATABASE_URL is not defined in the environment variables');
}

const adapter = new PrismaPg({ connectionString: DATABASE_URL });
const prisma = new PrismaClient({ adapter });

function derivePassword(email: string): string {
  return createHash('sha256')
    .update(email + (process.env.SEED_SECRET || 'colossus-seed'))
    .digest('hex')
    .slice(0, 16);
}

function stableId(seed: string): string {
  const h = createHash('sha256').update('toolshare:' + seed).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}

const SEED_USERS = [
  { name: 'Admin Name', email: 'admin@example.com', role: 'admin' as const },
  { name: 'User Name', email: 'user@example.com', role: 'user' as const },
];

const SEED_TOOLS = [
  { name: 'Cordless Drill', category: 'Power' as const, condition: 'Good' as const },
  { name: 'Circular Saw', category: 'Power' as const, condition: 'Fair' as const },
  { name: 'Claw Hammer', category: 'Hand' as const, condition: 'Good' as const },
  { name: 'Garden Spade', category: 'Garden' as const, condition: 'New' as const },
  { name: 'Tape Measure', category: 'Measurement' as const, condition: 'Good' as const },
  { name: 'Extension Ladder', category: 'Hand' as const, condition: 'Worn' as const },
];

async function main() {
  const creds: Record<string, { email: string; password: string }> = {};

  for (const u of SEED_USERS) {
    const plainPassword = derivePassword(u.email);
    const hashedPassword = bcryptjs.hashSync(plainPassword, 10);

    await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, role: u.role, password: hashedPassword },
      create: { name: u.name, email: u.email, password: hashedPassword, role: u.role },
    });

    creds[u.role] = { email: u.email, password: plainPassword };
  }

  for (const t of SEED_TOOLS) {
    await prisma.tool.upsert({
      where: { id: stableId(t.name) },
      update: { name: t.name, category: t.category, condition: t.condition },
      create: { id: stableId(t.name), name: t.name, category: t.category, condition: t.condition },
    });
  }

  console.log(`SEED_CREDS_JSON ${JSON.stringify(creds)}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
