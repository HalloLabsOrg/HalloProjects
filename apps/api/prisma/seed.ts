import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { BUILT_IN_TEMPLATES } from '@hallo/templates';

const prisma = new PrismaClient();

async function main() {
  // 1. Seed Admin User
  const email = process.env.ADMIN_EMAIL ?? 'admin@hallo.local';
  const password = process.env.ADMIN_PASSWORD ?? 'admin123456';
  const name = process.env.ADMIN_NAME ?? 'Admin';

  const existing = await prisma.user.findUnique({ where: { email } });
  if (!existing) {
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
    console.log(`  Role    : ADMIN\n`);
  } else {
    console.log(`Admin user already exists: ${email}\n`);
  }

  // 2. Seed Built-in Templates
  console.log('Seeding built-in templates...');
  for (const t of BUILT_IN_TEMPLATES) {
    await prisma.template.upsert({
      where: {
        slug_version: {
          slug: t.slug,
          version: t.version,
        },
      },
      create: {
        name: t.name,
        slug: t.slug,
        version: t.version,
        description: t.description,
        author: t.author,
        previewImage: t.previewImage,
        schema: t.schema as any,
        files: t.files as any,
        isActive: true,
      },
      update: {
        name: t.name,
        description: t.description,
        author: t.author,
        previewImage: t.previewImage,
        schema: t.schema as any,
        files: t.files as any,
      },
    });
    console.log(`  - Upserted template: ${t.name} (${t.slug} v${t.version})`);
  }
  console.log('✓ Seeding templates complete.\n');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

