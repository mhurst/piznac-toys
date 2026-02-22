const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const figures1994 = [
  'Action Sailor',
  'Action Soldier',
  'Action Marine',
  'Action Pilot',
  'Alley Viper (v3)',
  'Beach-Head (v3)',
  'Cobra Commander (v10)',
  'Cobra Viper (v3)',
  'Dial-Tone (v3)',
  'Flint (v4)',
  'Footloose (v2)',
  'Ice Cream Soldier (v2)',
  'Lifeline (v2)',
  'Major Bludd (v2)',
  'Metal-Head (v3)',
  'Night Creeper (v2)',
  'Ninja Force Bushido (v2)',
  'Ninja Force Cobra Night Creeper (v2)',
  'Ninja Force Nunchuk (v2)',
  'Ninja Force Slice (v2)',
  'Ninja Force Snake Eyes (v2)',
  'Ninja Force Storm Shadow (v2)',
  'Roadblock (v4)',
  'Shipwreck (v2)',
  'Snake Eyes (v5)',
  'Star Brigade Cobra B.A.A.T.',
  'Star Brigade Cobra Blackstar',
  'Star Brigade Cobra Commander',
  'Star Brigade Countdown (v2)',
  'Star Brigade Duke (v2)',
  'Star Brigade Effects',
  'Star Brigade Gears',
  'Star Brigade Lunartix Alien Carcass',
  'Star Brigade Lunartix Alien Lobotomaxx',
  'Star Brigade Lunartix Alien Predacon',
  'Star Brigade Ozone (v2)',
  'Star Brigade Payload (v2)',
  'Star Brigade Roadblock (v2)',
  'Star Brigade Space Shot',
  'Stalker (v4)',
  'Viper (v4)',
  'Windchill',
];

const vehicles1994 = [
  'Cobra Liquidator (Repaint)',
  'Cobra Razorblade',
  'Cobra Snow Storm (vehicle)',
  'Power Fighter (Cobra)',
  'Power Fighter (Joe)',
  'Star Brigade Power Fighters Claudus',
  'Star Brigade Power Fighters Galoob',
  'Blockbuster',
  'Razor-Blade',
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
    where: { toyLineId_name: { toyLineId: toyline.id, name: '1994' } },
    update: {},
    create: { name: '1994', toyLineId: toyline.id },
  });
  console.log(`Tag ready: ${tag.name} (id: ${tag.id})`);

  async function seedList(items, subSeriesId, label) {
    console.log(`\nSeeding ${items.length} ${label}...`);
    let created = 0, skipped = 0;
    for (const name of items) {
      const existing = await prisma.figure.findFirst({
        where: { name, toyLineId: toyline.id, seriesId: arah.id, year: 1994 },
      });
      if (existing) { console.log(`  Skipped: ${name}`); skipped++; continue; }
      await prisma.figure.create({
        data: {
          name, year: 1994,
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

  await seedList(figures1994, figSubSeries?.id, 'figures');
  await seedList(vehicles1994, vehSubSeries?.id, 'vehicles');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
