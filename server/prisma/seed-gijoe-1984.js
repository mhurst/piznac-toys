const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const figures1984 = [
  'Baroness',
  'Blowtorch',
  'Buzzer',
  'Cobra Commander (Hooded)',
  'Copperhead',
  'Cutter',
  'Duke (Mail-In)',
  'Firefly',
  'Mutt & Junkyard',
  'Recondo',
  'Ripper',
  'Roadblock',
  'Scrap-Iron',
  'Spirit Iron-Knife',
  'Storm Shadow',
  'Thunder',
  'Torch',
  'Wild Weasel',
  'Zartan',
];

const vehicles1984 = [
  'CLAW (Covert Light Aerial Weapon)',
  'Chameleon',
  'Killer W.H.A.L.E.',
  'SHARC (Submersible High-speed Attack and Reconnaissance Craft)',
  'Slugger',
  'Sky Hawk',
  'Stinger',
  'Water Moccasin',
  'Zartan\'s Swamp Skier',
  'Cobra HISS (Repaint)',
  'Rattler (Repaint)',
  'ASP (Repaint)',
  'FANG (Repaint)',
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
    where: { toyLineId_name: { toyLineId: toyline.id, name: '1984' } },
    update: {},
    create: { name: '1984', toyLineId: toyline.id },
  });
  console.log(`Tag ready: ${tag.name} (id: ${tag.id})`);

  async function seedList(items, subSeriesId, label) {
    console.log(`\nSeeding ${items.length} ${label}...`);
    let created = 0, skipped = 0;
    for (const name of items) {
      const existing = await prisma.figure.findFirst({
        where: { name, toyLineId: toyline.id, seriesId: arah.id, year: 1984 },
      });
      if (existing) { console.log(`  Skipped: ${name}`); skipped++; continue; }
      await prisma.figure.create({
        data: {
          name, year: 1984,
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

  await seedList(figures1984, figSubSeries?.id, 'figures');
  await seedList(vehicles1984, vehSubSeries?.id, 'vehicles');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
