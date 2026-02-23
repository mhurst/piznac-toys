const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const hotwheels = await prisma.toyLine.upsert({
    where: { slug: 'hot-wheels' },
    update: {},
    create: {
      name: 'Hot Wheels',
      slug: 'hot-wheels',
    },
  });
  console.log(`ToyLine ready: ${hotwheels.name} (id: ${hotwheels.id})`);

  const vintage = await prisma.series.upsert({
    where: { toyLineId_slug: { toyLineId: hotwheels.id, slug: 'redline' } },
    update: {},
    create: {
      name: 'Redline',
      slug: 'redline',
      toyLineId: hotwheels.id,
    },
  });
  console.log(`Series ready: ${vintage.name} (id: ${vintage.id})`);

  const sweet16 = await prisma.subSeries.upsert({
    where: { seriesId_slug: { seriesId: vintage.id, slug: 'sweet-16' } },
    update: {},
    create: {
      name: 'Sweet 16',
      slug: 'sweet-16',
      seriesId: vintage.id,
    },
  });
  console.log(`SubSeries ready: ${sweet16.name} (id: ${sweet16.id})`);

  for (const year of ['1968', '1969', '1970', '1971', '1972', '1973', '1974', '1975', '1976', '1977']) {
    const tag = await prisma.tag.upsert({
      where: { toyLineId_name: { toyLineId: hotwheels.id, name: year } },
      update: {},
      create: { name: year, toyLineId: hotwheels.id },
    });
    console.log(`Tag ready: ${tag.name} (id: ${tag.id})`);
  }

  console.log('\nHot Wheels toyline setup complete!');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
