const { PrismaClient } = require('@prisma/client');
const slugify = require('slugify');

const prisma = new PrismaClient();

const figures1982 = [
  'Breaker',
  'Clutch',
  'Cobra Commander',
  'Cobra Officer',
  'Cobra',  // Cobra Soldier/Trooper
  'Flash',
  'Grand Slam',
  'Grunt',
  'Hawk',
  'Rock \'n Roll',
  'Scarlett',
  'Short-Fuze',
  'Snake Eyes',
  'Stalker',
  'Steeler',
  'Zap',
];

async function main() {
  // Find G.I. Joe toyline
  const toyline = await prisma.toyLine.findUnique({ where: { slug: 'gi-joe' } });
  if (!toyline) {
    console.error('G.I. Joe toyline not found. Create it first.');
    process.exit(1);
  }

  // Find ARAH series
  const arah = await prisma.series.findUnique({
    where: { toyLineId_slug: { toyLineId: toyline.id, slug: 'arah' } },
  });
  if (!arah) {
    console.error('ARAH series not found. Create it first.');
    process.exit(1);
  }

  // Find "Figures" sub-series under ARAH
  const figuresSubSeries = await prisma.subSeries.findUnique({
    where: { seriesId_slug: { seriesId: arah.id, slug: 'figures' } },
  });

  console.log(`Seeding ${figures1982.length} figures into ${toyline.name} > ${arah.name}${figuresSubSeries ? ' > Figures' : ''}...`);

  let created = 0;
  let skipped = 0;

  for (const name of figures1982) {
    // Check if figure already exists (by name + toyline + series + year)
    const existing = await prisma.figure.findFirst({
      where: { name, toyLineId: toyline.id, seriesId: arah.id, year: 1982 },
    });

    if (existing) {
      console.log(`  Skipped (exists): ${name}`);
      skipped++;
      continue;
    }

    await prisma.figure.create({
      data: {
        name,
        year: 1982,
        toyLineId: toyline.id,
        seriesId: arah.id,
        subSeriesId: figuresSubSeries?.id || null,
      },
    });

    console.log(`  Created: ${name}`);
    created++;
  }

  console.log(`\nDone! Created: ${created}, Skipped: ${skipped}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
