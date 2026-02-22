const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const figures1979 = [
  'Boba Fett',
  'Bossk',
  'FX-7 (Medical Droid)',
  'Han Solo (Hoth Outfit)',
  'IG-88',
  'Imperial Commander',
  'Lando Calrissian',
  'Leia (Hoth Outfit)',
  'Lobot',
  'Luke Skywalker (Bespin Fatigues)',
  'Dengar',
  'Rebel Soldier (Hoth)',
  'Snowtrooper',
  'Star Destroyer Commander',
  'Ugnaught',
  'Yoda',
  '2-1B (Medical Droid)',
  '4-LOM',
];

const vehicles1979 = [
  'AT-AT (All Terrain Armored Transport)',
  'Darth Vader\'s Star Destroyer',
  'Imperial Attack Base',
  'Imperial Troop Transporter',
  'Millennium Falcon (ESB Box)',
  'Rebel Armored Snowspeeder',
  'Rebel Transport',
  'Scout Walker (AT-ST)',
  'Slave I',
  'Twin-Pod Cloud Car',
  'Tauntaun',
  'Tauntaun (Open Belly)',
  'Wampa',
  'Dagobah Playset',
  'Hoth Ice Planet Adventure Set',
  'Turret & Probot Playset',
];

async function main() {
  const toyline = await prisma.toyLine.findUnique({ where: { slug: 'star-wars' } });
  if (!toyline) { console.error('Star Wars toyline not found.'); process.exit(1); }

  const vintage = await prisma.series.findUnique({
    where: { toyLineId_slug: { toyLineId: toyline.id, slug: 'vintage' } },
  });
  if (!vintage) { console.error('Vintage series not found.'); process.exit(1); }

  const figSubSeries = await prisma.subSeries.findUnique({
    where: { seriesId_slug: { seriesId: vintage.id, slug: 'figures' } },
  });
  const vehSubSeries = await prisma.subSeries.findUnique({
    where: { seriesId_slug: { seriesId: vintage.id, slug: 'vehicles' } },
  });

  const tag = await prisma.tag.upsert({
    where: { toyLineId_name: { toyLineId: toyline.id, name: '1979' } },
    update: {},
    create: { name: '1979', toyLineId: toyline.id },
  });
  console.log(`Tag ready: ${tag.name} (id: ${tag.id})`);

  async function seedList(items, subSeriesId, label) {
    console.log(`\nSeeding ${items.length} ${label}...`);
    let created = 0, skipped = 0;
    for (const name of items) {
      const existing = await prisma.figure.findFirst({
        where: { name, toyLineId: toyline.id, seriesId: vintage.id, year: 1979 },
      });
      if (existing) { console.log(`  Skipped: ${name}`); skipped++; continue; }
      await prisma.figure.create({
        data: {
          name, year: 1979,
          toyLineId: toyline.id, seriesId: vintage.id,
          subSeriesId: subSeriesId || null,
          tags: { create: { tagId: tag.id } },
        },
      });
      console.log(`  Created: ${name}`);
      created++;
    }
    console.log(`${label}: Created ${created}, Skipped ${skipped}`);
  }

  await seedList(figures1979, figSubSeries?.id, 'figures');
  await seedList(vehicles1979, vehSubSeries?.id, 'vehicles');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
