const { PrismaClient } = require('@prisma/client');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();
const SCRAPED_DIR = path.join(__dirname, 'data', 'transformerland-g2');
const UPLOADS_DIR = path.join(__dirname, 'uploads');

function sanitizeFilename(name) {
  return name.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_').toLowerCase();
}

function isAltView(name) {
  const n = name.toLowerCase();
  return n.includes(' - robot') || n.includes(' - figure') ||
         n.includes(' - back') || n.includes(' - alt') ||
         n.includes(' - beast') || n.includes(' - vehicle') ||
         n.includes(' - jet') || n.includes(' - tank') ||
         n.includes('(combined)');
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

async function processWebp(srcPath, destFilename) {
  const destPath = path.join(UPLOADS_DIR, destFilename);
  if (fs.existsSync(destPath)) return destFilename;
  await sharp(srcPath)
    .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 80 })
    .toFile(destPath);
  return destFilename;
}

async function getOrCreateTag(name, toyLineId) {
  if (!name) return null;
  return prisma.tag.upsert({
    where: { toyLineId_name: { toyLineId, name } },
    update: {},
    create: { name, toyLineId },
  });
}

async function attachTag(figureId, tagId) {
  if (!tagId) return;
  try {
    await prisma.figureTag.create({ data: { figureId, tagId } });
  } catch (e) {
    // Duplicate — already attached
    if (e.code !== 'P2002') throw e;
  }
}

/**
 * Idempotent find-or-create with collision handling.
 * - Identity: matches on notes containing the sourceUrl (each transformerland URL is unique).
 * - Collision: if the raw name is already taken by a DIFFERENT source, prefix with subgroup.
 *   e.g., "Optimus Prime" (Leaders) stays plain; later "Optimus Prime" from Go-Bots becomes
 *   "Go-Bots Optimus Prime". Numeric suffix added if prefix still collides.
 */
async function findOrCreateFigure({ name, subgroup, year, notes, toyLineId, seriesId, sourceUrl }) {
  // 1. Did we already import this URL?
  if (sourceUrl) {
    const existingBySource = await prisma.figure.findFirst({
      where: { seriesId, notes: { contains: sourceUrl } },
    });
    if (existingBySource) return { figure: existingBySource, created: false, finalName: existingBySource.name };
  }

  // 2. Try plain name
  let candidateName = name;
  const plainCollision = await prisma.figure.findFirst({
    where: { seriesId, name: candidateName },
  });

  if (plainCollision) {
    // 3. Collision — prefix with subgroup
    if (subgroup && !name.toLowerCase().startsWith(subgroup.toLowerCase())) {
      candidateName = `${subgroup} ${name}`;
    } else {
      candidateName = `${name} (variant)`;
    }

    // 4. If that also collides, append numeric suffix
    let suffix = 2;
    while (await prisma.figure.findFirst({ where: { seriesId, name: candidateName } })) {
      const base = subgroup && !name.toLowerCase().startsWith(subgroup.toLowerCase())
        ? `${subgroup} ${name}`
        : `${name} (variant)`;
      candidateName = `${base} ${suffix}`;
      suffix++;
    }
  }

  const figure = await prisma.figure.create({
    data: { name: candidateName, year, notes, toyLineId, seriesId },
  });
  return { figure, created: true, finalName: candidateName };
}

async function ensureCatalogPhoto(figureId, localImagePath) {
  if (!localImagePath) return false;
  const srcPath = path.join(SCRAPED_DIR, localImagePath);
  if (!fs.existsSync(srcPath)) return false;

  const existing = await prisma.photo.findFirst({
    where: { figureId, userId: null },
  });
  if (existing) return false;

  const webpFilename = `catalog_${figureId}_${Date.now()}.webp`;
  await processWebp(srcPath, webpFilename);
  await prisma.photo.create({
    data: { filename: webpFilename, isPrimary: true, figureId, userId: null },
  });
  return true;
}

async function ensureAccessory(figureId, accName, localImagePath) {
  const existing = await prisma.accessory.findFirst({
    where: { figureId, name: accName },
  });
  if (existing) return { accessory: existing, created: false };

  let image = null;
  if (localImagePath) {
    const srcPath = path.join(SCRAPED_DIR, localImagePath);
    if (fs.existsSync(srcPath)) {
      const webpFilename = `acc_${figureId}_${sanitizeFilename(accName)}_${Date.now()}.webp`;
      await processWebp(srcPath, webpFilename);
      image = webpFilename;
    }
  }

  const accessory = await prisma.accessory.create({
    data: { name: accName, image, figureId },
  });
  return { accessory, created: true };
}

async function main() {
  const resultsFile = path.join(SCRAPED_DIR, 'results.json');
  if (!fs.existsSync(resultsFile)) {
    console.log('No results.json found. Run scrape-transformerland-g2.js first.');
    return;
  }

  const results = JSON.parse(fs.readFileSync(resultsFile, 'utf8'));
  console.log(`Loaded ${Object.keys(results).length} scraped entries\n`);

  // Ensure ToyLine + Series exist
  const toyLine = await prisma.toyLine.findUnique({ where: { name: 'Transformers' } });
  if (!toyLine) {
    console.error('Transformers ToyLine not found in DB.');
    return;
  }

  const g2Series = await prisma.series.upsert({
    where: { toyLineId_slug: { toyLineId: toyLine.id, slug: 'g2' } },
    update: {},
    create: { name: 'G2', slug: 'g2', toyLineId: toyLine.id },
  });
  console.log(`G2 series ready (id=${g2Series.id})\n`);

  let stats = {
    setsCreated: 0,
    figuresCreated: 0,
    figuresSkipped: 0,
    photosAdded: 0,
    accessoriesAdded: 0,
    tagsAttached: 0,
  };

  for (const [url, data] of Object.entries(results)) {
    console.log(`\n--- ${data.name} (${url}) ---`);

    const members = (data.setFigures || []).filter(sf => !isAltView(sf.name));
    const isMultiFigureSet = members.length >= 2 &&
      !members.some(m => m.name.toLowerCase() === (data.name || '').toLowerCase());

    const yearInt = data.year && /^\d+$/.test(String(data.year).trim())
      ? parseInt(String(data.year).trim(), 10)
      : null;

    // ----- Create the main "set" figure -----
    const notesLines = [];
    if (data.subgroup) notesLines.push(`Subgroup: ${data.subgroup}`);
    if (data.sourceUrl) notesLines.push(`Source: ${data.sourceUrl}`);
    const notes = notesLines.join('\n') || null;

    const { figure: setFigure, created: setCreated, finalName: setFinalName } = await findOrCreateFigure({
      name: data.name,
      subgroup: data.subgroup,
      year: yearInt,
      notes,
      toyLineId: toyLine.id,
      seriesId: g2Series.id,
      sourceUrl: url,
    });

    if (setCreated) {
      stats.setsCreated++;
      const renamed = setFinalName !== data.name ? ` (renamed from "${data.name}" due to collision)` : '';
      console.log(`  Created set figure [${setFigure.id}] ${setFigure.name}${renamed}`);
    } else {
      stats.figuresSkipped++;
      console.log(`  Set figure already exists [${setFigure.id}] ${setFigure.name} — updating photo/accessories`);
    }

    // Tags: alliance + subgroup
    if (data.alliance) {
      const tag = await getOrCreateTag(data.alliance, toyLine.id);
      await attachTag(setFigure.id, tag?.id);
      stats.tagsAttached++;
    }
    if (data.subgroup) {
      const tag = await getOrCreateTag(data.subgroup, toyLine.id);
      await attachTag(setFigure.id, tag?.id);
      stats.tagsAttached++;
    }
    if (isMultiFigureSet) {
      const tag = await getOrCreateTag('Combiner Set', toyLine.id);
      await attachTag(setFigure.id, tag?.id);
      stats.tagsAttached++;
    }

    // Catalog photo for set
    if (await ensureCatalogPhoto(setFigure.id, data.localMainImage)) {
      stats.photosAdded++;
    }

    // Accessories for the set (weapons, partner parts, etc.)
    for (const acc of data.setAccessories || []) {
      const { name: accName, qty } = parseAccName(acc.name);
      if (!accName) continue;

      if (qty > 1) {
        for (let i = 1; i <= qty; i++) {
          const { created } = await ensureAccessory(setFigure.id, `${accName} ${i}`, acc.localImage);
          if (created) stats.accessoriesAdded++;
        }
      } else {
        const { created } = await ensureAccessory(setFigure.id, accName, acc.localImage);
        if (created) stats.accessoriesAdded++;
      }
    }

    // ----- If multi-figure set: create/attach each member as its own Figure -----
    if (isMultiFigureSet) {
      for (const member of members) {
        const memberNotes = [
          data.subgroup ? `Subgroup: ${data.subgroup}` : null,
          `Part of set: ${data.name}`,
          data.sourceUrl ? `Source: ${data.sourceUrl}` : null,
        ].filter(Boolean).join('\n');

        const { figure: memberFig, created } = await findOrCreateFigure({
          name: member.name,
          subgroup: data.subgroup,
          year: yearInt,
          notes: memberNotes,
          toyLineId: toyLine.id,
          seriesId: g2Series.id,
          sourceUrl: `${url}#member-${sanitizeFilename(member.name)}`,
        });

        if (created) {
          stats.figuresCreated++;
          console.log(`    Member created [${memberFig.id}] ${memberFig.name}`);
        } else {
          console.log(`    Member already exists [${memberFig.id}] ${memberFig.name}`);
        }

        // Tag alliance + subgroup for members too
        if (data.alliance) {
          const tag = await getOrCreateTag(data.alliance, toyLine.id);
          await attachTag(memberFig.id, tag?.id);
        }
        if (data.subgroup) {
          const tag = await getOrCreateTag(data.subgroup, toyLine.id);
          await attachTag(memberFig.id, tag?.id);
        }

        // Catalog photo for member (using member's image)
        if (await ensureCatalogPhoto(memberFig.id, member.localImage)) {
          stats.photosAdded++;
        }
      }
    }
  }

  console.log(`\n=== SUMMARY ===`);
  console.log(`Sets created:          ${stats.setsCreated}`);
  console.log(`Member figures created: ${stats.figuresCreated}`);
  console.log(`Existing sets found:   ${stats.figuresSkipped}`);
  console.log(`Catalog photos added:  ${stats.photosAdded}`);
  console.log(`Accessories added:     ${stats.accessoriesAdded}`);
  console.log(`Tags attached (incl. dupes): ${stats.tagsAttached}`);

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
