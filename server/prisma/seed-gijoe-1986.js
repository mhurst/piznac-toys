const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const figures1986 = [
  'B.A.T. (Battle Android Trooper)',
  'Beach Head',
  'Claymore',
  'Cobra Commander (Battle Armor v2)',
  'Cross-Country',
  'Dial-Tone',
  'Dr. Mindbender',
  'General Hawk',
  'Iceberg',
  'Leatherneck',
  'Lifeline',
  'Low-Light',
  'Mainframe',
  'Monkeywrench',
  'Roadblock (v2)',
  'Sci-Fi',
  'Serpentor',
  'Sgt. Slaughter',
  'Sgt. Slaughter\'s Renegades (Mercer)',
  'Sgt. Slaughter\'s Renegades (Red Dog)',
  'Sgt. Slaughter\'s Renegades (Taurus)',
  'Special Missions: Brazil (Claymore)',
  'Strato-Viper',
  'Thrasher',
  'Viper',
  'Wet-Suit',
  'Zarana',
  'Zandar',
];

const vehicles1986 = [
  'Air Chariot',
  'Conquest X-30 (Repaint)',
  'Dreadnok Air Skiff',
  'Dreadnok Cycle',
  'Dreadnok Swamp Fire',
  'Havoc',
  'L.C.V. Recon Sled',
  'SLAM (Strategic Long-range Artillery Machine)',
  'Stun (Repaint)',
  'Terror Drome',
  'Tomahawk',
  'Triple T (Tag Team Terminator)',
  'Cobra Hydrofoil',
  'Cobra Night Raven (Repaint)',
  'Cobra Stinger (Repaint)',
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
    where: { toyLineId_name: { toyLineId: toyline.id, name: '1986' } },
    update: {},
    create: { name: '1986', toyLineId: toyline.id },
  });
  console.log(`Tag ready: ${tag.name} (id: ${tag.id})`);

  async function seedList(items, subSeriesId, label) {
    console.log(`\nSeeding ${items.length} ${label}...`);
    let created = 0, skipped = 0;
    for (const name of items) {
      const existing = await prisma.figure.findFirst({
        where: { name, toyLineId: toyline.id, seriesId: arah.id, year: 1986 },
      });
      if (existing) { console.log(`  Skipped: ${name}`); skipped++; continue; }
      await prisma.figure.create({
        data: {
          name, year: 1986,
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

  await seedList(figures1986, figSubSeries?.id, 'figures');
  await seedList(vehicles1986, vehSubSeries?.id, 'vehicles');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
