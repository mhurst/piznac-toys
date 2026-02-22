const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const figures1986 = [
  'Leader-1 (Reissue)',
  'Cy-Kill (Reissue)',
  'Turbo (Reissue)',
  'Crasher (Reissue)',
  'Cop-Tur (Reissue)',
  'Scooter (Reissue)',
  'Monsterous - Heart Attack',
  'Monsterous - Fangs',
  'Monsterous - Fright Face',
  'Monsterous - Gore Jaw',
  'Monsterous - Weird Wing',
  'Monsterous - South Claw',
  'Puzzler - Zig Zag',
  'Puzzler - Pocket',
  'Puzzler - Rube',
  'Puzzler - Crossword',
  'Puzzler - Jig Saw',
  'Puzzler - Tic Tac',
];

const vehicles1986 = [
  'Command Center (Reissue)',
  'Thruster (Reissue)',
  'Monsterous (Combined Form)',
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
    where: { toyLineId_name: { toyLineId: toyline.id, name: '1986' } },
    update: {},
    create: { name: '1986', toyLineId: toyline.id },
  });

  async function seedList(items, subSeriesId, label) {
    console.log(`\nSeeding ${items.length} ${label}...`);
    let created = 0, skipped = 0;
    for (const name of items) {
      const existing = await prisma.figure.findFirst({
        where: { name, toyLineId: toyline.id, seriesId: series.id, year: 1986 },
      });
      if (existing) { console.log(`  Skipped: ${name}`); skipped++; continue; }
      await prisma.figure.create({
        data: {
          name, year: 1986,
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

  await seedList(figures1986, figSubSeries?.id, 'figures');
  await seedList(vehicles1986, vehSubSeries?.id, 'vehicles');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
