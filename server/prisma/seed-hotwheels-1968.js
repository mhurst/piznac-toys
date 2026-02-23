const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const sweet16 = [
  'Beatnik Bandit',
  'Custom Barracuda',
  'Custom Camaro',
  'Custom Corvette',
  'Custom Cougar',
  'Custom Eldorado',
  'Custom Firebird',
  'Custom Fleetside',
  'Custom Mustang',
  'Custom T-Bird',
  'Custom Volkswagen',
  'Deora',
  'Ford J-Car',
  'Hot Heap',
  'Python',
  'Silhouette',
];

async function main() {
  const toyline = await prisma.toyLine.findUnique({ where: { slug: 'hot-wheels' } });
  if (!toyline) { console.error('Hot Wheels toyline not found. Run seed-hotwheels-setup.js first.'); process.exit(1); }

  const series = await prisma.series.findUnique({
    where: { toyLineId_slug: { toyLineId: toyline.id, slug: 'redline' } },
  });
  if (!series) { console.error('Redline series not found.'); process.exit(1); }

  const subSeries = await prisma.subSeries.findUnique({
    where: { seriesId_slug: { seriesId: series.id, slug: 'sweet-16' } },
  });

  const tag = await prisma.tag.upsert({
    where: { toyLineId_name: { toyLineId: toyline.id, name: '1968' } },
    update: {},
    create: { name: '1968', toyLineId: toyline.id },
  });

  console.log(`\nSeeding ${sweet16.length} Sweet 16 cars...`);
  let created = 0, skipped = 0;

  for (const name of sweet16) {
    const existing = await prisma.figure.findFirst({
      where: { name, toyLineId: toyline.id, seriesId: series.id, year: 1968 },
    });
    if (existing) { console.log(`  Skipped: ${name}`); skipped++; continue; }

    await prisma.figure.create({
      data: {
        name,
        year: 1968,
        toyLineId: toyline.id,
        seriesId: series.id,
        subSeriesId: subSeries?.id || null,
        tags: { create: { tagId: tag.id } },
      },
    });
    console.log(`  Created: ${name}`);
    created++;
  }

  console.log(`\nSweet 16: Created ${created}, Skipped ${skipped}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
