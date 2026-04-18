const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const catalogDir = path.join(__dirname, 'catalog-images');

async function main() {
  const photos = await prisma.photo.findMany({ select: { filename: true } });
  const accessories = await prisma.accessory.findMany({ select: { image: true } });

  const referenced = new Set();
  for (const p of photos) if (p.filename) referenced.add(p.filename);
  for (const a of accessories) if (a.image) referenced.add(a.image);

  console.log(`DB-referenced files: ${referenced.size}`);

  // Only operate on files NOT tracked by git (i.e., added in this session)
  const untrackedOutput = execSync('git ls-files --others --exclude-standard', {
    cwd: path.join(__dirname, '..'),
    encoding: 'utf-8',
  });
  const untrackedFiles = untrackedOutput
    .split(/\r?\n/)
    .filter(l => l.startsWith('server/catalog-images/'))
    .map(l => path.basename(l));

  console.log(`Untracked files in catalog-images/: ${untrackedFiles.length}`);

  const untrackedOrphans = untrackedFiles.filter(f => !referenced.has(f));
  console.log(`  └─ of those, ${untrackedOrphans.length} are NOT referenced by DB (orphans)`);

  const shouldDelete = process.argv.includes('--delete');
  if (!shouldDelete) {
    console.log('\n(Dry run — pass --delete to remove these orphans only)');
    await prisma.$disconnect();
    return;
  }

  let deleted = 0;
  for (const f of untrackedOrphans) {
    fs.unlinkSync(path.join(catalogDir, f));
    deleted++;
  }
  console.log(`\nDeleted ${deleted} orphan files (untracked + unreferenced) from catalog-images/`);

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
