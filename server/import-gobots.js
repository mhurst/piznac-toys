const { PrismaClient } = require('@prisma/client');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();
const SCRAPED_DIR = path.join(__dirname, 'data', 'gobots');
const UPLOADS_DIR = path.join(__dirname, 'uploads');

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

function buildAccessoryList(data, matchedFigureNames) {
  const accessories = [];

  for (const acc of data.setAccessories) {
    const { name, qty } = parseAccName(acc.name);
    if (!name) continue;
    if (qty > 1) {
      for (let i = 1; i <= qty; i++) {
        accessories.push({ name: `${name} ${i}`, localImage: acc.localImage });
      }
    } else {
      accessories.push({ name, localImage: acc.localImage });
    }
  }

  for (const fig of data.setFigures) {
    if (matchedFigureNames.has(fig.name)) continue;
    const lowerName = fig.name.toLowerCase();
    if (lowerName.includes(' - robot') || lowerName.includes(' - figure') ||
        lowerName.includes(' - back') || lowerName.includes(' - alt') ||
        lowerName.includes(' - beast') || lowerName.includes(' - vehicle') ||
        lowerName.includes('(combined)')) {
      continue;
    }
    accessories.push({ name: fig.name, localImage: fig.localImage });
  }

  return accessories;
}

async function main() {
  const resultsFile = path.join(SCRAPED_DIR, 'results.json');
  if (!fs.existsSync(resultsFile)) {
    console.log('No results.json found. Run the scraper first.');
    return;
  }

  const results = JSON.parse(fs.readFileSync(resultsFile, 'utf8'));
  console.log(`Loaded ${Object.keys(results).length} scraped entries\n`);

  const figures = await prisma.figure.findMany({
    where: { toyLine: { name: 'GoBots' } },
    include: {
      photos: true,
      accessories: {
        include: { userStatuses: true },
      },
    },
  });

  const figureByName = {};
  for (const f of figures) {
    figureByName[f.name] = f;
  }

  let photosAdded = 0;
  let accessoriesAdded = 0;
  let accessoriesRemoved = 0;
  let ownedPreserved = 0;
  let figuresMatched = 0;
  let figuresProcessed = 0;
  let figuresUnmatched = [];

  for (const [url, data] of Object.entries(results)) {
    console.log(`\n--- ${data.name} ---`);

    const matchedFigures = [];
    const matchedFigureNames = new Set();

    for (const setFig of data.setFigures) {
      const ln = setFig.name.toLowerCase();
      if (ln.includes(' - robot') || ln.includes(' - figure') ||
          ln.includes(' - back') || ln.includes(' - alt') ||
          ln.includes(' - vehicle') || ln.includes('(combined)')) {
        continue;
      }
      if (figureByName[setFig.name]) {
        matchedFigures.push({ figure: figureByName[setFig.name], setFig });
        matchedFigureNames.add(setFig.name);
      }
    }

    if (matchedFigures.length === 0 && figureByName[data.name]) {
      const setFig = data.setFigures[0];
      matchedFigures.push({ figure: figureByName[data.name], setFig });
      if (setFig) matchedFigureNames.add(setFig.name);
    }

    if (matchedFigures.length === 0) {
      figuresUnmatched.push(data.name);
      console.log(`  NO MATCH`);
      continue;
    }

    for (const { figure, setFig } of matchedFigures) {
      figuresMatched++;
      console.log(`  MATCH: "${setFig ? setFig.name : data.name}" -> DB "${figure.name}" (id: ${figure.id})`);

      // Catalog photo
      const hasCatalogPhoto = figure.photos.some((p) => p.userId === null);
      if (!hasCatalogPhoto && setFig && setFig.localImage) {
        const srcPath = path.join(SCRAPED_DIR, setFig.localImage);
        if (fs.existsSync(srcPath)) {
          const webpFilename = `catalog_${figure.id}_${Date.now()}.webp`;
          await processWebp(srcPath, webpFilename);
          await prisma.photo.create({
            data: { filename: webpFilename, isPrimary: true, figureId: figure.id, userId: null },
          });
          photosAdded++;
          console.log(`    Added catalog photo`);
        }
      } else if (!hasCatalogPhoto && data.localMainImage) {
        const srcPath = path.join(SCRAPED_DIR, data.localMainImage);
        if (fs.existsSync(srcPath)) {
          const webpFilename = `catalog_${figure.id}_${Date.now()}.webp`;
          await processWebp(srcPath, webpFilename);
          await prisma.photo.create({
            data: { filename: webpFilename, isPrimary: true, figureId: figure.id, userId: null },
          });
          photosAdded++;
          console.log(`    Added catalog photo (main image)`);
        }
      }

      // Accessories
      const isOnlyMatch = matchedFigures.length === 1;
      if (!isOnlyMatch && matchedFigures.indexOf(matchedFigures.find(m => m.figure === figure)) > 0) {
        continue;
      }

      const ownedMap = {};
      for (const acc of figure.accessories) {
        if (acc.userStatuses && acc.userStatuses.length > 0) {
          ownedMap[acc.name.toLowerCase()] = acc.userStatuses;
        }
      }

      const newAccessories = buildAccessoryList(data, matchedFigureNames);

      if (newAccessories.length === 0) {
        console.log(`    No accessories from transformerland, keeping existing`);
        continue;
      }

      const oldCount = figure.accessories.length;
      if (oldCount > 0) {
        await prisma.accessory.deleteMany({ where: { figureId: figure.id } });
        accessoriesRemoved += oldCount;
        console.log(`    Removed ${oldCount} old accessories`);
      }

      for (const acc of newAccessories) {
        let accImage = null;
        if (acc.localImage) {
          const srcPath = path.join(SCRAPED_DIR, acc.localImage);
          if (fs.existsSync(srcPath)) {
            const webpFilename = `acc_${figure.id}_${sanitizeFilename(acc.name)}_${Date.now()}.webp`;
            await processWebp(srcPath, webpFilename);
            accImage = webpFilename;
          }
        }

        const created = await prisma.accessory.create({
          data: { name: acc.name, figureId: figure.id, image: accImage },
        });

        const key = acc.name.toLowerCase().replace(/ \d+$/, '');
        const statuses = ownedMap[key] || ownedMap[acc.name.toLowerCase()];
        if (statuses) {
          for (const status of statuses) {
            await prisma.userAccessory.create({
              data: { userId: status.userId, accessoryId: created.id, forSale: status.forSale },
            });
          }
          ownedPreserved++;
        }
        accessoriesAdded++;
      }

      console.log(`    Added ${newAccessories.length} accessories`);
      figuresProcessed++;
    }
  }

  console.log(`\n=== SUMMARY ===`);
  console.log(`Figures matched: ${figuresMatched}`);
  console.log(`Figures processed: ${figuresProcessed}`);
  console.log(`Photos added: ${photosAdded}`);
  console.log(`Accessories removed: ${accessoriesRemoved}`);
  console.log(`Accessories added: ${accessoriesAdded}`);
  console.log(`Owned statuses preserved: ${ownedPreserved}`);
  if (figuresUnmatched.length > 0) {
    console.log(`\nUnmatched (${figuresUnmatched.length}):`);
    [...new Set(figuresUnmatched)].forEach((n) => console.log(`  - ${n}`));
  }

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
