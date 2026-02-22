const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const figures1993 = [
  'Alley Viper (v2)',
  'B.A.T. (v5)',
  'Bazooka (v2)',
  'Beach-Head (v2)',
  'Cobra Commander (v9)',
  'Cobra Detonator Driver',
  'Colonel Courage',
  'Cross-Country (v2)',
  'Crimson Guard Commander',
  'Dart',
  'Dr. Mindbender (v2)',
  'Duke (v4)',
  'Flint (v3)',
  'Frostbite (v2)',
  'General Flagg (v2)',
  'Gristle',
  'H.E.A.T. Viper (v2)',
  'Headhunter Stormtrooper',
  'Ice Cream Soldier',
  'Interrogator',
  'Keel-Haul (v2)',
  'Leatherneck (v2)',
  'Long Arm',
  'Mace',
  'Metal-Head (v2)',
  'Mirage',
  'Muskrat (v2)',
  'Night Creeper Leader',
  'Ninja Force Banzai',
  'Ninja Force Bushido',
  'Ninja Force Cobra Night Creeper',
  'Ninja Force Scarlett',
  'Ninja Force Snake Eyes',
  'Ninja Force Zartan',
  'Outback (v2)',
  'Road Pig (v2)',
  'Roadblock (v3)',
  'Snow Storm',
  'Star Brigade Armor-Bot',
  'Star Brigade Astro-Viper',
  'Star Brigade Countdown',
  'Star Brigade Duke',
  'Star Brigade Hawk',
  'Star Brigade Ozone',
  'Star Brigade Payload',
  'Star Brigade Roadblock',
  'Star Brigade Sci-Fi',
  'Star Brigade T.A.R.G.A.T.',
  'Wet-Suit (v3)',
  'Wild Bill (v3)',
];

const vehicles1993 = [
  'Cobra Detonator (v2)',
  'Cobra Invader',
  'Cobra Parasite (Repaint)',
  'Cobra Rat (Repaint)',
  'Ghost Striker X-16',
  'Ghoststriker',
  'Mudbuster (Repaint)',
  'Shark 9000 (Repaint)',
  'Star Brigade Armor Bot Vehicle',
  'Star Brigade Starfighter',
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
    where: { toyLineId_name: { toyLineId: toyline.id, name: '1993' } },
    update: {},
    create: { name: '1993', toyLineId: toyline.id },
  });
  console.log(`Tag ready: ${tag.name} (id: ${tag.id})`);

  async function seedList(items, subSeriesId, label) {
    console.log(`\nSeeding ${items.length} ${label}...`);
    let created = 0, skipped = 0;
    for (const name of items) {
      const existing = await prisma.figure.findFirst({
        where: { name, toyLineId: toyline.id, seriesId: arah.id, year: 1993 },
      });
      if (existing) { console.log(`  Skipped: ${name}`); skipped++; continue; }
      await prisma.figure.create({
        data: {
          name, year: 1993,
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

  await seedList(figures1993, figSubSeries?.id, 'figures');
  await seedList(vehicles1993, vehSubSeries?.id, 'vehicles');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
