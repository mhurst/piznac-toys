const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const figures1981 = [
  'Admiral Ackbar',
  'AT-ST Driver',
  'Bib Fortuna',
  'Biker Scout',
  'Chief Chirpa',
  'Emperor\'s Royal Guard',
  'Gamorrean Guard',
  'General Madine',
  'Han Solo (Trench Coat)',
  'Klaatu',
  'Lando Calrissian (Skiff Guard Disguise)',
  'Leia (Boushh Disguise)',
  'Logray',
  'Luke Skywalker (Jedi Knight)',
  'Nien Nunb',
  'Princess Leia (Combat Poncho)',
  'Prune Face',
  'Ree-Yees',
  'Squid Head',
  'Weequay',
  'Wicket W. Warrick',
  '8D8',
  'B-Wing Pilot',
  'The Emperor',
  'Klaatu (Skiff Guard)',
  'Nikto',
  'Rebel Commando',
  'Teebo',
];

const vehicles1981 = [
  'B-Wing Fighter',
  'Ewok Village',
  'Imperial Shuttle',
  'Jabba the Hutt Playset',
  'Rancor Monster',
  'Speeder Bike',
  'TIE Interceptor',
  'Y-Wing Fighter',
  'Jabba\'s Dungeon Playset',
  'Sy Snootles & the Rebo Band',
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
    where: { toyLineId_name: { toyLineId: toyline.id, name: '1981' } },
    update: {},
    create: { name: '1981', toyLineId: toyline.id },
  });
  console.log(`Tag ready: ${tag.name} (id: ${tag.id})`);

  async function seedList(items, subSeriesId, label) {
    console.log(`\nSeeding ${items.length} ${label}...`);
    let created = 0, skipped = 0;
    for (const name of items) {
      const existing = await prisma.figure.findFirst({
        where: { name, toyLineId: toyline.id, seriesId: vintage.id, year: 1981 },
      });
      if (existing) { console.log(`  Skipped: ${name}`); skipped++; continue; }
      await prisma.figure.create({
        data: {
          name, year: 1981,
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

  await seedList(figures1981, figSubSeries?.id, 'figures');
  await seedList(vehicles1981, vehSubSeries?.id, 'vehicles');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
