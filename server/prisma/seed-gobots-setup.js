const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  // Create GoBots toyline
  const gobots = await prisma.toyLine.upsert({
    where: { slug: 'gobots' },
    update: {},
    create: {
      name: 'GoBots',
      slug: 'gobots',
    },
  });
  console.log(`ToyLine ready: ${gobots.name} (id: ${gobots.id})`);

  // Create main series
  const original = await prisma.series.upsert({
    where: { toyLineId_slug: { toyLineId: gobots.id, slug: 'original' } },
    update: {},
    create: {
      name: 'Original Series',
      slug: 'original',
      toyLineId: gobots.id,
    },
  });
  console.log(`Series ready: ${original.name} (id: ${original.id})`);

  // Create sub-series
  const figures = await prisma.subSeries.upsert({
    where: { seriesId_slug: { seriesId: original.id, slug: 'figures' } },
    update: {},
    create: {
      name: 'Figures',
      slug: 'figures',
      seriesId: original.id,
    },
  });
  console.log(`SubSeries ready: ${figures.name} (id: ${figures.id})`);

  const vehicles = await prisma.subSeries.upsert({
    where: { seriesId_slug: { seriesId: original.id, slug: 'vehicles' } },
    update: {},
    create: {
      name: 'Vehicles',
      slug: 'vehicles',
      seriesId: original.id,
    },
  });
  console.log(`SubSeries ready: ${vehicles.name} (id: ${vehicles.id})`);

  const playsets = await prisma.subSeries.upsert({
    where: { seriesId_slug: { seriesId: original.id, slug: 'playsets' } },
    update: {},
    create: {
      name: 'Playsets',
      slug: 'playsets',
      seriesId: original.id,
    },
  });
  console.log(`SubSeries ready: ${playsets.name} (id: ${playsets.id})`);

  // Create year tags
  for (const year of ['1983', '1984', '1985', '1986', '1987']) {
    const tag = await prisma.tag.upsert({
      where: { toyLineId_name: { toyLineId: gobots.id, name: year } },
      update: {},
      create: { name: year, toyLineId: gobots.id },
    });
    console.log(`Tag ready: ${tag.name} (id: ${tag.id})`);
  }

  // Create faction tags
  for (const faction of ['Guardian', 'Renegade']) {
    const tag = await prisma.tag.upsert({
      where: { toyLineId_name: { toyLineId: gobots.id, name: faction } },
      update: {},
      create: { name: faction, toyLineId: gobots.id },
    });
    console.log(`Tag ready: ${tag.name} (id: ${tag.id})`);
  }

  console.log('\nGoBots toyline setup complete!');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
