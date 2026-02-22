const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const figures1992 = [
  'Barricade',
  'B.A.T. (v4)',
  'Big Bear (v2)',
  'Cobra Commander (v8)',
  'Cobra Ninja Viper',
  'DEF Bullet-Proof',
  'DEF Cutter',
  'DEF Headman',
  'DEF Mutt & Junkyard',
  'DEF Shockwave',
  'Destro (v4)',
  'Duke (v3)',
  'Eco-Warriors Barbecue',
  'Eco-Warriors Deep Six',
  'Eco-Warriors Cobra Commander',
  'Firefly (v2)',
  'Flak-Viper',
  'General Flagg',
  'Gung-Ho (v4)',
  'Headhunter',
  'Ninja Force Dojo',
  'Ninja Force Nunchuk',
  'Ninja Force Slice',
  'Ninja Force Storm Shadow',
  'Ninja Force T\'Jbang',
  'Spirit (v2)',
  'Storm Shadow (v3)',
  'Talking Battle Commanders Cobra Commander',
  'Talking Battle Commanders General Hawk',
  'Talking Battle Commanders Overkill',
  'Talking Battle Commanders Stalker',
  'Toxo-Viper (v2)',
  'Wild Bill (v2)',
];

const vehicles1992 = [
  'Air Commandos Air Devil',
  'Air Commandos Cloudburst',
  'Barracuda',
  'Cobra Detonator',
  'Cobra Earthquake (Repaint)',
  'Cobra Liquidator',
  'Cobra Rat',
  'Cobra Battle Copter (v2)',
  'Eco-Warriors Eco Striker',
  'Fort America',
  'G.I. Joe Battle Copter (v2)',
  'Headquarters',
  'Hurricane',
  'Patriot',
  'Shark 9000',
  'Storm Eagle',
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
    where: { toyLineId_name: { toyLineId: toyline.id, name: '1992' } },
    update: {},
    create: { name: '1992', toyLineId: toyline.id },
  });
  console.log(`Tag ready: ${tag.name} (id: ${tag.id})`);

  async function seedList(items, subSeriesId, label) {
    console.log(`\nSeeding ${items.length} ${label}...`);
    let created = 0, skipped = 0;
    for (const name of items) {
      const existing = await prisma.figure.findFirst({
        where: { name, toyLineId: toyline.id, seriesId: arah.id, year: 1992 },
      });
      if (existing) { console.log(`  Skipped: ${name}`); skipped++; continue; }
      await prisma.figure.create({
        data: {
          name, year: 1992,
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

  await seedList(figures1992, figSubSeries?.id, 'figures');
  await seedList(vehicles1992, vehSubSeries?.id, 'vehicles');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
