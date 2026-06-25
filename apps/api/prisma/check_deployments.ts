import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const deployments = await prisma.deployment.findMany({
    where: {
      externalId: { not: null },
    },
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: {
      service: {
        include: {
          repository: true,
        },
      },
    },
  });

  console.log('Last 5 Deployments:');
  for (const d of deployments) {
    console.log(`- ID: ${d.id}`);
    console.log(`  Status: ${d.status}`);
    console.log(`  External ID: ${d.externalId}`);
    console.log(`  Service: ${d.service.name} (Repo: ${d.service.repository?.fullName})`);
    console.log(`  Created At: ${d.createdAt}`);
    console.log(`  Error: ${d.logs ? d.logs.substring(0, 200) : 'none'}`);
    console.log('---');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
