const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const figures1988 = [
  'Astro-Viper',
  'Budo',
  'Charbroil',
  'Cobra Commander (v4)',
  'Destro (v2)',
  'Hardball',
  'Hit & Run',
  'Hydro-Viper',
  'Iron Grenadier',
  'Lightfoot',
  'Muskrat',
  'Night Force (Charbroil)',
  'Night Force (Crazylegs)',
  'Night Force (Falcon)',
  'Night Force (Lightfoot)',
  'Night Force (Outback)',
  'Night Force (Psyche-Out)',
  'Night Force (Repeater)',
  'Night Force (Sneak Peek)',
  'Night Force (Spearhead)',
  'Night Force (Tunnel Rat)',
  'Repeater',
  'Road Pig',
  'Shockwave',
  'Spearhead & Max',
  'Storm Shadow (v2)',
  'Tiger Force Bazooka',
  'Tiger Force Duke',
  'Tiger Force Dusty',
  'Tiger Force Flint',
  'Tiger Force Lifeline',
  'Tiger Force Roadblock',
  'Tiger Force Tripwire',
  'Toxo-Viper',
  'Voltar',
];

const vehicles1988 = [
  'AGP (Anti-Gravity Pod)',
  'Cobra Adder',
  'Cobra B.U.G.G.',
  'Cobra I.M.P.',
  'Cobra Stellar Stiletto',
  'Desert Fox 6WD',
  'Mean Dog',
  'Night Blaster',
  'Night Force Night Striker',
  'Night Force Night Storm',
  'Night Shade',
  'Phantom X-19 (Repaint)',
  'R.P.V.',
  'Rolling Thunder',
  'Skystorm X-Wing Chopper',
  'Swampmasher',
  'Tiger Cat',
  'Tiger Fly',
  'Tiger Paw',
  'Tiger Sting',
  'Tiger Fish',
  'Warthog A.I.F.V.',
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
    where: { toyLineId_name: { toyLineId: toyline.id, name: '1988' } },
    update: {},
    create: { name: '1988', toyLineId: toyline.id },
  });
  console.log(`Tag ready: ${tag.name} (id: ${tag.id})`);

  async function seedList(items, subSeriesId, label) {
    console.log(`\nSeeding ${items.length} ${label}...`);
    let created = 0, skipped = 0;
    for (const name of items) {
      const existing = await prisma.figure.findFirst({
        where: { name, toyLineId: toyline.id, seriesId: arah.id, year: 1988 },
      });
      if (existing) { console.log(`  Skipped: ${name}`); skipped++; continue; }
      await prisma.figure.create({
        data: {
          name, year: 1988,
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

  await seedList(figures1988, figSubSeries?.id, 'figures');
  await seedList(vehicles1988, vehSubSeries?.id, 'vehicles');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
