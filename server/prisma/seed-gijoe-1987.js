const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const figures1987 = [
  'Big Boa',
  'Chuckles',
  'Cobra Commander (v3)',
  'Cobra-La Team (Golobulus)',
  'Cobra-La Team (Nemesis Enforcer)',
  'Cobra-La Team (Royal Guard)',
  'Crazylegs',
  'Crystal Ball',
  'Croc Master',
  'Falcon',
  'Fast Draw',
  'Gung-Ho (v2)',
  'Jinx',
  'Law & Order',
  'Outback',
  'Psyche-Out',
  'Raptor',
  'Sneak Peek',
  'Steel Brigade',
  'Starduster',
  'Techno-Viper',
  'Tunnel Rat',
];

const vehicles1987 = [
  'BF 2000 Dominator',
  'BF 2000 Eliminator',
  'BF 2000 Marauder',
  'BF 2000 Vector',
  'BF 2000 Vindicator',
  'Cobra Buzz Boar',
  'Cobra Maggot',
  'Cobra Mamba',
  'Cobra Pogo',
  'Cobra Sea Ray',
  'Cobra Wolf',
  'Crossfire Alpha',
  'Crossfire Delta',
  'Defiant Space Shuttle Complex',
  'Earth Borer',
  'Jet Pack',
  'Mobile Command Center',
  'Phantom X-19 Stealth Fighter',
  'Road Toad',
  'Sergeant Slaughter\'s Triple T (Repaint)',
  'Sky Patrol Sky Sweeper',
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
    where: { toyLineId_name: { toyLineId: toyline.id, name: '1987' } },
    update: {},
    create: { name: '1987', toyLineId: toyline.id },
  });
  console.log(`Tag ready: ${tag.name} (id: ${tag.id})`);

  async function seedList(items, subSeriesId, label) {
    console.log(`\nSeeding ${items.length} ${label}...`);
    let created = 0, skipped = 0;
    for (const name of items) {
      const existing = await prisma.figure.findFirst({
        where: { name, toyLineId: toyline.id, seriesId: arah.id, year: 1987 },
      });
      if (existing) { console.log(`  Skipped: ${name}`); skipped++; continue; }
      await prisma.figure.create({
        data: {
          name, year: 1987,
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

  await seedList(figures1987, figSubSeries?.id, 'figures');
  await seedList(vehicles1987, vehSubSeries?.id, 'vehicles');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
