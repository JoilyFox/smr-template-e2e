import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Clear existing items
  await prisma.item.deleteMany({});

  // Seed sample items
  const items = [
    {
      name: 'NestJS Template Item 1',
      description: 'First sample item created via Prisma seed script',
    },
    {
      name: 'NestJS Template Item 2',
      description: 'Second sample item created via Prisma seed script',
    },
  ];

  for (const item of items) {
    const created = await prisma.item.create({
      data: item,
    });
    console.log(`Created item with ID: ${created.id}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
