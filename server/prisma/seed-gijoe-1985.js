const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const figures1985 = [
  'Alpine',
  'Airtight',
  'Barbecue',
  'Bazooka',
  'Buzzer (Repaint)',
  'Cobra Commander (Battle Armor)',
  'Crimson Guard',
  'Dusty',
  'Eel',
  'Flint',
  'Footloose',
  'Frostbite',
  'Heavy Metal',
  'Keel-Haul',
  'Lady Jaye',
  'Lamp (Listen \'n Fun)',
  'Quick Kick',
  'Ripper (Repaint)',
  'Shipwreck',
  'Snake Eyes (v2)',
  'Snow Serpent',
  'Tele-Viper',
  'Tomax',
  'Torch (Repaint)',
  'Xamot',
];

const vehicles1985 = [
  'AWE Striker',
  'Armadillo Mini Tank',
  'Bridge Layer',
  'Conquest X-30',
  'FLAK (Repaint)',
  'Ferret ATV',
  'Flight Pod (Trubble Bubble)',
  'Mauler M.B.T.',
  'Moray Hydrofoil',
  'Night Landing (Repaint)',
  'Silver Mirage',
  'Snow Cat',
  'USS Flagg',
  'Cobra Ferret',
  'Cobra Flight Pod',
  'Cobra Moray',
  'Cobra Night Raven S3P',
  'Cobra SNAKE Armor',
  'Cobra Stun',
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
    where: { toyLineId_name: { toyLineId: toyline.id, name: '1985' } },
    update: {},
    create: { name: '1985', toyLineId: toyline.id },
  });
  console.log(`Tag ready: ${tag.name} (id: ${tag.id})`);

  async function seedList(items, subSeriesId, label) {
    console.log(`\nSeeding ${items.length} ${label}...`);
    let created = 0, skipped = 0;
    for (const name of items) {
      const existing = await prisma.figure.findFirst({
        where: { name, toyLineId: toyline.id, seriesId: arah.id, year: 1985 },
      });
      if (existing) { console.log(`  Skipped: ${name}`); skipped++; continue; }
      await prisma.figure.create({
        data: {
          name, year: 1985,
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

  await seedList(figures1985, figSubSeries?.id, 'figures');
  await seedList(vehicles1985, vehSubSeries?.id, 'vehicles');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
