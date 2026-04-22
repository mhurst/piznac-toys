const { PrismaClient } = require('@prisma/client');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();
const SCRAPED_DIR = path.join(__dirname, 'data', 'transformerland');
const UPLOADS_DIR = path.join(__dirname, 'uploads');

const TOYLINE_NAME = 'Transformers';
const SERIES_NAME = 'G1';
const SET_TAG_NAME = 'Micromaster Set';
const DEFAULT_YEAR = 1989;

const NAME_FIXES = {
  'Battlefield Headquarters with Full-Barrel and...': 'Battlefield Headquarters with Full-Barrel and Overflow',
};

function sanitizeFilename(name) {
  return name.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_').toLowerCase();
}

async function processWebp(srcPath, destFilename) {
  const destPath = path.join(UPLOADS_DIR, destFilename);
  if (fs.existsSync(destPath)) return destFilename;
  await sharp(srcPath)
    .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 80 })
    .toFile(destPath);
  return destFilename;
}

function parseAccName(rawName) {
  const qtyMatch = rawName.match(/\(x(\d+)\)/);
  const qty = qtyMatch ? parseInt(qtyMatch[1]) : 1;
  const name = rawName
    .replace(/\s*\(x\d+\)\s*/g, '')
    .replace(/\s*\(Part of Figure\)\s*/g, '')
    .trim();
  return { name, qty };
}

async function main() {
  const resultsFile = path.join(SCRAPED_DIR, 'results.json');
  const results = JSON.parse(fs.readFileSync(resultsFile, 'utf8'));

  const toyLine = await prisma.toyLine.findFirst({ where: { name: TOYLINE_NAME } });
  const series = await prisma.series.findFirst({ where: { toyLineId: toyLine.id, name: SERIES_NAME } });

  let setTag = await prisma.tag.findFirst({
    where: { toyLineId: toyLine.id, name: SET_TAG_NAME },
  });
  if (!setTag) {
    setTag = await prisma.tag.create({
      data: { name: SET_TAG_NAME, toyLineId: toyLine.id },
    });
    console.log(`Created tag "${SET_TAG_NAME}" (id=${setTag.id})`);
  } else {
    console.log(`Tag "${SET_TAG_NAME}" exists (id=${setTag.id})`);
  }

  const alliances = {};
  for (const name of ['Autobot', 'Decepticon']) {
    alliances[name] = await prisma.tag.findFirst({
      where: { toyLineId: toyLine.id, name },
    });
  }

  const mmEntries = Object.entries(results).filter(
    ([, v]) => v.subgroup === 'Micromasters',
  );
  console.log(`\nFound ${mmEntries.length} Micromaster set entries\n`);

  let created = 0;
  let skipped = 0;
  let photosAdded = 0;
  let accessoriesAdded = 0;

  for (const [url, data] of mmEntries) {
    const finalName = NAME_FIXES[data.name] || data.name;
    console.log(`\n--- ${finalName} ---`);

    const existing = await prisma.figure.findFirst({
      where: {
        toyLineId: toyLine.id,
        name: finalName,
        tags: { some: { tagId: setTag.id } },
      },
    });
    if (existing) {
      console.log(`  SKIP: already exists as set Figure (id=${existing.id})`);
      skipped++;
      continue;
    }

    const figure = await prisma.figure.create({
      data: {
        name: finalName,
        year: DEFAULT_YEAR,
        toyLineId: toyLine.id,
        seriesId: series.id,
      },
    });
    console.log(`  Created Figure id=${figure.id}`);
    created++;

    const tagIds = [setTag.id];
    if (data.alliance && alliances[data.alliance]) {
      tagIds.push(alliances[data.alliance].id);
    }
    for (const tagId of tagIds) {
      await prisma.figureTag.create({
        data: { figureId: figure.id, tagId },
      });
    }
    console.log(`  Tagged: ${tagIds.length} tags`);

    if (data.localMainImage) {
      const srcPath = path.join(SCRAPED_DIR, data.localMainImage);
      if (fs.existsSync(srcPath)) {
        const webpFilename = `catalog_${figure.id}_${Date.now()}.webp`;
        await processWebp(srcPath, webpFilename);
        await prisma.photo.create({
          data: {
            filename: webpFilename,
            isPrimary: true,
            figureId: figure.id,
            userId: null,
          },
        });
        photosAdded++;
        console.log(`  Added catalog photo: ${webpFilename}`);
      } else {
        console.log(`  WARN: main image file not found at ${srcPath}`);
      }
    }

    for (const acc of data.setAccessories) {
      const { name, qty } = parseAccName(acc.name);
      if (!name) continue;

      for (let i = 1; i <= qty; i++) {
        const accName = qty > 1 ? `${name} ${i}` : name;
        let accImage = null;
        if (acc.localImage) {
          const srcPath = path.join(SCRAPED_DIR, acc.localImage);
          if (fs.existsSync(srcPath)) {
            const webpFilename = `acc_${figure.id}_${sanitizeFilename(accName)}_${Date.now()}.webp`;
            await processWebp(srcPath, webpFilename);
            accImage = webpFilename;
          }
        }
        await prisma.accessory.create({
          data: { name: accName, figureId: figure.id, image: accImage },
        });
        accessoriesAdded++;
      }
    }
    console.log(`  Added ${data.setAccessories.length} accessory entries`);
  }

  console.log('\n=== DONE ===');
  console.log(`Created: ${created}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Photos added: ${photosAdded}`);
  console.log(`Accessories added: ${accessoriesAdded}`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
