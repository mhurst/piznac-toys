const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const figures1983 = [
  'Leader-1',
  'Cy-Kill',
  'Turbo',
  'Crasher',
  'Cop-Tur',
  'Tank',
  'Dumper',
  'Geeper-Creeper',
  'Scooter',
  'Loco',
  'Hans-Cuff',
  'Road Ranger',
  'Fitor',
  'BuggyMan',
  'Royal-T',
  'Blaster',
  'Water Walk',
  'Dive-Dive',
  'Baron Von Joy',
  'Night Ranger',
  'Flip Top',
  'Scratch',
  'Dozer',
  'Spay-C',
];

const vehicles1983 = [
  'Command Center',
  'Thruster',
];

async function main() {
  const toyline = await prisma.toyLine.findUnique({ where: { slug: 'gobots' } });
  if (!toyline) { console.error('GoBots toyline not found.'); process.exit(1); }

  const series = await prisma.series.findUnique({
    where: { toyLineId_slug: { toyLineId: toyline.id, slug: 'original' } },
  });
  if (!series) { console.error('Original series not found.'); process.exit(1); }

  const figSubSeries = await prisma.subSeries.findUnique({
    where: { seriesId_slug: { seriesId: series.id, slug: 'figures' } },
  });
  const vehSubSeries = await prisma.subSeries.findUnique({
    where: { seriesId_slug: { seriesId: series.id, slug: 'playsets' } },
  });

  const tag = await prisma.tag.upsert({
    where: { toyLineId_name: { toyLineId: toyline.id, name: '1983' } },
    update: {},
    create: { name: '1983', toyLineId: toyline.id },
  });

  async function seedList(items, subSeriesId, label) {
    console.log(`\nSeeding ${items.length} ${label}...`);
    let created = 0, skipped = 0;
    for (const name of items) {
      const existing = await prisma.figure.findFirst({
        where: { name, toyLineId: toyline.id, seriesId: series.id, year: 1983 },
      });
      if (existing) { console.log(`  Skipped: ${name}`); skipped++; continue; }
      await prisma.figure.create({
        data: {
          name, year: 1983,
          toyLineId: toyline.id, seriesId: series.id,
          subSeriesId: subSeriesId || null,
          tags: { create: { tagId: tag.id } },
        },
      });
      console.log(`  Created: ${name}`);
      created++;
    }
    console.log(`${label}: Created ${created}, Skipped ${skipped}`);
  }

  await seedList(figures1983, figSubSeries?.id, 'figures');
  await seedList(vehicles1983, vehSubSeries?.id, 'playsets');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
