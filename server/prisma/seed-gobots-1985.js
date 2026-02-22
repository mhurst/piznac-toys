const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const figures1985 = [
  'Ace',
  'Bent Wing',
  'Bladez',
  'Bullseye',
  'Clutch',
  'Dart',
  'Decker Decker',
  'Fossil',
  'Guide Star',
  'Gunnyr',
  'Major Mo',
  'Odd Ball',
  'Re-Volt',
  'Rifle',
  'Scope',
  'Sky Fly',
  'Stretch',
  'Throttle',
  'Tic Toc',
  'Tri-Trak',
  'Twister',
  'Man-O-War',
  'Breez',
  'Mach-3',
  'Sniper',
  'Psycho',
  'Warpath',
  'Crossword',
  'Raizor',
  'Vain Train',
  'Pocket',
  'Beamer',
  'Tux',
  'Street Heat',
  'Hi-Way',
  'Fast Track',
  'Bullet',
  'Solitaire',
  'Rumble',
  'Flipper',
];

const vehicles1985 = [
  'Power Suit (Guardian)',
  'Power Suit (Renegade)',
  'Power Warrior Courageous',
  'Power Warrior Grungy',
  'Astro Beam',
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
    where: { toyLineId_name: { toyLineId: toyline.id, name: '1985' } },
    update: {},
    create: { name: '1985', toyLineId: toyline.id },
  });

  async function seedList(items, subSeriesId, label) {
    console.log(`\nSeeding ${items.length} ${label}...`);
    let created = 0, skipped = 0;
    for (const name of items) {
      const existing = await prisma.figure.findFirst({
        where: { name, toyLineId: toyline.id, seriesId: series.id, year: 1985 },
      });
      if (existing) { console.log(`  Skipped: ${name}`); skipped++; continue; }
      await prisma.figure.create({
        data: {
          name, year: 1985,
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

  await seedList(figures1985, figSubSeries?.id, 'figures');
  await seedList(vehicles1985, vehSubSeries?.id, 'vehicles');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
