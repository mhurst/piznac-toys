const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const figures1989 = [
  'Alley Viper',
  'Backblast',
  'Cobra Commander (v5)',
  'Deep Six (v2)',
  'Dee-Jay',
  'Destro (v3, Iron Grenadier)',
  'Downtown',
  'Frag-Viper',
  'Gnawgahyde',
  'Gung-Ho (v3)',
  'H.E.A.T. Viper',
  'Long Range',
  'Night Viper',
  'Python Crimson Guard',
  'Python Cobra Officer',
  'Python Cobra Trooper',
  'Python Copperhead',
  'Python Tele-Viper',
  'Python Viper',
  'Recoil',
  'Rock \'n Roll (v2)',
  'Scoop',
  'Snake Eyes (v3)',
  'Stalker (v2)',
  'Slaughter\'s Marauders Barbecue',
  'Slaughter\'s Marauders Footloose',
  'Slaughter\'s Marauders Low-Light',
  'Slaughter\'s Marauders Mutt & Junkyard',
  'Slaughter\'s Marauders Spirit',
  'Slaughter\'s Marauders Sgt. Slaughter',
  'Targat',
];

const vehicles1989 = [
  'Cobra Condor Z25',
  'Cobra F.A.N.G. II',
  'Cobra Imp',
  'Cobra Night Boomer',
  'Cobra Python Conquest',
  'Cobra Python A.S.P.',
  'Cobra Python Stun',
  'Cobra Rage',
  'Crusader Space Shuttle',
  'Darklon\'s Evader',
  'Mudbuster',
  'Raider',
  'Slaughter\'s Marauders Armadillo',
  'Slaughter\'s Marauders Equalizer',
  'Slaughter\'s Marauders Lynx',
  'Thunderclap',
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
    where: { toyLineId_name: { toyLineId: toyline.id, name: '1989' } },
    update: {},
    create: { name: '1989', toyLineId: toyline.id },
  });
  console.log(`Tag ready: ${tag.name} (id: ${tag.id})`);

  async function seedList(items, subSeriesId, label) {
    console.log(`\nSeeding ${items.length} ${label}...`);
    let created = 0, skipped = 0;
    for (const name of items) {
      const existing = await prisma.figure.findFirst({
        where: { name, toyLineId: toyline.id, seriesId: arah.id, year: 1989 },
      });
      if (existing) { console.log(`  Skipped: ${name}`); skipped++; continue; }
      await prisma.figure.create({
        data: {
          name, year: 1989,
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

  await seedList(figures1989, figSubSeries?.id, 'figures');
  await seedList(vehicles1989, vehSubSeries?.id, 'vehicles');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
