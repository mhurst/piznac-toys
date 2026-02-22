const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const figures1990 = [
  'Ambush',
  'B.A.T. (v2)',
  'Bullhorn',
  'Captain Grid-Iron',
  'Cobra Commander (v6)',
  'Countdown',
  'Dee-Jay (v2)',
  'Free Fall',
  'Freefall',
  'Hot Seat',
  'Laser-Viper',
  'Major Storm',
  'Metal-Head',
  'Night Creeper',
  'Pathfinder',
  'Range-Viper',
  'Rapid-Fire',
  'Rock-Viper',
  'S.A.W. Viper',
  'Salvo',
  'Stretcher',
  'Sub-Zero',
  'Topside',
  'Undertow',
  'Vapor',
  'Sky Patrol Airborne',
  'Sky Patrol Altitude',
  'Sky Patrol Drop Zone',
  'Sky Patrol Sky Dive',
  'Sky Patrol Static Line',
  'Sonic Fighters Dial-Tone',
  'Sonic Fighters Dodger',
  'Sonic Fighters Law',
  'Sonic Fighters Road Pig',
  'Sonic Fighters Tunnel Rat',
  'Sonic Fighters Viper',
];

const vehicles1990 = [
  'Cobra Hammerhead',
  'Cobra Hurricane',
  'Cobra Overlord\'s Dictator',
  'Cobra Piranha',
  'Cobra Rage (Repaint)',
  'General',
  'Hammer',
  'Locust',
  'Avalanche',
  'Retaliator',
  'Sky Hawk (Repaint)',
  'Sky Patrol Sky Havoc',
  'Sky Patrol Sky Raven',
  'Sky Patrol Sky Sharc',
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
    where: { toyLineId_name: { toyLineId: toyline.id, name: '1990' } },
    update: {},
    create: { name: '1990', toyLineId: toyline.id },
  });
  console.log(`Tag ready: ${tag.name} (id: ${tag.id})`);

  async function seedList(items, subSeriesId, label) {
    console.log(`\nSeeding ${items.length} ${label}...`);
    let created = 0, skipped = 0;
    for (const name of items) {
      const existing = await prisma.figure.findFirst({
        where: { name, toyLineId: toyline.id, seriesId: arah.id, year: 1990 },
      });
      if (existing) { console.log(`  Skipped: ${name}`); skipped++; continue; }
      await prisma.figure.create({
        data: {
          name, year: 1990,
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

  await seedList(figures1990, figSubSeries?.id, 'figures');
  await seedList(vehicles1990, vehSubSeries?.id, 'vehicles');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
