const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const figures1983 = [
  'Airborne',
  'Breaker (Swivel-Arm)',
  'Clutch (Swivel-Arm)',
  'Cobra Commander (Swivel-Arm)',
  'Cobra Officer (Swivel-Arm)',
  'Cobra (Swivel-Arm)',
  'Cover Girl',
  'Doc',
  'Duke',
  'Destro',
  'Flash (Swivel-Arm)',
  'Gung-Ho',
  'Grand Slam (Swivel-Arm)',
  'Grunt (Swivel-Arm)',
  'Hawk (Swivel-Arm)',
  'Major Bludd',
  'Rock \'n Roll (Swivel-Arm)',
  'Scarlett (Swivel-Arm)',
  'Short-Fuze (Swivel-Arm)',
  'Snake Eyes (Swivel-Arm)',
  'Snow Job',
  'Stalker (Swivel-Arm)',
  'Steeler (Swivel-Arm)',
  'Torpedo',
  'Tripwire',
  'Wild Bill',
  'Zap (Swivel-Arm)',
];

const vehicles1983 = [
  'APC (Amphibious Personnel Carrier)',
  'Dragonfly XH-1',
  'Falcon (Attack Glider)',
  'PAC/RAT (Programmable Attack Computer)',
  'Polar Battle Bear',
  'Skystriker XP-14F',
  'WHIRLWIND (Twin Battle Gun)',
  'Wolverine',
  'Cobra ASP (Assault System Pod)',
  'Cobra FANG (Fully Armed Negator Gyrocopter)',
  'Cobra Night Landing',
  'Cobra Rattler',
  'SMS (Strategic Missile System)',
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
    where: { toyLineId_name: { toyLineId: toyline.id, name: '1983' } },
    update: {},
    create: { name: '1983', toyLineId: toyline.id },
  });
  console.log(`Tag ready: ${tag.name} (id: ${tag.id})`);

  async function seedList(items, subSeriesId, label) {
    console.log(`\nSeeding ${items.length} ${label}...`);
    let created = 0, skipped = 0;
    for (const name of items) {
      const existing = await prisma.figure.findFirst({
        where: { name, toyLineId: toyline.id, seriesId: arah.id, year: 1983 },
      });
      if (existing) { console.log(`  Skipped: ${name}`); skipped++; continue; }
      await prisma.figure.create({
        data: {
          name, year: 1983,
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

  await seedList(figures1983, figSubSeries?.id, 'figures');
  await seedList(vehicles1983, vehSubSeries?.id, 'vehicles');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
