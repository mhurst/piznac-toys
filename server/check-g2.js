const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const series = await prisma.series.findFirst({
    where: { slug: 'g2', toyLine: { name: 'Transformers' } },
    include: {
      _count: { select: { figures: true } },
    },
  });

  if (!series) {
    console.log('No G2 series.');
    return;
  }

  console.log(`G2 series id=${series.id}, figures: ${series._count.figures}\n`);

  // Find dedup collision candidates: figures whose notes mention multiple source URLs
  // (can't do this directly; instead look for names where transformerland might duplicate)
  const suspects = ['Optimus Prime', 'Megatron', 'Bumblebee', 'Sideswipe', 'Air Raid'];
  for (const name of suspects) {
    const figs = await prisma.figure.findMany({
      where: { seriesId: series.id, name },
      select: { id: true, name: true, notes: true },
    });
    if (figs.length) {
      console.log(`${name}: ${figs.length} record(s)`);
      for (const f of figs) {
        const sourceLine = (f.notes || '').split('\n').find(l => l.startsWith('Source:'));
        console.log(`  [${f.id}] ${sourceLine || '(no source note)'}`);
      }
    }
  }

  // Overall tag distribution
  const tags = await prisma.tag.findMany({
    where: { toyLine: { name: 'Transformers' } },
    include: { figures: { include: { figure: { select: { seriesId: true }}}}},
  });

  console.log(`\nTop G2 tags:`);
  const tagCounts = tags.map(t => ({
    name: t.name,
    g2Count: t.figures.filter(ft => ft.figure.seriesId === series.id).length,
  })).filter(t => t.g2Count > 0).sort((a, b) => b.g2Count - a.g2Count);

  for (const t of tagCounts.slice(0, 25)) {
    console.log(`  ${t.name}: ${t.g2Count}`);
  }

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
