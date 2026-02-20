const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@piznac.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'changeme123';

  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  await prisma.admin.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      password: hashedPassword,
    },
  });

  console.log(`Admin user created/verified: ${adminEmail}`);

  const transformers = await prisma.toyLine.upsert({
    where: { slug: 'transformers' },
    update: {},
    create: {
      name: 'Transformers',
      slug: 'transformers',
    },
  });

  console.log(`ToyLine created: ${transformers.name}`);

  const g1 = await prisma.series.upsert({
    where: { toyLineId_slug: { toyLineId: transformers.id, slug: 'g1' } },
    update: {},
    create: {
      name: 'G1',
      slug: 'g1',
      toyLineId: transformers.id,
    },
  });

  console.log(`Series created: ${g1.name}`);

  const tagNames = ['Autobot', 'Decepticon', 'Dinobot', 'Leader', 'Combiner', 'Triple Changer', 'Mini Vehicle', 'Cassette'];

  for (const tagName of tagNames) {
    await prisma.tag.upsert({
      where: { toyLineId_name: { toyLineId: transformers.id, name: tagName } },
      update: {},
      create: {
        name: tagName,
        toyLineId: transformers.id,
      },
    });
  }

  console.log(`Tags created: ${tagNames.join(', ')}`);
  console.log('Seed complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
