const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const uploadsDir = path.join(__dirname, 'uploads');
const catalogDir = path.join(__dirname, 'catalog-images');

async function main() {
  if (!fs.existsSync(catalogDir)) fs.mkdirSync(catalogDir, { recursive: true });

  // 1. Collect all filenames actually referenced in the DB
  const photos = await prisma.photo.findMany({ select: { filename: true } });
  const accessories = await prisma.accessory.findMany({ select: { image: true } });

  const referenced = new Set();
  for (const p of photos) if (p.filename) referenced.add(p.filename);
  for (const a of accessories) if (a.image) referenced.add(a.image);

  console.log(`DB-referenced files: ${referenced.size}`);

  // 2. Remove orphan files that I may have already copied into catalog-images in an earlier pass
  const catalogFiles = fs.readdirSync(catalogDir);
  let orphansRemoved = 0;
  for (const f of catalogFiles) {
    if (!referenced.has(f)) {
      // Only delete files modified today (to avoid nuking images from previous legitimate deploys
      // that may have been removed from the DB but are still historically staged)
      const stat = fs.statSync(path.join(catalogDir, f));
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (stat.mtime >= today) {
        fs.unlinkSync(path.join(catalogDir, f));
        orphansRemoved++;
      }
    }
  }
  if (orphansRemoved > 0) console.log(`Removed ${orphansRemoved} orphan files staged earlier today`);

  // 3. Copy any referenced file that isn't already in catalog-images
  const currentCatalog = new Set(fs.readdirSync(catalogDir));
  let copied = 0;
  let missingInUploads = 0;
  for (const f of referenced) {
    if (currentCatalog.has(f)) continue;
    const src = path.join(uploadsDir, f);
    if (!fs.existsSync(src)) {
      missingInUploads++;
      continue;
    }
    fs.copyFileSync(src, path.join(catalogDir, f));
    copied++;
  }

  console.log(`Copied ${copied} referenced files to catalog-images/`);
  if (missingInUploads > 0) console.log(`Warning: ${missingInUploads} DB-referenced files missing from uploads/`);

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
