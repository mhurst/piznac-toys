const { PrismaClient } = require('@prisma/client');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();
const SCRAPED_DIR = path.join(__dirname, 'data', 'transformerland');
const UPLOADS_DIR = path.join(__dirname, 'uploads');

function sanitizeFilename(name) {
  return name.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_').toLowerCase();
}

// Scraped set figure name -> DB figure name (for figures whose names differ)
// Also used to SKIP matching when scrape name collides with an unrelated DB figure
const FIGURE_NAME_MAP = {
  'Action Master Optimus Prime': 'Armored Convoy with Optimus Prime',
};

// URL-scoped name overrides: when the URL contains a keyword, remap the set name
// Prevents "Bumblebee" from Pretenders matching G1 Bumblebee
const URL_NAME_OVERRIDES = [
  { urlMatch: 'pretenders-bumblebee', setName: 'Bumblebee', dbName: 'Pretender Bumblebee' },
  { urlMatch: 'pretenders-jazz', setName: 'Jazz', dbName: 'Pretender Jazz' },
  { urlMatch: 'pretenders-grimlock', setName: 'Grimlock', dbName: 'Pretender Grimlock' },
  { urlMatch: 'pretenders-starscream', setName: 'Starscream', dbName: 'Pretender Starscream' },
];

async function processWebp(srcPath, destFilename) {
  const destPath = path.join(UPLOADS_DIR, destFilename);
  if (fs.existsSync(destPath)) return destFilename;

  await sharp(srcPath)
    .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 80 })
    .toFile(destPath);

  return destFilename;
}

// Parse accessory name and quantity from scraped name like "Missile (x2)"
function parseAccName(rawName) {
  const qtyMatch = rawName.match(/\(x(\d+)\)/);
  const qty = qtyMatch ? parseInt(qtyMatch[1]) : 1;
  const name = rawName
    .replace(/\s*\(x\d+\)\s*/g, '')
    .replace(/\s*\(Part of Figure\)\s*/g, '')
    .trim();
  return { name, qty };
}

// Build the full list of accessories from transformerland data for a given set
// Includes set accessories + unmatched set figures (partners/vehicles)
function buildAccessoryList(data, matchedFigureNames) {
  const accessories = [];

  // 1. Set accessories (weapons, parts, etc.)
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

  // 2. Unmatched set figures become accessories (partners, vehicles, shells)
  for (const fig of data.setFigures) {
    if (matchedFigureNames.has(fig.name)) continue;

    // Skip alternate views of the main figure (e.g. "Landmine - Robot", "Landmine - Figure Back")
    const lowerName = fig.name.toLowerCase();
    if (lowerName.includes(' - robot') || lowerName.includes(' - figure') ||
        lowerName.includes(' - back') || lowerName.includes(' - alt')) {
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

  // Get all Transformers figures from DB with accessories and user statuses
  const figures = await prisma.figure.findMany({
    where: { toyLine: { name: 'Transformers' } },
    include: {
      photos: true,
      accessories: {
        include: {
          userStatuses: true,
        },
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

    // Check for URL-scoped name overrides first
    const urlOverride = URL_NAME_OVERRIDES.find((o) => url.includes(o.urlMatch));

    // Match ALL set figures to DB figures (supports multi-figure sets like patrols)
    const matchedFigures = []; // { figure, setFig }
    const matchedFigureNames = new Set();

    for (const setFig of data.setFigures) {
      // Skip alternate views — these aren't separate figures
      const ln = setFig.name.toLowerCase();
      if (ln.includes(' - robot') || ln.includes(' - figure') ||
          ln.includes(' - back') || ln.includes(' - alt') ||
          ln.includes(' - beast') || ln.includes(' - vehicle') ||
          ln.includes(' - jet') || ln.includes(' - tank') ||
          ln.includes('(combined)')) {
        continue;
      }

      let dbName;
      // Check URL override first
      if (urlOverride && urlOverride.setName === setFig.name) {
        dbName = urlOverride.dbName;
      } else {
        dbName = FIGURE_NAME_MAP[setFig.name] || setFig.name;
      }

      if (figureByName[dbName]) {
        matchedFigures.push({ figure: figureByName[dbName], setFig });
        matchedFigureNames.add(setFig.name);
      }
    }

    // Also try matching on the scraped set name itself (e.g. "Landmine")
    if (matchedFigures.length === 0) {
      // Check URL overrides first for set-level name
      const setOverride = URL_NAME_OVERRIDES.find((o) => url.includes(o.urlMatch));
      const setDbName = setOverride ? setOverride.dbName : data.name;

      if (figureByName[setDbName]) {
        const setFig = data.setFigures[0];
        matchedFigures.push({ figure: figureByName[setDbName], setFig });
        if (setFig) matchedFigureNames.add(setFig.name);
      }
    }

    if (matchedFigures.length === 0) {
      for (const sf of data.setFigures) {
        figuresUnmatched.push(`${data.name}: ${sf.name}`);
      }
      console.log(`  NO MATCH for set "${data.name}"`);
      continue;
    }

    // Log unmatched set figures
    for (const setFig of data.setFigures) {
      if (!matchedFigureNames.has(setFig.name)) {
        const lowerName = setFig.name.toLowerCase();
        if (!lowerName.includes(' - robot') && !lowerName.includes(' - figure') &&
            !lowerName.includes(' - back') && !lowerName.includes(' - alt') &&
            !lowerName.includes(' - beast')) {
          figuresUnmatched.push(`${data.name}: ${setFig.name}`);
        }
      }
    }

    // Process each matched figure
    for (const { figure, setFig } of matchedFigures) {
      figuresMatched++;
      console.log(`  MATCH: "${setFig ? setFig.name : data.name}" -> DB figure "${figure.name}" (id: ${figure.id})`);

      // --- Catalog photo ---
      const hasCatalogPhoto = figure.photos.some((p) => p.userId === null);
      if (!hasCatalogPhoto && setFig && setFig.localImage) {
        const srcPath = path.join(SCRAPED_DIR, setFig.localImage);
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
          console.log(`    Added catalog photo: ${webpFilename}`);
        }
      }

      // --- Accessories: replace with transformerland data ---
      // Only process accessories for figures that are the "main" figure in the set
      // (single-match sets, or the first match in multi-figure sets that have accessories)
      // For patrols (multi-figure, no accessories), skip accessory processing
      const isOnlyMatch = matchedFigures.length === 1;
      const setHasAccessories = data.setAccessories.length > 0 ||
        data.setFigures.some(sf => !matchedFigureNames.has(sf.name) &&
          !sf.name.toLowerCase().includes(' - robot') &&
          !sf.name.toLowerCase().includes(' - figure') &&
          !sf.name.toLowerCase().includes(' - back'));

      if (!isOnlyMatch && !setHasAccessories) {
        continue; // Skip accessory processing for patrol members with no accessories
      }

      // For multi-figure sets with accessories (bases), only process for the first match
      if (!isOnlyMatch && matchedFigures.indexOf(matchedFigures.find(m => m.figure === figure)) > 0) {
        continue;
      }

      // 1. Save owned/forSale statuses from existing accessories (keyed by lowercase name)
      const ownedMap = {};
      for (const acc of figure.accessories) {
        if (acc.userStatuses && acc.userStatuses.length > 0) {
          ownedMap[acc.name.toLowerCase()] = acc.userStatuses;
        }
      }

      // 2. Build new accessory list from transformerland
      const newAccessories = buildAccessoryList(data, matchedFigureNames);

      // 3. Skip if no accessories from transformerland (don't wipe existing data for nothing)
      if (newAccessories.length === 0) {
        console.log(`    No accessories from transformerland, keeping existing`);
        continue;
    }

    // 4. Delete old accessories (cascades UserAccessory)
    const oldCount = figure.accessories.length;
    if (oldCount > 0) {
      await prisma.accessory.deleteMany({ where: { figureId: figure.id } });
      accessoriesRemoved += oldCount;
      console.log(`    Removed ${oldCount} old accessories`);
    }

    // 5. Create new accessories with images
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
        data: {
          name: acc.name,
          figureId: figure.id,
          image: accImage,
        },
      });

      // Restore owned/forSale status if name matches
      const key = acc.name.toLowerCase().replace(/ \d+$/, ''); // "Missile 1" -> "missile"
      const statuses = ownedMap[key] || ownedMap[acc.name.toLowerCase()];
      if (statuses) {
        for (const status of statuses) {
          await prisma.userAccessory.create({
            data: {
              userId: status.userId,
              accessoryId: created.id,
              forSale: status.forSale,
            },
          });
        }
        ownedPreserved++;
      }

      accessoriesAdded++;
    }

    console.log(`    Added ${newAccessories.length} accessories from transformerland`);
    figuresProcessed++;
    } // end for matchedFigures
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
