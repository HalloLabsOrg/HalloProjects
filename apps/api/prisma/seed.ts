import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL ?? 'admin@hallo.local';
  const password = process.env.ADMIN_PASSWORD ?? 'admin123456';
  const name = process.env.ADMIN_NAME ?? 'Admin';

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Admin user already exists: ${email}`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      email,
      name,
      passwordHash,
      role: Role.ADMIN,
      isActive: true,
    },
  });

  console.log(`✓ Admin user created: ${user.email} (id: ${user.id})`);
  console.log(`  Email   : ${email}`);
  console.log(`  Password: ${password}`);
  console.log(`  Role    : ADMIN`);
  console.log('');
  console.log('⚠  Change the admin password after first login!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
