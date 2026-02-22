const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const figures1980 = [
  'AT-AT Driver',
  'Bespin Security Guard',
  'Bespin Security Guard (Black)',
  'Cloud Car Pilot',
  'Han Solo (Bespin Outfit)',
  'Imperial TIE Fighter Pilot',
  'Luke Skywalker (Hoth Battle Gear)',
  'Rebel Commander',
  'Zuckuss',
];

const vehicles1980 = [
  'AT-AT (Reissue)',
  'Bespin Gantry',
  'Cloud City Playset',
  'Darth Vader\'s TIE Fighter',
  'Imperial Cruiser',
  'PDT-8 (Personnel Deployment Transport)',
  'MLC-3 (Mobile Laser Cannon)',
  'MTV-7 (Multi-Terrain Vehicle)',
  'Rebel Armored Snowspeeder (Reissue)',
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
    where: { toyLineId_name: { toyLineId: toyline.id, name: '1980' } },
    update: {},
    create: { name: '1980', toyLineId: toyline.id },
  });
  console.log(`Tag ready: ${tag.name} (id: ${tag.id})`);

  async function seedList(items, subSeriesId, label) {
    console.log(`\nSeeding ${items.length} ${label}...`);
    let created = 0, skipped = 0;
    for (const name of items) {
      const existing = await prisma.figure.findFirst({
        where: { name, toyLineId: toyline.id, seriesId: vintage.id, year: 1980 },
      });
      if (existing) { console.log(`  Skipped: ${name}`); skipped++; continue; }
      await prisma.figure.create({
        data: {
          name, year: 1980,
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

  await seedList(figures1980, figSubSeries?.id, 'figures');
  await seedList(vehicles1980, vehSubSeries?.id, 'vehicles');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
