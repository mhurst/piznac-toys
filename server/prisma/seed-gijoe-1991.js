const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const figures1991 = [
  'B.A.T. (v3)',
  'Big Bear',
  'Cobra Commander (v7)',
  'Crimson Guard Immortal',
  'Desert Scorpion',
  'Dusty (v2)',
  'Eco-Warriors Clean-Sweep',
  'Eco-Warriors Cesspool',
  'Eco-Warriors Flint',
  'Eco-Warriors Ozone',
  'Eco-Warriors Sludge Viper',
  'Eco-Warriors Toxo-Zombie',
  'General Hawk (v2)',
  'Grunt (v3)',
  'Heavy Duty',
  'Incinerators',
  'Low-Light (v2)',
  'Mercer (v2)',
  'Red Star',
  'Sci-Fi (v2)',
  'Snake Eyes (v4)',
  'Snow Serpent (v2)',
  'Stalker (v3)',
  'Super Sonic Fighters Major Bludd',
  'Super Sonic Fighters Psyche-Out',
  'Super Sonic Fighters Road Pig',
  'Super Sonic Fighters Rock \'n Roll',
  'Talking Battle Commanders Cobra Commander',
  'Talking Battle Commanders General Hawk',
  'Talking Battle Commanders Overkill',
  'Talking Battle Commanders Stalker',
  'Tracker',
  'Vapor (v2)',
  'Wet-Suit (v2)',
  'Zap (v2)',
];

const vehicles1991 = [
  'Air Commandos Cobra Nightvulture',
  'Air Commandos Sky Creeper',
  'Air Commandos Spirit',
  'Air Commandos Skymate',
  'Attack Cruiser',
  'Battle Copter (Cobra)',
  'Battle Copter (Joe)',
  'Brawler',
  'Cobra Battle Copter',
  'Cobra Earthquake',
  'Cobra Ice Sabre',
  'Cobra Parasite',
  'Eco-Warriors Septic Tank',
  'Eco-Warriors Toxo-Lab',
  'Badger',
  'Battle Wagon',
];

async function main() {
  const toyline = await prisma.toyLine.findUnique({ where: { slug: 'gi-joe' } });
  if (!toyline) { console.error('G.I. Joe toyline not found.'); process.exit(1); }

  const arah = await prisma.series.findUnique({
    where: { toyLineId_slug: { toyLineId: toyline.id, slug: 'arah' } },
  });
  if (!arah) { console.error('ARAH series not found.'); process.exit(1); }

  const figSubSeries = await prisma.subSeries.findUnique({
    where: { seriesId_slug: { seriesId: arah.id, slug: 'figures' } },
  });
  const vehSubSeries = await prisma.subSeries.findUnique({
    where: { seriesId_slug: { seriesId: arah.id, slug: 'vehicles' } },
  });

  const tag = await prisma.tag.upsert({
    where: { toyLineId_name: { toyLineId: toyline.id, name: '1991' } },
    update: {},
    create: { name: '1991', toyLineId: toyline.id },
  });
  console.log(`Tag ready: ${tag.name} (id: ${tag.id})`);

  async function seedList(items, subSeriesId, label) {
    console.log(`\nSeeding ${items.length} ${label}...`);
    let created = 0, skipped = 0;
    for (const name of items) {
      const existing = await prisma.figure.findFirst({
        where: { name, toyLineId: toyline.id, seriesId: arah.id, year: 1991 },
      });
      if (existing) { console.log(`  Skipped: ${name}`); skipped++; continue; }
      await prisma.figure.create({
        data: {
          name, year: 1991,
          toyLineId: toyline.id, seriesId: arah.id,
          subSeriesId: subSeriesId || null,
          tags: { create: { tagId: tag.id } },
        },
      });
      console.log(`  Created: ${name}`);
      created++;
    }
    console.log(`${label}: Created ${created}, Skipped ${skipped}`);
  }

  await seedList(figures1991, figSubSeries?.id, 'figures');
  await seedList(vehicles1991, vehSubSeries?.id, 'vehicles');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
