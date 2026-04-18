const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const toyLine = await prisma.toyLine.findUnique({
    where: { name: 'Transformers' },
    include: {
      series: {
        include: {
          subSeries: true,
          _count: { select: { figures: true } },
        },
        orderBy: { name: 'asc' },
      },
    },
  });

  if (!toyLine) {
    console.log('No "Transformers" ToyLine found.');
    return;
  }

  console.log(`ToyLine: ${toyLine.name} (id=${toyLine.id}, slug=${toyLine.slug})\n`);
  console.log(`Series (${toyLine.series.length}):`);
  for (const s of toyLine.series) {
    console.log(`  - ${s.name} (id=${s.id}, slug=${s.slug}) — ${s._count.figures} figures`);
    for (const sub of s.subSeries) {
      console.log(`      • SubSeries: ${sub.name} (slug=${sub.slug})`);
    }
  }

  // Any figures with G2-era years?
  const g2Years = await prisma.figure.findMany({
    where: {
      toyLineId: toyLine.id,
      year: { in: [1993, 1994, 1995] },
    },
    select: { id: true, name: true, year: true, series: { select: { name: true } } },
    orderBy: { name: 'asc' },
  });
  console.log(`\nFigures with G2-era years (1993-1995): ${g2Years.length}`);
  for (const f of g2Years) {
    console.log(`  [${f.id}] ${f.name} (${f.year}) — Series: ${f.series?.name || 'none'}`);
  }

  // How are G1 subgroups stored — SubSeries vs Tags?
  const g1 = toyLine.series.find(s => s.slug === 'g1');
  if (g1) {
    const withSubSeries = await prisma.figure.count({
      where: { seriesId: g1.id, subSeriesId: { not: null } },
    });
    const figuresTotal = await prisma.figure.count({ where: { seriesId: g1.id } });
    console.log(`\nG1 subgroup storage:`);
    console.log(`  Figures with subSeriesId set: ${withSubSeries} / ${figuresTotal}`);
    console.log(`  SubSeries defined: ${g1.subSeries.length}`);
  }

  const tags = await prisma.tag.findMany({ where: { toyLineId: toyLine.id }, orderBy: { name: 'asc' } });
  console.log(`\nTransformers tags (${tags.length}):`);
  for (const t of tags) console.log(`  - ${t.name} (id=${t.id})`);

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
