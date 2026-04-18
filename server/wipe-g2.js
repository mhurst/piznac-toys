const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const series = await prisma.series.findFirst({
    where: { slug: 'g2', toyLine: { name: 'Transformers' } },
  });

  if (!series) {
    console.log('No G2 series found, nothing to wipe.');
    return;
  }

  const figures = await prisma.figure.findMany({
    where: { seriesId: series.id },
    select: { id: true },
  });

  if (figures.length === 0) {
    console.log(`G2 series exists (id=${series.id}) but has no figures. Nothing to delete.`);
    return;
  }

  const count = await prisma.figure.deleteMany({
    where: { seriesId: series.id },
  });

  console.log(`Deleted ${count.count} G2 figures. Photo/Accessory/FigureTag/UserFigure records cascade.`);
  console.log(`G2 series kept (id=${series.id}) for re-import.`);

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
