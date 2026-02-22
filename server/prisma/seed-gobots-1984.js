const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const figures1984 = [
  'Small Foot',
  'Path Finder',
  'Rest-Q',
  'Defendor',
  'Stinger',
  'Spoiler',
  'Tail Pipe',
  'Treds',
  'Van Guard',
  'Spoons',
  'Bad Boy',
  'Block Head',
  'Bugsie',
  'Crain Brain',
  'Destroyer',
  'Fly Trap',
  'Herr Fiend',
  'Hornet',
  'Klaws',
  'Night Fright',
  'Pincher',
  'Screw Head',
  'Sky Jack',
  'Slicks',
  'Snoop',
  'Sparky',
  'Twin Spin',
  'Vamp',
  'Wrongway',
  'Zero',
  'Heat Seeker',
  'Boulder',
  'Bug Bite',
  'Pumper',
  'Bolt',
  'Leader-1 (Super GoBot)',
  'Cy-Kill (Super GoBot)',
  'Crasher (Super GoBot)',
  'Cop-Tur (Super GoBot)',
  'Turbo (Super GoBot)',
  'Stinger (Super GoBot)',
];

const vehicles1984 = [
  'Puzzler (Renegade Combiner)',
  'Courageous (Guardian Combiner)',
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
    where: { seriesId_slug: { seriesId: series.id, slug: 'vehicles' } },
  });

  const tag = await prisma.tag.upsert({
    where: { toyLineId_name: { toyLineId: toyline.id, name: '1984' } },
    update: {},
    create: { name: '1984', toyLineId: toyline.id },
  });

  async function seedList(items, subSeriesId, label) {
    console.log(`\nSeeding ${items.length} ${label}...`);
    let created = 0, skipped = 0;
    for (const name of items) {
      const existing = await prisma.figure.findFirst({
        where: { name, toyLineId: toyline.id, seriesId: series.id, year: 1984 },
      });
      if (existing) { console.log(`  Skipped: ${name}`); skipped++; continue; }
      await prisma.figure.create({
        data: {
          name, year: 1984,
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

  await seedList(figures1984, figSubSeries?.id, 'figures');
  await seedList(vehicles1984, vehSubSeries?.id, 'vehicles');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
