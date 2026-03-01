import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { uuidv7 } from 'uuidv7';

const BCRYPT_COST = 12;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

async function seed(prisma: PrismaClient): Promise<void> {
  const email = requireEnv('SEED_ADMIN_EMAIL');
  const password = requireEnv('SEED_ADMIN_PASSWORD');
  const name = requireEnv('SEED_ADMIN_NAME');

  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    console.info(`Seed: admin user "${email}" already exists — skipping.`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
  const now = new Date();

  await prisma.user.create({
    data: {
      id: uuidv7(),
      email,
      name,
      password_hash: passwordHash,
      role: 'admin',
      is_active: true,
      created_at: now,
      updated_at: now,
    },
  });

  console.info(`Seed: admin user "${email}" created successfully.`);
}

const prisma = new PrismaClient();

seed(prisma)
  .catch((error: unknown) => {
    console.error('Seed failed:', error);
    throw error;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
