const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const vehicles1982 = [
  'HAL (Heavy Artillery Laser)',
  'HQ Command Center',
  'JUMP (Jet Mobile Propulsion Unit)',
  'MMS (Mobile Missile System)',
  'MOBAT (Motorized Battle Tank)',
  'RAM (Rapid Fire Motorcycle)',
  'FLAK (Field Light Attack Kanon)',
  'VAMP (Multi-Purpose Attack Vehicle)',
  'Cobra HISS (High Speed Sentry)',
  'Cobra Missile Command HQ',
];

async function main() {
  const toyline = await prisma.toyLine.findUnique({ where: { slug: 'gi-joe' } });
  if (!toyline) { console.error('G.I. Joe toyline not found.'); process.exit(1); }

  const arah = await prisma.series.findUnique({
    where: { toyLineId_slug: { toyLineId: toyline.id, slug: 'arah' } },
  });
  if (!arah) { console.error('ARAH series not found.'); process.exit(1); }

  const vehiclesSubSeries = await prisma.subSeries.findUnique({
    where: { seriesId_slug: { seriesId: arah.id, slug: 'vehicles' } },
  });

  // Create or find "1982" tag for this toyline
  const tag = await prisma.tag.upsert({
    where: { toyLineId_name: { toyLineId: toyline.id, name: '1982' } },
    update: {},
    create: { name: '1982', toyLineId: toyline.id },
  });
  console.log(`Tag ready: ${tag.name} (id: ${tag.id})`);

  console.log(`\nSeeding ${vehicles1982.length} vehicles into ${toyline.name} > ${arah.name}${vehiclesSubSeries ? ' > Vehicles' : ''}...`);

  let created = 0;
  let skipped = 0;

  for (const name of vehicles1982) {
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
        subSeriesId: vehiclesSubSeries?.id || null,
        tags: { create: { tagId: tag.id } },
      },
    });

    console.log(`  Created: ${name}`);
    created++;
  }

  // Also tag the existing 1982 figures that don't have this tag yet
  const existingFigures = await prisma.figure.findMany({
    where: { toyLineId: toyline.id, seriesId: arah.id, year: 1982, tags: { none: { tagId: tag.id } } },
  });

  for (const fig of existingFigures) {
    await prisma.figureTag.create({ data: { figureId: fig.id, tagId: tag.id } });
  }
  if (existingFigures.length > 0) {
    console.log(`\nTagged ${existingFigures.length} existing 1982 figures with "1982"`);
  }

  console.log(`\nDone! Created: ${created}, Skipped: ${skipped}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
